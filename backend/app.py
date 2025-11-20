from fastapi import FastAPI
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import json
from openai import OpenAI
import base64
from io import BytesIO
from charts_repo import CHART_REPO
from frameworks_repo import DATA_FRAMEWORKS
from layout_repo import SLIDE_REPO
from json_repair import repair_json
from auth import router as auth_router
from fastapi import Header, HTTPException

import os
import pandas as pd
import datetime
from bson import ObjectId
import numpy as np
import math
import json
import re
from infographics_repo import INFOGRAPHIC_REPO

load_dotenv()
def clean_numbers(obj):
    if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None  # or 0, or string "NaN"
    if isinstance(obj, dict):
        return {k: clean_numbers(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [clean_numbers(x) for x in obj]
    return obj

def sanitize_for_json(obj):
    """Recursively convert common non-JSON-serializable objects to JSON-safe types."""
    # ObjectId
    if isinstance(obj, ObjectId):
        return str(obj)
    # pandas Timestamp
    if isinstance(obj, pd.Timestamp):
        return obj.isoformat()
    # datetime
    if isinstance(obj, datetime.datetime):
        return obj.isoformat()
    # numpy types
    if isinstance(obj, (np.integer, np.floating)):
        return obj.item()
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize_for_json(x) for x in obj]
    return obj
# OpenAI client
openai_client = OpenAI(api_key=os.getenv('OPEN_AI_API'))
#print(os.getenv('OPEN_AI_API'))
# Prefer a lightweight, widely available default model; override via OPENAI_MODEL
MODEL_NAME = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

from contextlib import asynccontextmanager
from auth import users_collection
from motor.motor_asyncio import AsyncIOMotorClient
from threading import Event
import threading
import requests

@asynccontextmanager
async def lifespan(app):
    await users_collection.create_index("email", unique=True)
    # Start a simple background health pinger thread that periodically hits the configured HEALTHCHECK_URL
    stop_event = Event()
    health_url = os.getenv('HEALTHCHECK_URL', 'https://consulting-deck-app.onrender.com/health')
    
    interval = 60*15

    def _pinger():
        while not stop_event.is_set():
            try:
                # fire-and-forget GET; we don't need the response body
                requests.get(health_url, timeout=10)
            except Exception:
                # ignore errors - this is only to ensure the server is reachable
                pass
            # Wait with early exit support
            stop_event.wait(interval)

    thread = threading.Thread(target=_pinger, daemon=True)
    thread.start()
    try:
        yield
    finally:
        stop_event.set()
        thread.join(timeout=5)

app = FastAPI(title="Smart Consulting Deck Generator", lifespan=lifespan)


@app.get('/health')
async def health_check():
    """Simple health check endpoint used by the health pinger and external monitoring."""
    from datetime import datetime
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.post('/enrich_section')
async def enrich_section(payload: dict):
    """Accepts { title?: str, content: str, num_points?: int } and returns additional bullet points to expand the section.

    This is a lightweight enrichment endpoint used by the frontend when the user asks for "More content" on a sparse section.
    """
    title = payload.get('title', '')
    content = payload.get('content', '')
    num = int(payload.get('num_points', 3) or 3)
    include_charts = bool(payload.get('include_charts', False))
    include_frameworks = bool(payload.get('include_frameworks', False))
    if not content:
        return {"error": "content is required"}

    # Build an instruction to optionally include charts/frameworks
    # If charts/frameworks are requested, ask the LLM to return a JSON object with bullets and optional charts/frameworks
    instruction = (
        f"Generate {num} NEW, non-redundant, actionable bullet points that EXPAND on the input section. "
        "Do NOT merely rephrase the original content — add concrete, novel ideas, examples, or next steps that build on it. "
        "Each bullet should be concise (1-2 sentences) and focused on practical recommendations or specific elaborations. "
        "When helpful, include an example, metric, or brief suggested action.\n\n"
        f"Title: {title}\nContent: {content}\n\n"
    )

    if include_charts or include_frameworks:
        # Request structured JSON with bullets and optional charts/frameworks
        prompt = (
            instruction +
            "Return ONLY a JSON object with the following optional keys: 'bullets' (array of strings), 'charts' (array of objects), 'frameworks' (array of strings or objects). "
            "Each chart object should include 'type' (one of known chart names, e.g., 'Bar Chart') and 'data' (array of datapoints like [{\"label\":.., \"value\":..}]). "
            "Each framework should be a name from DATA_FRAMEWORKS; optionally include framework-specific data in a 'framework_data' object. "
            "Do NOT include any extra text outside the JSON. Ensure valid JSON."
        )
    else:
        prompt = instruction + "IMPORTANT: Return ONLY a valid JSON array of strings (e.g. [\"bullet 1\", \"bullet 2\"]). Do not include any markdown, backticks, explanatory text, or trailing commas."

    try:
        completion = openai_client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that writes concise, actionable slide bullets and, when requested, suggests charts and frameworks in JSON format."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.35,
            max_tokens=600,
        )
        text = completion.choices[0].message.content.strip()
        # Try to parse JSON robustly. Prefer repair_json if available.
        parsed = None
        try:
            from json_repair import repair_json as _repair
            repaired = _repair(text)
            parsed = json.loads(repaired)
        except Exception:
            try:
                # Attempt to extract JSON substring
                m = re.search(r'(\{.*\}|\[.*\])', text, re.DOTALL)
                candidate = m.group(1) if m else text
                candidate = re.sub(r',\s*(\]|\})', r'\1', candidate)
                parsed = json.loads(candidate)
            except Exception:
                parsed = None

        # If parsed is an array (legacy), return as bullets
        if isinstance(parsed, list):
            cleaned = [str(x).strip() for x in parsed if str(x).strip()]
            return {"bullets": cleaned[:num]}

        # If parsed is an object, extract fields
        if isinstance(parsed, dict):
            bullets = []
            charts = []
            frameworks = []
            if parsed.get('bullets') and isinstance(parsed.get('bullets'), list):
                bullets = [str(x).strip() for x in parsed.get('bullets') if str(x).strip()]
            # Support older key 'enriched' or similar
            elif parsed.get('enriched'):
                if isinstance(parsed.get('enriched'), list):
                    bullets = [str(x).strip() for x in parsed.get('enriched')]
                else:
                    bullets = [str(parsed.get('enriched'))]

            if include_charts and parsed.get('charts') and isinstance(parsed.get('charts'), list):
                for c in parsed.get('charts'):
                    # ensure minimal shape
                    try:
                        ctype = c.get('type') if isinstance(c, dict) else None
                        cdata = c.get('data') if isinstance(c, dict) else None
                        if ctype and cdata:
                            charts.append({'type': ctype, 'data': cdata})
                    except Exception:
                        continue

            if include_frameworks and parsed.get('frameworks'):
                if isinstance(parsed.get('frameworks'), list):
                    frameworks = parsed.get('frameworks')
                else:
                    frameworks = [parsed.get('frameworks')]

            result = {"bullets": bullets[:num]}
            if charts:
                result['charts'] = charts
            if frameworks:
                result['frameworks'] = frameworks
            return result

        # Fallback: try previous newline-splitting behavior on raw text
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        cleaned = []
        for l in lines:
            s = re.sub(r'^\s*(?:\d+\.|[-•\u2022])\s*', '', l).strip()
            s = re.sub(r'^["\']|["\']$|,$', '', s).strip()
            if s:
                cleaned.append(s)
        if not cleaned:
            cleaned = [content.strip()] if content.strip() else []
        if len(cleaned) == 1 and cleaned[0].lower().startswith(content.strip().lower()[:30]):
            base = cleaned[0]
            extra = base
            if 'example' not in base.lower():
                extra = base + ' For example, run a short pilot to validate and measure results.'
            cleaned = [base, extra][:num]
        return {"bullets": cleaned[:num]}
    except Exception as e:
        return {"error": str(e)}

