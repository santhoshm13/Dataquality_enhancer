import re
import logging
import os
from typing import Optional, Dict, Any, List
from urllib.parse import urlparse
import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger("app.services.scraper")

# ---------------------------------------------------------------------------
# Firecrawl integration (Stage 2 primary scraper)
# ---------------------------------------------------------------------------
# firecrawl-py v4 — uses AsyncV1FirecrawlApp for async scraping
# Install: pip install firecrawl-py
# Get a free API key at: https://www.firecrawl.dev/app/api-keys
# Set FIRECRAWL_API_KEY in your .env file to enable.
# If the key is absent or Firecrawl fails, the pipeline falls through to
# the existing httpx + Playwright fallback chain automatically.
try:
    from firecrawl import AsyncV1FirecrawlApp
    _firecrawl_available = True
except ImportError:
    AsyncV1FirecrawlApp = None  # type: ignore
    _firecrawl_available = False
    logger.info("firecrawl-py not installed — Firecrawl scraping disabled. Install with: pip install firecrawl-py")


DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

TAGS_TO_REMOVE = [
    "script", "style", "nav", "footer", "header", "noscript",
    "svg", "form", "aside", "iframe", "button", "select", "option",
    "dialog", "menu"
]


def clean_html_content(html: str) -> Optional[str]:
    """
    Parse HTML, strip boilerplate/unwanted elements, format tables & spec sections,
    and return clean visible product text.
    """
    if not html or not html.strip():
        return None

    try:
        soup = BeautifulSoup(html, "html.parser")

        # 1. Remove non-content tags
        for tag in soup.find_all(TAGS_TO_REMOVE):
            tag.decompose()

        # 2. Reformat table rows into readable key-value / spec lines
        for table in soup.find_all("table"):
            table_lines = []
            for tr in table.find_all("tr"):
                cells = [td.get_text(strip=True) for td in tr.find_all(["th", "td"]) if td.get_text(strip=True)]
                if len(cells) == 2:
                    table_lines.append(f"{cells[0]}: {cells[1]}")
                elif len(cells) > 2:
                    table_lines.append(" | ".join(cells))
                elif len(cells) == 1:
                    table_lines.append(cells[0])
            if table_lines:
                table.replace_with("\n" + "\n".join(table_lines) + "\n")

        # 3. Format definition lists / description lists <dl>, <dt>, <dd>
        for dl in soup.find_all("dl"):
            dl_lines = []
            dt_text = None
            for child in dl.children:
                if child.name == "dt":
                    dt_text = child.get_text(strip=True)
                elif child.name == "dd" and dt_text:
                    dd_text = child.get_text(strip=True)
                    dl_lines.append(f"{dt_text}: {dd_text}")
                    dt_text = None
            if dl_lines:
                dl.replace_with("\n" + "\n".join(dl_lines) + "\n")

        # 4. Extract text from the cleaned DOM
        # If standard main content container exists, we can focus on it if substantial
        main_container = soup.find("main") or soup.find(id=re.compile(r"(content|product|main)", re.I)) or soup.find("body") or soup
        text = main_container.get_text(separator="\n", strip=True)

        # 5. Clean excessive whitespace and consecutive blank lines
        lines = [line.strip() for line in text.splitlines()]
        cleaned_lines = []
        consecutive_empty = 0
        for line in lines:
            if not line:
                consecutive_empty += 1
                if consecutive_empty <= 1 and cleaned_lines:
                    cleaned_lines.append("")
            else:
                consecutive_empty = 0
                # Filter out very common generic cookie/social noise lines if isolated
                if line.lower() in ("cookie policy", "accept all cookies", "privacy policy", "terms of use"):
                    continue
                cleaned_lines.append(line)

        result = "\n".join(cleaned_lines).strip()
        if len(result) < 20:
            logger.debug(f"Scraped content too short ({len(result)} chars).")
            return None

        # Truncate overly long page texts to 15,000 characters to fit LLM context efficiently
        if len(result) > 15000:
            result = result[:15000] + "\n...[truncated]"

        return result

    except Exception as e:
        logger.warning(f"Error cleaning HTML: {e}")
        return None


