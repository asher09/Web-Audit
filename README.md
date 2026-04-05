# Web Audit — GEO Schema Recommender

A lightweight tool that scrapes any public webpage and returns AI-generated
Schema.org JSON-LD structured data, plus a GEO Citation Readiness score
showing how visible the page is to AI search engines like ChatGPT and Perplexity.

---

## Setup

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in `/backend`:
```
GROQ_API_KEY=your_key_here
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`, paste any URL, hit Audit.

---

## API

**POST** `/audit`
```json
{ "url": "https://example.com" }
```

Returns: page title, meta description, headings, images, JSON-LD block, GEO score.

**GET** `/health` — liveness check.

---

## Stack

- **Backend**: FastAPI, BeautifulSoup4, Groq (Llama 3.3 70B)
- **Frontend**: Next.js, Tailwind CSS