# MongoDB decks collection
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://lobrockyl:Moyyn123@consultdg.ocafbf0.mongodb.net/?retryWrites=true&w=majority&appName=ConsultDG")
client = AsyncIOMotorClient(MONGO_URI)
db = client.get_database("consulting_deck")
decks_collection = db.get_collection("decks")

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Frontend URL
        "http://127.0.0.1:3000",  # Alternative localhost
        "https://pitchmate.in",
        "https://www.pitchmate.in",
        "https://consulting-deck-app-it2g.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Request Model ---
class SlideRequest(BaseModel):
    problem_statement: str
    storyline: List[str]
    num_slides: int
    data: Optional[dict] = None
    table_data: Optional[dict] = None
    table_sources: Optional[List[dict]] = None
    deep_analysis: Optional[bool] = False

def generate_dummy_data(visualization: str, slide_content: str):
    """Generate realistic dummy data based on visualization type and content"""
    viz = visualization.lower()
    
    if "pie" in viz or "donut" in viz:
        return [
            {"label": "Market Leader", "value": 45},
            {"label": "Challenger", "value": 30},
            {"label": "Follower", "value": 20},
            {"label": "Niche", "value": 5}
        ]
    elif "line" in viz or "area" in viz:
        return [
            {"label": "Q1", "value": 120},
            {"label": "Q2", "value": 135},
            {"label": "Q3", "value": 142},
            {"label": "Q4", "value": 158}
        ]
    elif "scatter" in viz or "bubble" in viz:
        return [
            {"x": 10, "y": 20, "z": 30},
            {"x": 15, "y": 25, "z": 40},
            {"x": 20, "y": 30, "z": 50},
            {"x": 25, "y": 35, "z": 60}
        ]
    elif "radar" in viz:
        return [
            {"label": "Performance", "value": 85},
            {"label": "Efficiency", "value": 70},
            {"label": "Innovation", "value": 90},
            {"label": "Customer", "value": 75},
            {"label": "Financial", "value": 80}
        ]
    elif "waterfall" in viz:
        return [
            {"label": "Starting Value", "value": 100},
            {"label": "Growth", "value": 25},
            {"label": "Market Expansion", "value": 15},
            {"label": "Efficiency Gains", "value": 10},
            {"label": "Final Value", "value": 150}
        ]
    else:  # Default bar chart
        return [
            {"label": "Region A", "value": 120},
            {"label": "Region B", "value": 95},
            {"label": "Region C", "value": 140},
            {"label": "Region D", "value": 110}
        ]

