import pytest
import httpx
from unittest.mock import patch, MagicMock

from app.services.scraper.spider import clean_html_content, scrape_page, scrape_page_async


def test_clean_html_content_strips_unwanted_tags_and_formats_tables():
    raw_html = """
    <!DOCTYPE html>
    <html>
    <head><title>Product Test</title><style>.test { color: red; }</style></head>
    <body>
        <nav><a href="/">Home</a><a href="/catalog">Catalog</a></nav>
        <header><h1>Header Navigation</h1></header>
        <main>
            <h1>Frigidaire PDSH4816AF Built-In Dishwasher</h1>
            <p>High performance 24 inch built-in dishwasher with stainless steel tub.</p>
            <table class="specs-table">
                <tr><th>Specification</th><th>Value</th></tr>
                <tr><td>Width</td><td>24 in</td></tr>
                <tr><td>Sound Level</td><td>47 dBA</td></tr>
                <tr><td>Voltage Rating</td><td>120 V</td></tr>
            </table>
            <dl>
                <dt>Tub Material</dt>
                <dd>Stainless Steel</dd>
            </dl>
        </main>
        <footer><p>&copy; 2026 Frigidaire. All rights reserved.</p></footer>
        <script>console.log("analytics");</script>
    </body>
    </html>
    """
    cleaned = clean_html_content(raw_html)
    assert cleaned is not None
    assert "Home" not in cleaned
    assert "Header Navigation" not in cleaned
    assert "All rights reserved" not in cleaned
    assert "analytics" not in cleaned
    assert "Frigidaire PDSH4816AF Built-In Dishwasher" in cleaned
    assert "Width: 24 in" in cleaned
    assert "Sound Level: 47 dBA" in cleaned
    assert "Tub Material: Stainless Steel" in cleaned


def test_clean_html_content_empty_or_too_short():
    assert clean_html_content("") is None
    assert clean_html_content("   ") is None
    assert clean_html_content("<html><body><p>Short</p></body></html>") is None


def test_scrape_page_sync_success():
    sample_html = """
    <html><body><main>
    <h1>3M 7100099999 Sanding Belt</h1>
    <table><tr><td>Grit</td><td>P80</td></tr></table>
    <p>Durable aluminum oxide abrasive belt for heavy grinding.</p>
    </main></body></html>
    """
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = sample_html

    with patch("httpx.Client.get", return_value=mock_resp):
        res = scrape_page("https://www.3m.com/p/d/7100099999")
        assert res is not None
        assert "3M 7100099999 Sanding Belt" in res
        assert "Grit: P80" in res


def test_scrape_page_sync_non_200_and_timeout():
    mock_resp = MagicMock()
    mock_resp.status_code = 404

    with patch("httpx.Client.get", return_value=mock_resp):
        assert scrape_page("https://www.example.com/notfound") is None

    with patch("httpx.Client.get", side_effect=httpx.TimeoutException("Timeout")):
        assert scrape_page("https://www.example.com/slow") is None

    assert scrape_page("invalid-url") is None


@pytest.mark.anyio
async def test_scrape_page_async_success():
    sample_html = """
    <html><body><main>
    <h1>Diablo D0724R Circular Saw Blade</h1>
    <table><tr><td>Blade Diameter</td><td>7-1/4 in</td></tr></table>
    <p>Tracking point tooth design for extreme framing and cutting durability.</p>
    </main></body></html>
    """
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = sample_html

    with patch("httpx.AsyncClient.get", return_value=mock_resp):
        res = await scrape_page_async("https://www.diablotools.com/products/D0724R")
        assert res is not None
        assert "Diablo D0724R Circular Saw Blade" in res
        assert "Blade Diameter: 7-1/4 in" in res
