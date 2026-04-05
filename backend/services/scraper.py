import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import logging

logger = logging.getLogger("Web-audit")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

MAX_IMAGES = 10


def scrape_page(url: str) -> dict:
    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
    except requests.exceptions.ConnectionError:
        raise ValueError(f"Could not connect to '{url}'.")
    except requests.exceptions.Timeout:
        raise ValueError(f"Request to '{url}' timed out.")
    except requests.exceptions.RequestException as e:
        raise ValueError(f"Request failed: {e}")

    if response.status_code != 200:
        raise ValueError(f"'{url}' returned HTTP {response.status_code}.")

    content_type = response.headers.get("Content-Type", "")
    if "text/html" not in content_type:
        raise ValueError(f"Expected HTML, got '{content_type}'.")

    soup = BeautifulSoup(response.text, "html.parser")

    title_tag = soup.find("title")
    title = title_tag.get_text(strip=True) if title_tag else None

    meta_desc = None
    standard_meta = soup.find("meta", attrs={"name": "description"})
    if standard_meta and standard_meta.get("content"):
        meta_desc = standard_meta["content"].strip()
    if not meta_desc:
        og_meta = soup.find("meta", attrs={"property": "og:description"})
        if og_meta and og_meta.get("content"):
            meta_desc = og_meta["content"].strip()

    headings: dict[str, list[str]] = {"h1": [], "h2": [], "h3": []}
    for level in ("h1", "h2", "h3"):
        tags = soup.find_all(level)
        headings[level] = [
            tag.get_text(separator=" ", strip=True)
            for tag in tags
            if tag.get_text(strip=True)
        ]

    image_urls: list[str] = []
    base_url = f"{urlparse(url).scheme}://{urlparse(url).netloc}"

    for img in soup.find_all("img"):
        src = img.get("src") or img.get("data-src") or img.get("data-lazy-src")
        if not src or src.startswith("data:"):
            continue
        absolute_src = urljoin(base_url, src)
        try:
            w = int(img.get("width", 99))
            h = int(img.get("height", 99))
            if w <= 1 or h <= 1:
                continue
        except (ValueError, TypeError):
            pass
        image_urls.append(absolute_src)
        if len(image_urls) >= MAX_IMAGES:
            break

    return {
        "title": title,
        "meta_description": meta_desc,
        "headings": headings,
        "image_urls": image_urls,
    }