def generate_deck_single_call(problem_statement: str, storyline: List[str], num_slides: int, data: Optional[dict], table_data: Optional[dict]=None, table_sources: Optional[List[dict]]=None, deep_analysis: bool=False):
    #Check if user has enough coins

    """Single-call deck generator that includes frameworks and charts repos and returns a complete structured deck."""
    repos_context = {
        "CHART_REPO": CHART_REPO,
        "DATA_FRAMEWORKS": DATA_FRAMEWORKS,
        "SLIDE_REPO": SLIDE_REPO,
    }
    payload = {
        "problem_statement": problem_statement,
        "storyline": storyline,
        "num_slides": num_slides,
        "data": data or {},
        "repos": repos_context,
        "table_data": table_data or {},
        "table_sources": table_sources or [],
        "deep_analysis": bool(deep_analysis),
    }

    # --- Table summarizer and metric extractor ---
    def summarize_tables(tables: Optional[dict]):
        """Return compact summaries for each uploaded table to include in prompts.

        tables: mapping filename -> column-oriented dict (col -> list)
        """
        summaries = {}
        if not tables:
            return summaries
        for fname, tbl in (tables.items() if isinstance(tables, dict) else []):
            try:
                df = pd.DataFrame(tbl)
            except Exception:
                summaries[fname] = {"error": "could not parse table"}
                continue
            s = {}
            s['num_rows'] = int(len(df))
            s['columns'] = list(df.columns)
            # sample up to 2 rows
            try:
                s['sample_rows'] = df.head(2).fillna('').astype(str).to_dict(orient='records')
            except Exception:
                s['sample_rows'] = []
            # missing counts
            miss = {}
            for c in df.columns:
                miss[c] = int(df[c].isna().sum())
            s['missing_counts'] = miss
            # types and numeric stats
            types = {}
            stats = {}
            for c in df.columns:
                col = df[c]
                # try numeric
                num = pd.to_numeric(col.astype(str).str.replace(',','').replace(' ','').replace('%',''), errors='coerce')
                num_non_null = num.dropna()
                if len(num_non_null) >= max(1, int(0.4 * max(1, len(col)))):
                    types[c] = 'numeric'
                    try:
                        stats[c] = {
                            'count': int(num_non_null.count()),
                            'mean': float(num_non_null.mean()),
                            'median': float(num_non_null.median()),
                            'min': float(num_non_null.min()),
                            'max': float(num_non_null.max())
                        }
                    except Exception:
                        stats[c] = {}
                    continue
                # try datetime
                dt = None
                try:
                    dt = pd.to_datetime(col, errors='coerce', utc=True)
                except Exception:
                    dt = pd.Series([pd.NaT]*len(col))
                dt_non_null = dt.dropna()
                if len(dt_non_null) >= max(1, int(0.4 * max(1, len(col)))):
                    types[c] = 'datetime'
                    try:
                        smin = dt_non_null.min()
                        smax = dt_non_null.max()
                        stats[c] = {'start': sanitize_for_json(smin), 'end': sanitize_for_json(smax)}
                    except Exception:
                        stats[c] = {}
                    continue
                types[c] = 'string'
            s['types'] = types
            s['numeric_stats'] = stats
            summaries[fname] = s
        return summaries

    def extract_financial_metrics(table_summaries: dict):
        """Look for common financial columns and compute simple metrics/ratios."""
        metrics = {}
        # heuristics for column names
        targets = ['revenue', 'ebitda', 'net income', 'net_income', 'netincome', 'fcf', 'free cash flow', 'operating cash flow', 'total debt', 'equity', 'assets', 'liabilities']
        for fname, summ in table_summaries.items():
            try:
                cols = [c.lower() for c in summ.get('columns', [])]
            except Exception:
                cols = []
            found = {t: None for t in targets}
            for c in cols:
                for t in targets:
                    if t in c:
                        found[t] = c
            # simple extraction: take last non-null value for numeric columns if available in samples
            fm = {}
            # try using sample_rows to fetch numbers
            samples = summ.get('sample_rows', [])
            for key, colname in found.items():
                if colname and samples:
                    # attempt to read last sample value
                    try:
                        val = samples[-1].get(colname, None)
                        if val is None:
                            # try matching ignoring spaces/underscores
                            for srk in samples[-1].keys():
                                if srk.lower().replace(' ','').replace('_','') == colname.replace(' ','').replace('_',''):
                                    val = samples[-1].get(srk)
                        if val is not None:
                            # coerce numeric
                            try:
                                v = float(str(val).replace(',','').replace('%',''))
                                fm[key] = v
                            except Exception:
                                fm[key] = str(val)
                    except Exception:
                        pass
            if fm:
                metrics[fname] = fm
        return metrics

    table_summaries = summarize_tables(payload.get('table_data'))
    financial_metrics = extract_financial_metrics(table_summaries)
    system_instructions = (
        "You are a veteran McKinsey/BCG partner and expert in consulting slide design, structure and storytelling. For each slide, provide: "
        "1. Slide Archetype (e.g., Title-Content, Comparison, Timeline, Framework, Data Chart, etc.). "
        "2. Select the recommended layout from SLIDE_REPO according to the slide archetype, if available. If not, suggest a layout inspired by BCG/McKinsey slide layouts. "
        "3. For each grid section, specify: "
        "   - title: Section title "
        "   - content: Key points (minimize content) "
        "   - charts: an array of chart types (from CHART_REPO) relevant for this section"
        "   - frameworks: an array of frameworks (from DATA_FRAMEWORKS) relevant for this section"
        "Study BCG and McKinsey slide design patterns and suggest layouts and content sections that maximize clarity and impact for each section of each slide. "
        "Also, build an executive-ready consulting deck with detailed, comprehensive content. Expand the storyline into detailed, actionable insights. "
        "Use the provided repos to choose frameworks and chart types."
        "Be structured, comprehensive, and action-oriented."
        "Get numerical statistics and data from legit sources. "
        "For financials, do deep analysis and calculations as needed."
        "Mention sources. Output strictly valid JSON matching the response schema."
    )
    response_schema = {
        "type": "object",
        "properties": {
            "optimized_storyline": {"type": "array", "items": {"type": "string"}},
            "context_analysis": {"type": "object"},
            "slides": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "slide_number": {"type": "number"},
                        "title": {"type": "string"},
                        "slide_archetype": {"type": "string"},
                        "layout": {"type": "object", "properties": {"rows": {"type": "number"}, "columns": {"type": "number"}}, "required": ["rows", "columns"]},
                        "sections": {"type": "array", "items": {"type": "object", "properties": {
                            "row": {"type": "number"},
                            "col": {"type": "number"},
                            "title": {"type": "string"},
                            "content": {"type": "string"},
                            "charts": {"type": "array", "items": {"type": "string"}},
                            "frameworks": {"type": "array", "items": {"type": "string"}}
                        }, "required": ["row", "col", "content"]}},
                        "visualization": {"type": "string"},
                        "frameworks": {"type": "array", "items": {"type": "string"}},
                        "content": {"type": "array", "items": {"type": "string"}},
                        "takeaway": {"type": "string"},
                        "call_to_action": {"type": "string"},
                        "executive_summary": {"type": "string"},
                        "detailed_analysis": {"type": "string"},
                        "methodology": {"type": "string"},
                        "data": {"type": "array"}
                    },
                    "required": [
                        "slide_number","title","slide_archetype","layout","sections","visualization","frameworks","content","takeaway"
                    ]
                }
            },
            "recommendations": {"type": "array"}
        },
        "required": ["optimized_storyline","slides"]
    }
    # Attach the generated table summaries and metrics into the prompt to guide the LLM
    prompt = f"""
    SYSTEM:
    {system_instructions}

    INPUT (JSON):
    {json.dumps(payload, ensure_ascii=False)}

    REPOS (JSON):
    {json.dumps(repos_context, ensure_ascii=False)}

    TABLE DATA / SOURCES:
    {json.dumps({'table_sources': table_sources or [], 'table_data_sample': (list(table_data.keys())[:10] if isinstance(table_data, dict) else [])}, ensure_ascii=False)}

    TABLE SUMMARIES (JSON):
    {json.dumps(sanitize_for_json(table_summaries), ensure_ascii=False)}

    FINANCIAL METRICS (JSON):
    {json.dumps(sanitize_for_json(financial_metrics), ensure_ascii=False)}

    IMPORTANT: If deep_analysis == true, read the provided tables carefully, call out any specific data points used in your inferences, and cite the table filename (from table_sources) where the data came from. Include a top-level field `table_sources` in your response listing any sources referenced.

    RESPONSE REQUIREMENTS:
    - Return only JSON that conforms to this schema:
    {json.dumps(response_schema, ensure_ascii=False)}
    - For each slide, provide slide_archetype, layout (rows/columns), and sections (row, col, content) as described above.
    - chart must be one of the chart names present in CHART_REPO and should be the most suitable one
    - If chart is specified, compulsorily give relevant data with sources.
    - For forecasts, use realistic, justifiable numbers and give 5 year forecasts with CAGR and sources.
    - frameworks must be chosen from DATA_FRAMEWORKS names and should be the most suitable one
    - Content should have relevant data points, numbers, and sources.
    - Ensure slides length == num_slides and include slide_number 1..N
    - Create detailed, comprehensive content with 3-4 bullet points per slide
    - Expand storyline into detailed, actionable insights
    - Include detailed_analysis and methodology fields for each slide
    - Make content executive-ready with specific numbers, metrics and recommendations
    """

    completion = openai_client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": system_instructions},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
    )

    content = completion.choices[0].message.content
    print("------Raw LLM response:", content)
    try:
        result = json.loads(content)
    except Exception:
        # Try to extract JSON if wrapped
        start = content.find("{")
        end = content.rfind("}")
        result = json.loads(content[start:end+1]) if start != -1 and end != -1 else {
            "optimized_storyline": storyline,
            "slides": [
                {
                    "slide_number": i + 1,
                    "title": f"Slide {i+1}",
                    "visualization": "Bar Chart",
                    "frameworks": [],
                    "content": [storyline[i]] if i < len(storyline) else ["Key point"],
                    "takeaway": "Key insight",
                    "call_to_action": "Next steps",
                    "executive_summary": "Summary",
                    "data": []
                } for i in range(num_slides)
            ],
            "recommendations": {}
        }
    #print("------Generated deck:", result)
    # Ensure result includes the table sources that were provided so frontend can display them
    try:
        result.setdefault('table_sources', table_sources or [])
        result.setdefault('table_summaries', sanitize_for_json(table_summaries))
        result.setdefault('financial_metrics', sanitize_for_json(financial_metrics))
    except Exception:
        pass
    return result

