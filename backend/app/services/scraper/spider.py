import re
import logging
from typing import Optional
import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger("app.services.scraper")

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