def scrape_page(url: str, timeout: float = 8.0) -> Optional[str]:
    """
    Synchronously fetch the URL with an 8-second timeout and return cleaned visible text content.
    Returns None on timeouts, non-200 responses, or scraping failures.
    """
    if not url or not (url.startswith("http://") or url.startswith("https://")):
        logger.debug(f"Invalid URL for scraping: '{url}'")
        return None

    try:
        with httpx.Client(timeout=timeout, headers=DEFAULT_HEADERS, follow_redirects=True) as client:
            response = client.get(url)
            if response.status_code != 200:
                logger.warning(f"Failed scrape for {url}: status code {response.status_code}")
                return None
            return clean_html_content(response.text)
    except httpx.TimeoutException:
        logger.warning(f"Scrape timed out ({timeout}s) for {url}")
        return None
    except Exception as e:
        logger.warning(f"Scrape error for {url}: {e}")
        return None


async def scrape_page_async(url: str, timeout: float = 8.0) -> Optional[str]:
    """
    Asynchronously fetch the URL with an 8-second timeout and return cleaned visible text content.
    Returns None on timeouts, non-200 responses, or scraping failures.
    """
    if not url or not (url.startswith("http://") or url.startswith("https://")):
        logger.debug(f"Invalid URL for scraping: '{url}'")
        return None

    try:
        async with httpx.AsyncClient(timeout=timeout, headers=DEFAULT_HEADERS, follow_redirects=True) as client:
            response = await client.get(url)
            if response.status_code != 200:
                logger.warning(f"Failed async scrape for {url}: status code {response.status_code}")
                return None
            return clean_html_content(response.text)
    except httpx.TimeoutException:
        logger.warning(f"Async scrape timed out ({timeout}s) for {url}")
        return None
    except Exception as e:
        logger.warning(f"Async scrape error for {url}: {e}")
        return None


# ---------------------------------------------------------------------------
# Stage 1.5 — URL Validation
# ---------------------------------------------------------------------------

def _is_homepage_path(path: str) -> bool:
    """Check if a URL path indicates a homepage/root redirect."""
    cleaned = path.strip("/")
    if not cleaned:
        return True
    # Common homepage patterns
    homepage_patterns = [
        "index", "home", "default", "main",
        "en", "en-us", "en_us", "us",
    ]
    return cleaned.lower() in homepage_patterns


async def validate_url(url: str, timeout: float = 6.0) -> Dict[str, Any]:
    """
    Stage 1.5: Validate a URL before scraping.
    - Async HTTP HEAD (fallback to GET) with configurable timeout.
    - Rejects: non-200 status, homepage redirects, non-HTML content-type.
    Returns: {valid, final_url, status_code, redirect_chain, rejection_reason}
    """
    result: Dict[str, Any] = {
        "valid": False,
        "final_url": url,
        "status_code": 0,
        "redirect_chain": [],
        "rejection_reason": None,
    }

    if not url or not (url.startswith("http://") or url.startswith("https://")):
        result["rejection_reason"] = "invalid_url_scheme"
        return result

    try:
        async with httpx.AsyncClient(
            timeout=timeout,
            headers=DEFAULT_HEADERS,
            follow_redirects=True,
            max_redirects=10,
        ) as client:
            # Try HEAD first (lighter)
            try:
                response = await client.head(url)
            except (httpx.HTTPError, Exception):
                # Some servers reject HEAD — fall back to GET
                response = await client.get(url)

            result["status_code"] = response.status_code
            result["final_url"] = str(response.url)

            # Track redirect chain
            if hasattr(response, "history") and response.history:
                result["redirect_chain"] = [str(r.url) for r in response.history]

            # Check: non-200 status
            if response.status_code != 200:
                result["rejection_reason"] = f"non_200_status_{response.status_code}"
                return result

            # Check: redirected to homepage
            final_parsed = urlparse(str(response.url))
            original_parsed = urlparse(url)
            if (
                result["redirect_chain"]
                and final_parsed.netloc == original_parsed.netloc
                and _is_homepage_path(final_parsed.path)
                and not _is_homepage_path(original_parsed.path)
            ):
                result["rejection_reason"] = "redirected_to_homepage"
                return result

            # Check: content-type is HTML
            content_type = response.headers.get("content-type", "").lower()
            if content_type and "text/html" not in content_type and "application/xhtml" not in content_type:
                # Some servers don't return content-type on HEAD, allow if empty
                if content_type:
                    result["rejection_reason"] = f"non_html_content_type: {content_type}"
                    return result

            result["valid"] = True
            return result

    except httpx.TimeoutException:
        result["rejection_reason"] = "timeout"
        return result
    except Exception as e:
        result["rejection_reason"] = f"connection_error: {str(e)[:100]}"
        return result