# --- Server-side Chart Rendering ---
def render_chart_image(visualization: str, data_points: Optional[List[dict]]):
    """Render a chart using matplotlib and return a data URI (base64 PNG)."""
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except Exception:
        return None

    if not data_points:
        return None

    labels = [str(d.get("label", "")) for d in data_points]
    values = [float(d.get("value", 0)) for d in data_points]

    fig, ax = plt.subplots(figsize=(5, 3))
    fig.patch.set_alpha(0.0)
    ax.set_facecolor("white")

    viz = (visualization or "").lower()
    try:
        if "line" in viz:
            ax.plot(labels, values, marker="o", color="#2563eb")
        elif "pie" in viz or "donut" in viz:
            ax.pie(values, labels=labels, autopct="%1.0f%%", startangle=140)
        elif "waterfall" in viz:
            running = []
            total = 0
            for v in values:
                total += v
                running.append(total)
            ax.bar(labels, values, color=["#10B981" if v >= 0 else "#EF4444" for v in values])
            ax.plot(labels, running, color="#6b7280", linestyle=":")
        else:
            ax.bar(labels, values, color="#3b82f6")

        ax.set_xlabel("")
        ax.set_ylabel("")
        ax.grid(True, axis="y", linestyle=":", alpha=0.4)
        plt.tight_layout()

        buffer = BytesIO()
        plt.savefig(buffer, format="png", bbox_inches="tight", transparent=True)
        plt.close(fig)
        b64 = base64.b64encode(buffer.getvalue()).decode("ascii")
        return f"data:image/png;base64,{b64}"
    except Exception:
        try:
            plt.close(fig)
        except Exception:
            pass
        return None

