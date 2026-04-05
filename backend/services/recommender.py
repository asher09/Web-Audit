import json
import os
import logging
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("web-audit")

api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    raise ValueError("Set GROQ_API_KEY in your environment.")

client = Groq(api_key=api_key)
MODEL_NAME = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """
You are a structured data specialist. Your sole job is to analyze page content
and return a single, valid Schema.org JSON-LD object.

STRICT OUTPUT RULES:
1. Return ONLY a raw JSON object. No markdown. No code fences. No backticks.
2. Do NOT include any text before or after the JSON.
3. The JSON must be parseable by Python's json.loads() with zero pre-processing.
4. Always include "@context": "https://schema.org" and "@type".
5. Choose the MOST SPECIFIC type: Article, BlogPosting, Product,
   Organization, LocalBusiness, WebSite, FAQPage, or BreadcrumbList.
6. Only include properties you have evidence for. Do not hallucinate values.
7. For URL fields, use the actual page URL provided.
8. If image URLs are available, include the first one as "image".
""".strip()


def _build_user_prompt(url: str, scraped: dict) -> str:
    h1s = scraped["headings"].get("h1", [])
    h2s = scraped["headings"].get("h2", [])[:6]
    h3s = scraped["headings"].get("h3", [])[:6]

    lines = [
        f"PAGE URL: {url}",
        f"TITLE: {scraped['title'] or 'Not found'}",
        f"META DESCRIPTION: {scraped['meta_description'] or 'Not found'}",
        f"H1 TAGS: {json.dumps(h1s)}",
        f"H2 TAGS (sample): {json.dumps(h2s)}",
        f"H3 TAGS (sample): {json.dumps(h3s)}",
        f"IMAGE URLS: {json.dumps(scraped['image_urls'])}",
        "",
        "Analyze this page and return the single best Schema.org JSON-LD object.",
    ]
    return "\n".join(lines)


def generate_json_ld(url: str, scraped: dict) -> tuple[dict, str]:
    user_prompt = _build_user_prompt(url, scraped)

    logger.info(f"Sending data to Groq model: {MODEL_NAME}")
    response = client.chat.completions.create(
        model=MODEL_NAME,
        temperature=0.1,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    )
    raw = (response.choices[0].message.content or "").strip()

    logger.info(f"Groq raw response (first 200 chars): {raw[:200]}")

    # Safety strip in case Gemini wraps in markdown fences
    cleaned = raw
    if cleaned.startswith("```"):
        parts = cleaned.split("```")
        cleaned = parts[1] if len(parts) > 1 else parts[0]
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:]
        cleaned = cleaned.strip()

    json_ld = json.loads(cleaned)

    schema_type = json_ld.get("@type", "Unknown")
    if isinstance(schema_type, list):
        schema_type = schema_type[0]

    logger.info(f"Parsed JSON-LD. Type: {schema_type}")
    return json_ld, schema_type


def calculate_geo_score(scraped: dict, json_ld: dict) -> dict:
    """
    Rule-based GEO readiness scorer. Returns score out of 100
    and a list of signal checks.
    """
    checks = []
    score = 0
    json_ld = json_ld or {}

    # Title (15pts)
    if scraped.get("title"):
        checks.append({"label": "Page title present", "passed": True, "points": 15})
        score += 15
    else:
        checks.append({"label": "Page title present", "passed": False, "points": 0})

    # Meta description (15pts)
    if scraped.get("meta_description"):
        checks.append({"label": "Meta description present", "passed": True, "points": 15})
        score += 15
    else:
        checks.append({"label": "Meta description present", "passed": False, "points": 0})

    # H1 exists (10pts)
    if scraped.get("headings", {}).get("h1"):
        checks.append({"label": "H1 heading present", "passed": True, "points": 10})
        score += 10
    else:
        checks.append({"label": "H1 heading present", "passed": False, "points": 0})

    # Has image (10pts)
    if scraped.get("image_urls"):
        checks.append({"label": "Image detected", "passed": True, "points": 10})
        score += 10
    else:
        checks.append({"label": "Image detected", "passed": False, "points": 0})

    # JSON-LD generated (20pts)
    if json_ld and json_ld.get("@type"):
        checks.append({"label": "JSON-LD schema generated", "passed": True, "points": 20})
        score += 20
    else:
        checks.append({"label": "JSON-LD schema generated", "passed": False, "points": 0})

    # Specific schema type bonus (15pts)
    specific_types = ["Article", "Product", "LocalBusiness", "FAQPage", "BlogPosting"]
    if json_ld.get("@type") in specific_types:
        checks.append({"label": f"Specific schema type ({json_ld.get('@type')})", "passed": True, "points": 15})
        score += 15
    else:
        checks.append({"label": "Specific schema type used", "passed": False, "points": 0})

    # Author or organization in JSON-LD (15pts)
    has_author = "author" in json_ld or "publisher" in json_ld
    if has_author:
        checks.append({"label": "Author/Publisher markup present", "passed": True, "points": 15})
        score += 15
    else:
        checks.append({"label": "Author/Publisher markup present", "passed": False, "points": 0})

    return {"score": score, "max": 100, "checks": checks}