# ---------------------------------------------------------------------------
# Stage 2 — Enhanced Scraping with Playwright Fallback
# ---------------------------------------------------------------------------

async def _scrape_with_playwright(url: str, timeout_ms: int = 10000) -> Optional[str]:
    """
    Fallback scraper using Playwright headless Chromium for JS-rendered pages.
    Returns cleaned text or None. Silently returns None if playwright not installed.
    """
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        logger.debug("Playwright not installed — skipping JS fallback scrape.")
        return None

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent=DEFAULT_HEADERS["User-Agent"],
                viewport={"width": 1280, "height": 800},
            )
            page = await context.new_page()
            try:
                await page.goto(url, wait_until="networkidle", timeout=timeout_ms)
                html = await page.content()
                return clean_html_content(html)
            finally:
                await context.close()
                await browser.close()
    except Exception as e:
        logger.warning(f"Playwright scrape failed for {url}: {e}")
        return None


async def _scrape_with_firecrawl(url: str, api_key: str) -> Optional[str]:
    """
    Primary Stage 2 scraper: uses Firecrawl cloud API to get clean markdown.
    Firecrawl handles JS-rendering, bot detection, and proxy rotation.
    Uses AsyncV1FirecrawlApp.scrape_url() from firecrawl-py v4.
    Returns clean markdown text, or None on any failure.
    """
    if not _firecrawl_available or not AsyncV1FirecrawlApp:
        return None
    try:
        app = AsyncV1FirecrawlApp(api_key=api_key)
        result = await app.scrape_url(
            url,
            formats=["markdown"],
            only_main_content=True,
        )
        # result is a V1ScrapeResponse — markdown is in result.markdown
        text = None
        if hasattr(result, "markdown") and result.markdown:
            text = result.markdown
        elif hasattr(result, "content") and result.content:
            text = result.content
        elif isinstance(result, dict):
            text = result.get("markdown") or result.get("content") or ""
        if text and len(str(text).strip()) >= 50:
            text = str(text).strip()
            logger.info(f"[Firecrawl] Scraped {url}: {len(text)} chars")
            return text
        logger.warning(f"[Firecrawl] Empty/short result for {url}")
        return None
    except Exception as e:
        logger.warning(f"[Firecrawl] Scrape failed for {url}: {e}")
        return None


async def scrape_page_with_fallback(url: str, httpx_timeout: float = 8.0) -> Optional[str]:
    """
    Stage 2: Enhanced scraping with priority chain:
      1. Firecrawl (cloud API, handles JS/bot-protection) — if FIRECRAWL_API_KEY is set
      2. httpx + BeautifulSoup (fast, lightweight)
      3. Playwright headless Chromium (JS-rendering fallback, if installed)
    Returns the best available page text, or None.
    """
    # --- Attempt 1: Firecrawl (primary, cloud) ---
    # Import here to avoid circular import at module load time
    firecrawl_key = ""
    try:
        from app.config.settings import settings
        firecrawl_key = settings.FIRECRAWL_API_KEY or os.environ.get("FIRECRAWL_API_KEY", "")
    except Exception:
        firecrawl_key = os.environ.get("FIRECRAWL_API_KEY", "")

    if firecrawl_key:
        fc_text = await _scrape_with_firecrawl(url, api_key=firecrawl_key)
        if fc_text and len(fc_text.strip()) >= 100:
            return fc_text
        logger.info(f"[Firecrawl] Insufficient result for {url} — falling back to httpx")

    # --- Attempt 2: httpx + BeautifulSoup ---
    text = await scrape_page_async(url, timeout=httpx_timeout)

    if text and len(text.strip()) >= 100:
        return text

    # --- Attempt 3: Playwright headless (JS fallback) ---
    logger.info(f"httpx scrape insufficient for {url} (got {len(text) if text else 0} chars). Trying Playwright fallback...")
    pw_text = await _scrape_with_playwright(url)

    if pw_text and len(pw_text.strip()) >= 50:
        return pw_text

    # Return whatever we got (may be None)
    return text or pw_text