@app.post("/generate_slides")
async def generate_slides(request: SlideRequest, authorization: str = Header(None)):
    result = generate_deck_single_call(
        request.problem_statement,
        request.storyline,
        request.num_slides,
        request.data,
        table_data=request.table_data,
        table_sources=request.table_sources,
        deep_analysis=bool(request.deep_analysis),
    )
    # Get token from the header
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = authorization.split(" ")[1]
    #Fetch user details using token
    if token:
        from auth import get_user
        user_details = await get_user(token=token)
        userCoins = user_details.get("coins", 0)
        if userCoins < request.num_slides:
            return {"error": "Insufficient coins to generate slides."}
    else:
        return {"error": "Authentication token is missing."}
    # Ensure slide numbers and count
    slides = result.get("slides", [])
    for i, s in enumerate(slides):
        c=0
        s.setdefault("slide_number", i + 1)
        # Generate dummy data if no data provided
        if not s.get("data"):
            s["data"] = generate_dummy_data(s.get("visualization", "Bar Chart"), s.get("content", ""))
        s["framework_data"] = {}
        # Ensure layout exists
        layout = s.get("layout") or {"rows": 1, "columns": 1}
        rows = int(layout.get("rows", 1) or 1)
        cols = int(layout.get("columns", 1) or 1)
        slots = max(1, rows * cols)

        # Normalize sections and ensure they are not empty
        existing_sections = s.get("sections", []) or []
        # Build a map of (row,col) -> section for positioning if present
        slot_map = {}
        valid_sections = []
        for sec in existing_sections:
            # Use provided row/col or assign sequentially later
            r = int(sec.get("row", 0) or 0)
            ccol = int(sec.get("col", 0) or 0)
            # Clean up content
            content = sec.get("content")
            if isinstance(content, str) and content.strip() == "":
                content = None
            if content is None and not sec.get("charts") and not sec.get("frameworks"):
                # mark as empty for now; will be filled later
                sec["_empty"] = True
            else:
                sec.pop("_empty", None)
            key = (r, ccol) if r and ccol else None
            if key:
                slot_map[key] = sec
            else:
                valid_sections.append(sec)

        # Rebuild ordered sections grid-wise, filling missing slots
        new_sections = []
        fallback_texts = []
        # Prepare fallback texts from slide content or takeaway
        if isinstance(s.get("content"), list) and len(s.get("content")) > 0:
            fallback_texts = s.get("content")[:]
        elif isinstance(s.get("content"), str) and s.get("content").strip():
            fallback_texts = [s.get("content")]
        if s.get("takeaway"):
            fallback_texts.append(s.get("takeaway"))

        # Also use labels from dummy data to craft short content
        dummy_for_slide = s.get("data") or generate_dummy_data(s.get("visualization", "Bar Chart"), s.get("content", ""))
        if isinstance(dummy_for_slide, list):
            for d in dummy_for_slide:
                label = d.get("label") if isinstance(d, dict) else None
                if label:
                    fallback_texts.append(f"Data point: {label}")

        idx_fallback = 0
        # Fill grid slots in row-major order
        for r in range(1, rows + 1):
            for ccol in range(1, cols + 1):
                if (r, ccol) in slot_map:
                    sec = slot_map[(r, ccol)]
                    # If marked empty, try to fill from fallback
                    if sec.get("_empty"):
                        text = None
                        if idx_fallback < len(fallback_texts):
                            text = fallback_texts[idx_fallback]
                            idx_fallback += 1
                        else:
                            # try to craft from visualization labels/values
                            if isinstance(dummy_for_slide, list) and len(dummy_for_slide) > 0:
                                dd = dummy_for_slide[(r - 1) % len(dummy_for_slide)]
                                text = dd.get("label") if isinstance(dd, dict) else str(dd)
                            else:
                                text = "No content available."
                        sec["content"] = text
                        sec.pop("_empty", None)
                    new_sections.append(sec)
                else:
                    # create a filler section
                    text = None
                    if idx_fallback < len(fallback_texts):
                        text = fallback_texts[idx_fallback]
                        idx_fallback += 1
                    else:
                        # derive from dummy data
                        if isinstance(dummy_for_slide, list) and len(dummy_for_slide) > 0:
                            dd = dummy_for_slide[(len(new_sections)) % len(dummy_for_slide)]
                            text = dd.get("label") if isinstance(dd, dict) else str(dd)
                        else:
                            text = "No content available."
                    new_sections.append({
                        "row": r,
                        "col": ccol,
                        "title": f"{s.get('title', 'Section')} - {r},{ccol}",
                        "content": text,
                        "charts": [],
                        "frameworks": [],
                        "infographics": [],
                    })

        # If there were extra standalone valid_sections (without row/col), append them until slots
        for sec in valid_sections:
            if len(new_sections) >= slots:
                break
            # find first empty position index
            # replace the next new_sections slot if it's filler
            replaced = False
            for idx_ns in range(len(new_sections)):
                ns = new_sections[idx_ns]
                if not ns.get("charts") and not ns.get("frameworks") and (not ns.get("content") or str(ns.get("content")).strip() == ""):
                    new_sections[idx_ns] = sec
                    replaced = True
                    break
            if not replaced and len(new_sections) < slots:
                new_sections.append(sec)

        # Truncate extras if more sections than slots
        if len(new_sections) > slots:
            new_sections = new_sections[:slots]

        # Assign back
        s["sections"] = new_sections
        # Slide-level frameworks enrichment (existing logic)
        # for fw in s.get("frameworks", []):
            # if c>=1:
            #     break
            # c+=1

            # fw_prompt = f"""
            # For the following framework, provide a JSON object with the relevant fields filled in for this slide context:
            # Framework: {fw}
            # Slide Title: {s.get('title')}
            # Slide Content: {s.get('content')}
            # If SWOT Analysis, return {{"Strengths": [...], "Weaknesses": [...], "Opportunities": [...], "Threats": [...]}}
            # If BCG Matrix, return {{"Stars": [...], "Cash Cows": [...], "Question Marks": [...], "Dogs": [...]}}
            # If Porter's Five Forces, return {{"Competitive Rivalry": [...], "Supplier Power": [...], "Buyer Power": [...], "Threat of Substitution": [...], "Threat of New Entry": [...]}}
            # If Value Chain Analysis, return {{"Primary Activities": [...], "Support Activities": [...]}}
            # If PEST Analysis, return {{"Political": [...], "Economic": [...], "Social": [...], "Technological": [...]}}
            # If Ansoff Matrix, return {{"Market Penetration": [...], "Market Development": [...], "Product Development": [...], "Diversification": [...]}}
            # If "McKinsey 7S", return {{"Strategy": [...], "Structure": [...], "Systems": [...], "Shared Values": [...], "Style": [...], "Staff": [...], "Skills": [...]}}            
            # If "Balanced Scorecard", return {{"Financial": [...], "Customer": [...], "Internal Processes": [...], "Learning & Growth": [...]}}
            # If "DuPont Analysis", return {{"ROE Decomposition": [...], "Financial Performance Analysis": [...]}}            
            # If "Economic Value Added (EVA)", return {{"Value Creation": [...], "Performance-Based Compensation": [...]}}            
            # If "Break-even Analysis", return {{"Profit Planning": [...], "Cost-Volume Analysis": [...]}}            
            # If "Sensitivity Analysis", return {{"Risk Assessment": [...], "Financial Forecasting": [...]}}            
            # If "Monte Carlo Simulation", return {{"Risk Modelling": [...], "Forecast Uncertainty": [...]}}            
            # If "Scenario Planning", return {{"Strategic Foresight": [...], "Long-Term Planning": [...]}}            
            # If "Cohort Analysis", return {{"Customer Retention": [...], "User Behavior Analysis": [...]}}            
            # If "Unit Economics Model", return {{"Startup Analysis": [...], "Scalability Assessment": [...]}}            
            # If "LTV:CAC Ratio", return {{"Customer Profitability": [...], "Marketing Efficiency": [...]}}            
            # If "CLV Forecasting Model", return {{"Customer Lifetime Value": [...], "Growth Modelling": [...]}}            
            # If "RACI Matrix", return {{"Role Clarity": [...], "Responsibility Assignment": [...]}}            
            # If "Organizational Structure Chart", return {{"Reporting Structure": [...], "Org Design": [...]}}            
            # If "Process Flow Diagram", return {{"Process Improvement": [...], "Efficiency Analysis": [...]}}            
            # If "SIPOC Diagram", return {{"Process Scoping": [...], "Quality Management": [...]}}            
            # If "Root Cause Analysis (5 Whys)", return {{"Problem Solving": [...], "Defect Reduction": [...]}}            
            # If "Fishbone Diagram", return {{"Root Cause Identification": [...], "Brainstorming": [...]}}            
            # If "Critical Path Method (CPM)", return {{"Project Scheduling": [...], "Bottleneck Detection": [...]}}            
            # If "PERT Chart", return {{"Project Estimation": [...], "Uncertainty Analysis": [...]}}            
            # If "Value Stream Mapping", return {{"Lean Improvement": [...], "Waste Reduction": [...]}}            
            # If "Theory of Constraints (TOC)", return {{"Throughput Improvement": [...], "Bottleneck Resolution": [...]}}            
            # If "Customer Journey Map", return {{"Experience Mapping": [...], "Pain Point Detection": [...]}}            
            # If "Empathy Map", return {{"User Needs Understanding": [...], "UX Design": [...]}}            
            # If "Kano Model", return {{"Feature Prioritization": [...], "Product Strategy": [...]}}            
            # If "Jobs-to-be-Done Framework", return {{"Innovation Discovery": [...], "Customer Motivation Analysis": [...]}}            
            # If "Product Life Cycle Curve", return {{"Product Strategy": [...], "Portfolio Planning": [...]}}            
            # If "Innovation Adoption Curve", return {{"Market Adoption": [...], "Product Launch Strategy": [...]}}            
            # If "AARRR Funnel", return {{"Startup Growth Tracking": [...], "User Lifecycle": [...]}}            
            # If "HEART Framework", return {{"UX Metrics": [...], "User Experience Tracking": [...]}}            
            # If "North Star Metric Framework", return {{"Product Focus": [...], "Growth Tracking": [...]}}            
            # If "OKR Framework", return {{"Goal Setting": [...], "Performance Tracking": [...]}}
            # For other frameworks, return a dictionary with relevant keys and values.
            # """
            # try:
            #     fw_completion = openai_client.chat.completions.create(
            #         model=MODEL_NAME,
            #         messages=[
            #             {"role": "system", "content": "You are a consulting frameworks expert. Return only valid JSON."},
            #             {"role": "user", "content": fw_prompt},
            #         ],
            #         temperature=0.2,
            #     )
            #     fw_content = fw_completion.choices[0].message.content
            #     fw_json = json.loads(fw_content)
            #     try:
            #         df = pd.DataFrame.from_dict(fw_json, orient='index').transpose()
            #         s["framework_data"][fw] = df.to_dict(orient='list')
            #     except Exception as e:
            #         s["framework_data"][fw] = {"Error": [str(e)]}
            # except Exception:
        # Slide-level chart enrichment (existing logic)
        # for chart in s.get("visualization", []):
        #     # if chart_gen_num>=1:
        #     #     break
        #     print("Processing chart:", chart)
        #     chart_prompt = f"""
        #     For the following chart, provide a JSON object with the relevant fields filled in for this slide context:
        #     Chart Type: {chart}
        #     Slide Title: {s.get('title')}
        #     Slide Content: {s.get('content')}
        #     Data: {request.problem_statement}
        #     Provide the following:
        #     - xAxisTitle: A string representing the title of the X-axis.
        #     - yAxisTitle: A string representing the title of the Y-axis.
        #     - legend: A string representing the legend.
        #     - inferences: A list of strings summarizing key insights from the chart data."""
        #     try:
        #         #chart_gen_num+=1
    #         chart_completion = openai_client.chat.completions.create(
        #             model=MODEL_NAME,
        #             messages=[
        #                 {"role": "system", "content": "You are a data visualization expert. Return only valid JSON."},
        #                 {"role": "user", "content": chart_prompt},
        #             ],
        #             temperature=0.3,
        #         )
        #         chart_content = chart_completion.choices[0].message.content
        #         chart_content_repaired = repair_json(chart_content)
        #         cleaned_json = clean_numbers(json.loads(chart_content_repaired))
        #         chart_json = json.loads(cleaned_json)
        #         s["chart_data"] = {
        #             "xAxisTitle": chart_json.get("xAxisTitle", "Not available"),
        #             "yAxisTitle": chart_json.get("yAxisTitle", "Not available"),
        #             "legend": chart_json.get("legend", "Not available"),
        #             "inferences": chart_json.get("inferences", []),
        #         }
        #     except Exception as e:
        #         s["chart_data"] = {
        #             "xAxisTitle": "Not available",
        #             "yAxisTitle": "Not available",
        #             "legend": "Not available",
        #             "inferences": [],
        #         }

        # --- Section-level enrichment ---
        for section in s.get("sections", []):
            section["framework_data"] = []
            # Infographic suggestion logic
            section["infographics"] = []
            section_content = section.get("content", "")
            # Use OpenAI to suggest best infographics for the section
            try:
                infographics_prompt = f"""
                Given the following section content, suggest the most relevant infographic types from this list:
                {json.dumps([i['name'] for i in INFOGRAPHIC_REPO])}
                Section Title: {section.get('title')}
                Section Content: {section_content}
                Only return a JSON array of infographic names that best visualize this section's information.
                """
                inf_completion = openai_client.chat.completions.create(
                    model=MODEL_NAME,
                    messages=[
                        {"role": "system", "content": "You are a consulting infographics expert. Return only valid JSON."},
                        {"role": "user", "content": infographics_prompt},
                    ],
                    temperature=0.2,
                )
                inf_content = inf_completion.choices[0].message.content
                section["infographics"] = json.loads(inf_content)
            except Exception:
                section["infographics"] = []
            for fw in section.get("frameworks", []):
                fw_prompt = f"""
                For the following framework, provide a JSON object with the relevant fields filled in for this section context:
                Framework: {fw}
                Slide Title: {s.get('title')}
                Section Title: {section.get('title')}
                Section Content: {section.get('content')}
                If SWOT Analysis, return {{"Strengths": [...], "Weaknesses": [...], "Opportunities": [...], "Threats": [...]}}
                If BCG Matrix, return {{"Stars": [...], "Cash Cows": [...], "Question Marks": [...], "Dogs": [...]}}
                If Porter's Five Forces, return {{"Competitive Rivalry": [...], "Supplier Power": [...], "Buyer Power": [...], "Threat of Substitution": [...], "Threat of New Entry": [...]}}
                If Value Chain Analysis, return {{"Primary Activities": [...], "Support Activities": [...]}}
                If PEST Analysis, return {{"Political": [...], "Economic": [...], "Social": [...], "Technological": [...]}}
                If Ansoff Matrix, return {{"Market Penetration": [...], "Market Development": [...], "Product Development": [...], "Diversification": [...]}}
                If "McKinsey 7S", return {{"Strategy": [...], "Structure": [...], "Systems": [...], "Shared Values": [...], "Style": [...], "Staff": [...], "Skills": [...]}}            
                If "Balanced Scorecard", return {{"Financial": [...], "Customer": [...], "Internal Processes": [...], "Learning & Growth": [...]}}
                If "DuPont Analysis", return {{"ROE Decomposition": [...], "Financial Performance Analysis": [...]}}            
                If "Economic Value Added (EVA)", return {{"Value Creation": [...], "Performance-Based Compensation": [...]}}            
                If "Break-even Analysis", return {{"Profit Planning": [...], "Cost-Volume Analysis": [...]}}            
                If "Sensitivity Analysis", return {{"Risk Assessment": [...], "Financial Forecasting": [...]}}            
                If "Monte Carlo Simulation", return {{"Risk Modelling": [...], "Forecast Uncertainty": [...]}}            
                If "Scenario Planning", return {{"Strategic Foresight": [...], "Long-Term Planning": [...]}}            
                If "Cohort Analysis", return {{"Customer Retention": [...], "User Behavior Analysis": [...]}}            
                If "Unit Economics Model", return {{"Startup Analysis": [...], "Scalability Assessment": [...]}}            
                If "LTV:CAC Ratio", return {{"Customer Profitability": [...], "Marketing Efficiency": [...]}}            
                If "CLV Forecasting Model", return {{"Customer Lifetime Value": [...], "Growth Modelling": [...]}}            
                If "RACI Matrix", return {{"Role Clarity": [...], "Responsibility Assignment": [...]}}            
                If "Organizational Structure Chart", return {{"Reporting Structure": [...], "Org Design": [...]}}            
                If "Process Flow Diagram", return {{"Process Improvement": [...], "Efficiency Analysis": [...]}}            
                If "SIPOC Diagram", return {{"Process Scoping": [...], "Quality Management": [...]}}            
                If "Root Cause Analysis (5 Whys)", return {{"Problem Solving": [...], "Defect Reduction": [...]}}            
                If "Fishbone Diagram", return {{"Root Cause Identification": [...], "Brainstorming": [...]}}            
                If "Critical Path Method (CPM)", return {{"Project Scheduling": [...], "Bottleneck Detection": [...]}}            
                If "PERT Chart", return {{"Project Estimation": [...], "Uncertainty Analysis": [...]}}            
                If "Value Stream Mapping", return {{"Lean Improvement": [...], "Waste Reduction": [...]}}            
                If "Theory of Constraints (TOC)", return {{"Throughput Improvement": [...], "Bottleneck Resolution": [...]}}            
                If "Customer Journey Map", return {{"Experience Mapping": [...], "Pain Point Detection": [...]}}            
                If "Empathy Map", return {{"User Needs Understanding": [...], "UX Design": [...]}}            
                If "Kano Model", return {{"Feature Prioritization": [...], "Product Strategy": [...]}}            
                If "Jobs-to-be-Done Framework", return {{"Innovation Discovery": [...], "Customer Motivation Analysis": [...]}}            
                If "Product Life Cycle Curve", return {{"Product Strategy": [...], "Portfolio Planning": [...]}}            
                If "Innovation Adoption Curve", return {{"Market Adoption": [...], "Product Launch Strategy": [...]}}            
                If "AARRR Funnel", return {{"Startup Growth Tracking": [...], "User Lifecycle": [...]}}            
                If "HEART Framework", return {{"UX Metrics": [...], "User Experience Tracking": [...]}}            
                If "North Star Metric Framework", return {{"Product Focus": [...], "Growth Tracking": [...]}}            
                If "OKR Framework", return {{"Goal Setting": [...], "Performance Tracking": [...]}}
                For other frameworks, return a dictionary with relevant keys and values.
                """
                try:
                    fw_completion = openai_client.chat.completions.create(
                        model=MODEL_NAME,
                        messages=[
                            {"role": "system", "content": "You are a consulting frameworks expert. Return only valid JSON."},
                            {"role": "user", "content": fw_prompt},
                        ],
                        temperature=0.2,
                    )
                    fw_content = fw_completion.choices[0].message.content
                    fw_json = json.loads(fw_content)
                    try:
                        # If all values in fw_json are lists, treat as tabular
                        if isinstance(fw_json, dict) and all(isinstance(v, list) for v in fw_json.values()):
                            df = pd.DataFrame.from_dict(fw_json, orient='index').transpose()
                            section["framework_data"].append({fw: df.to_dict(orient='list')})
                        else:
                            section["framework_data"].append({fw: fw_json})
                    except Exception as e:
                        section["framework_data"].append({fw: {"Error": [str(e)]}})
                except Exception:
                    section["framework_data"].append({fw: {}})
            section["chart_data"] = {}
            charts = section.get("charts", None)
            chart = charts[0] if charts and len(charts) > 0 else None
            if chart:
                # chart_prompt = f"""
                # For the following chart, provide a JSON object in table format for plotting, plus metadata, for this section context:
                # Chart Type: {chart}
                # Slide Title: {s.get('title')}
                # Section Title: {section.get('title')}
                # Section Content: {section.get('content')}
                # Data: {request.problem_statement}
                # For bar/line/area/pie/donut charts, return: {{"labels": [...], "values": [...]}}
                # For waterfall charts, return: {{"steps": [...], "values": [...]}}
                # For scatter/bubble charts, return: {{"x": [...], "y": [...], "z": [...] (optional)}}
                # For radar charts, return: {{"labels": [...], "values": [...]}}
                # For other chart types, return a dictionary with arrays for each axis/series.
                # Additionally, necessarily provide:
                # - xAxisTitle: A string representing the title of the X-axis.
                # - yAxisTitle: A string representing the title of the Y-axis.
                # - legend: A string representing the legend.
                # - inferences: A list of strings summarizing key insights from the chart data.
                # Return only valid JSON.
                # """
                chart_prompt = f"""
                You are a data visualization assistant. Your task is to generate **strictly valid JSON** for plotting charts.

                Context:
                - Chart Type: {chart}
                - Slide Title: {s.get('title')}
                - Section Title: {section.get('title')}
                - Slide Content: {section.get('content')}
                - Problem Statement (use this for data extraction if possible): {request.problem_statement}

                Instructions:
                1. Always extract or infer structured numeric data from the Problem Statement or Section Content.
                - If no explicit numbers exist, invent a small but realistic dataset (3–6 entries).
                - Ensure data matches the specified chart type.

                2. Output must be a **single JSON object** following the schema for the chart type:
                - For Bar/Line/Area/Pie/Donut charts:
                    {{
                    "labels": [ "Label1", "Label2", ... ],
                    "values": [ number, number, ... ]
                    }}
                - For Waterfall charts:
                    {{
                    "steps": [ "Step1", "Step2", ... ],
                    "values": [ number, number, ... ]
                    }}
                - For Scatter/Bubble charts:
                    {{
                    "x": [ number, number, ... ],
                    "y": [ number, number, ... ],
                    "z": [ number, number, ... ]  # optional for bubble size
                    }}
                - For Radar charts:
                    {{
                    "labels": [ "Dimension1", "Dimension2", ... ],
                    "values": [ number, number, ... ]
                    }}
                - For other chart types: 
                    Provide a dictionary with arrays for each axis/series.

                3. Additionally include these **metadata fields** in the JSON:
                - "xAxisTitle": string
                - "yAxisTitle": string
                - "legend": string
                - "inferences": [ "Insight1", "Insight2", ... ]

                4. Output Rules:
                - Return only **one JSON object** with no explanations or extra text.
                - Do not wrap JSON in code blocks.
                - Ensure JSON is syntactically valid.
                """
                try:
                    chart_completion = openai_client.chat.completions.create(
                        model=MODEL_NAME,
                        messages=[
                            {"role": "system", "content": "You are a data visualization expert. Return only valid JSON."},
                            {"role": "user", "content": chart_prompt},
                        ],
                        temperature=0.3,
                    )
                    chart_content = chart_completion.choices[0].message.content
                    print("------------Generated chart content:", chart_content)
                    chart_content_repaired = repair_json(chart_content)
                    print("------------Repaired chart content:", chart_content_repaired)
                    cleaned_json = clean_numbers(json.loads(chart_content_repaired))
                    print("------------Cleaned chart content:", cleaned_json)
                    chart_json = cleaned_json
                    print("------------Parsed chart JSON:", chart_json)
                    # Generate chart image data URI
                    print("------------Generated chart image URI:", chart_json.get("xAxisTitle", "Not available"))
                    section["chart_data"][chart] = {
                        "xAxisTitle": chart_json.get("xAxisTitle", "Not available"),
                        "yAxisTitle": chart_json.get("yAxisTitle", "Not available"),
                        "legend": chart_json.get("legend", "Not available"),
                        "inferences": chart_json.get("inferences", []),
                        "labels": chart_json.get("labels", []),
                        "values": chart_json.get("values", []),
                    }
                    print("------------Final chart JSON:", section["chart_data"][chart])
                except Exception as e:
                    section["chart_data"][chart] = {
                        "xAxisTitle": "Not available",
                        "yAxisTitle": "Not available",
                        "legend": "Not available",
                        "inferences":[],
                    }
       
    result["slides"] = slides[: request.num_slides]
    result.setdefault("problem_statement", request.problem_statement)
    result.setdefault("optimized_storyline", result.get("optimized_storyline", request.storyline))
    # Save the generated deck into decks_collection and add a reference to user's saved_decks
    try:
        from auth import verify_access_token
        payload = verify_access_token(token)
        user_email = payload.get("sub")
    except Exception:
        user_email = None

    deck_doc = {
        "email": user_email,
        "deck": result,
        "num_slides": request.num_slides,
        "created_at": pd.Timestamp.now().isoformat()
    }
    try:
        await decks_collection.insert_one(deck_doc)
        # Push a small summary into user's saved_decks array
        summary = {
            "title": result.get("slides", [{}])[0].get("title", "Untitled"),
            "num_slides": request.num_slides,
            "created_at": deck_doc["created_at"],
            "deck_id": None
        }
        # find the inserted deck id and update summary
        inserted = await decks_collection.find_one({"email": user_email, "created_at": deck_doc["created_at"]})
        if inserted:
            print("Inserted deck ID:", inserted.get("_id"))
            summary["deck_id"] = str(inserted.get("_id"))
        if user_email:
            await users_collection.update_one({"email": user_email}, {"$push": {"saved_decks": summary}})
    except Exception as e:
        print("Failed to save deck:", e)
    # Sanitize result before returning to ensure JSON-safe
    try:
        safe_result = sanitize_for_json(result)
    except Exception:
        safe_result = result
    return safe_result

