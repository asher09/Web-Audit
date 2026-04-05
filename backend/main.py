from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from services.scraper import scrape_page
from services.recommender import generate_json_ld, calculate_geo_score
import logging
import uvicorn

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("web-audit")

app = FastAPI(
    title="Web Audit API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AuditRequest(BaseModel):
    url: HttpUrl


class AuditResponse(BaseModel):
    url: str
    scraped_data: dict
    json_ld: dict
    schema_type: str
    geo_score: dict


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/audit", response_model=AuditResponse)
async def audit(request: AuditRequest):
    url_str = str(request.url)
    logger.info(f"Auditing: {url_str}")

    try:
        scraped = scrape_page(url_str)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Scrape error: {e}")
        raise HTTPException(status_code=500, detail="Failed to scrape URL.")

    try:
        json_ld, schema_type = generate_json_ld(url_str, scraped)
    except Exception as e:
        logger.error(f"AI error: {e}")
        raise HTTPException(status_code=500, detail="AI recommendation failed.")

    geo_score = calculate_geo_score(scraped, json_ld)

    return AuditResponse(
        url=url_str,
        scraped_data=scraped,
        json_ld=json_ld,
        schema_type=schema_type,
        geo_score=geo_score,
    )


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)