# --- API Call for Chart Plotting Data ---
#@app.post("/generate_chart_data")
async def generate_chart_data(visualization: str, data_points: Optional[List[dict]] = None):
    """Generate chart plotting data using OpenAI API or provided data."""
    if data_points:
        # Use provided data if available
        chart_prompt = f"""
        For the following chart type, provide a JSON array with datapoints from given Data and give relevant xAxisTitle, yAxisTitle, inferences Array.
        Chart Type: {visualization}
        Data: {data_points}
        Each data point should have the following structure:
        - For bar/line/area charts: {"label": "string", "value": number}
        - For scatter/bubble charts: {"x": number, "y": number, "z": number (optional)}
        - For pie/donut charts: {"label": "string", "value": number}
        Necessarily, provide the following:
        - xAxisTitle: A string representing the title of the X-axis.
        - yAxisTitle: A string representing the title of the Y-axis.
        - inferences: A list of strings summarizing key insights from the chart data.
        """

        try:
            completion = openai_client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {"role": "system", "content": "You are a data visualization expert. Return only valid JSON."},
                    {"role": "user", "content": chart_prompt},
                ],
                temperature=0.3,
            )
            print(completion)
            content = completion.choices[0].message.content
            chart_data = json.loads(content)
            return {
                "data": chart_data[:5],  # Limit to 5 sets of coordinates
                "xAxisTitle": chart_data.get("xAxisTitle", "Not available"),
                "yAxisTitle": chart_data.get("yAxisTitle", "Not available"),
                "legend": chart_data.get("legend", "Not available"),
                "inferences": chart_data.get("inferences", []),
                "relatedDataPoints": chart_data.get("relatedDataPoints", [])
            }
        except Exception as e:
            return {"error": str(e)}

    # Generate data using OpenAI API
    chart_prompt = f"""
    For the following chart type, provide a JSON array with up to 5 data points and xAxisTitle, yAxisTitle, inferences Array.
    Chart Type: {visualization}
    Each data point should have the following structure:
    - For bar/line/area charts: {"label": "string", "value": number}
    - For scatter/bubble charts: {"x": number, "y": number, "z": number (optional)}
    - For pie/donut charts: {"label": "string", "value": number}
    Necessarily, provide the following:
    - xAxisTitle: A string representing the title of the X-axis.
    - yAxisTitle: A string representing the title of the Y-axis.
    - inferences: A list of strings summarizing key insights from the chart data.
    """

    try:
        completion = openai_client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": "You are a data visualization expert. Return only valid JSON."},
                {"role": "user", "content": chart_prompt},
            ],
            temperature=0.3,
        )
        print(completion)
        content = completion.choices[0].message.content
        chart_data = json.loads(content)
        return {
            "data": chart_data[:5],  # Limit to 5 sets of coordinates
            "xAxisTitle": chart_data.get("xAxisTitle", "Not available"),
            "yAxisTitle": chart_data.get("yAxisTitle", "Not available"),
            "legend": chart_data.get("legend", "Not available"),
            "inferences": chart_data.get("inferences", []),
            "relatedDataPoints": chart_data.get("relatedDataPoints", [])
        }
    except Exception as e:
        return {"error": str(e)}

@app.post("/save_deck")
async def save_deck(deck: dict, authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = authorization.split(" ")[1]
    from auth import get_user
    user_details = await get_user(token=token)
    email = user_details.get("name")
    if not email:
        raise HTTPException(status_code=401, detail="User not found")
    deck_doc = {
        "email": user_details.get("email", email),
        "deck": deck,
        "created_at": pd.Timestamp.now().isoformat()
    }
    await decks_collection.insert_one(deck_doc)
    return {"success": True}

@app.get("/my_decks")
async def my_decks(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = authorization.split(" ")[1]
    from auth import get_user
    user_details = await get_user(token=token)
    email = user_details.get("name")
    if not email:
        raise HTTPException(status_code=401, detail="User not found")
    decks = await decks_collection.find({"email": user_details.get("email", email)}).to_list(length=100)
    # Convert ObjectId to string for JSON serialization
    cleaned = []
    for d in decks:
        try:
            item = dict(d)
            if item.get("_id") is not None:
                item["_id"] = str(item["_id"])
            # ensure created_at is a string
            if item.get("created_at") is not None:
                try:
                    # if it's a pandas Timestamp or datetime, convert to isoformat
                    item["created_at"] = item["created_at"].isoformat() if hasattr(item["created_at"], 'isoformat') else str(item["created_at"])
                except Exception:
                    item["created_at"] = str(item.get("created_at"))
            cleaned.append(item)
        except Exception:
            # fallback: stringify
            cleaned.append({k: str(v) for k, v in (d.items() if isinstance(d, dict) else [])})
    return {"decks": cleaned}

app.include_router(auth_router, prefix="/auth")


@app.get("/palette")
async def get_palette():
    """Return a 6-color palette. Try to get a recommendation from the AI, but fall back to a static palette on any error."""
    prompt = (
        "Provide a single JSON object with two keys: \"name\" (string) and \"colors\" (an array of exactly 6 hex color codes like '#1a2b3c'). "
        "Keep the response strictly as JSON with no extra commentary. The palette should be harmonious and suitable for professional consulting slides."
    )
    # Default fallback palette
    fallback = {"name": "Default Consulting", "colors": ["#0f172a", "#1f6feb", "#10b981", "#f59e0b", "#ef4444", "#6b7280"]}
    try:
        completion = openai_client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": "You are a professional designer. Return only JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.35,
        )
        content = completion.choices[0].message.content
        # Try to repair JSON if LLM output is slightly malformed
        try:
            repaired = repair_json(content)
            parsed = json.loads(repaired)
        except Exception:
            # As a softer fallback, try to extract hex codes with regex
            hexes = re.findall(r"#([0-9a-fA-F]{6})", content)
            if len(hexes) >= 6:
                parsed = {"name": "AI Palette", "colors": [f"#{h}" for h in hexes[:6]]}
            else:
                parsed = fallback
        # Validate shape
        if not isinstance(parsed, dict) or not isinstance(parsed.get("colors"), list) or len(parsed.get("colors")) < 6:
            return sanitize_for_json(fallback)
        # Ensure exactly 6 colors (trim or pad with fallback)
        colors = parsed.get("colors")[:6]
        if len(colors) < 6:
            colors = colors + fallback["colors"][len(colors):]
        result = {"name": parsed.get("name", "AI Palette"), "colors": colors}
        return sanitize_for_json(result)
    except Exception as e:
        print("/palette error:", e)
        return sanitize_for_json(fallback)


@app.post("/enrich_problem")
async def enrich_problem(payload: dict, authorization: str = Header(None)):
    """Return an enriched problem statement plus extracted data points and sources.
    payload expected: {"problem": "...", "answers": [...] }
    """
    problem = payload.get("problem") if isinstance(payload, dict) else None
    answers = payload.get("answers") if isinstance(payload, dict) else None
    if not problem:
        return {"error": "Missing problem text"}
    prompt = f"""
    You are a helpful analyst. Given the following problem statement and optional user answers, produce a JSON object with keys:
    - enriched: a polished, expanded problem statement suitable for generating slides (2-4 short paragraphs)
    - data: an array of extracted or inferred data points or metrics (each item should be a dict with label and value when appropriate)
    - sources: an array of strings listing plausible sources for the data (URLs or dataset names)

    Input problem:
    {problem}

    User answers (if any):
    {answers}

    Return only valid JSON. Keep content concise and actionable.
    """
    try:
        completion = openai_client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": "You are a concise analyst. Return only JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
        )
        content = completion.choices[0].message.content
        try:
            repaired = repair_json(content)
            parsed = json.loads(repaired)
        except Exception:
            # Fallback: try to extract fields heuristically
            parsed = {"enriched": content, "data": [], "sources": []}
        return sanitize_for_json(parsed)
    except Exception as e:
        print('/enrich_problem error:', e)
        return {"error": str(e)}