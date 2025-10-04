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
import math
import json
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
client = OpenAI(api_key=os.getenv('OPEN_AI_API'))
#print(os.getenv('OPEN_AI_API'))
# Prefer a lightweight, widely available default model; override via OPENAI_MODEL
MODEL_NAME = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

app = FastAPI(title="Smart Consulting Deck Generator")

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

def generate_deck_single_call(problem_statement: str, storyline: List[str], num_slides: int, data: Optional[dict]):
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
    }
    system_instructions = (
        "You are a veteran McKinsey/BCG partner and expert in consulting slide design. For each slide, provide: "
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
        "Get numerical statistics and data from legit sources."
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
    prompt = f"""
    SYSTEM:
    {system_instructions}

    INPUT (JSON):
    {json.dumps(payload, ensure_ascii=False)}

    REPOS (JSON):
    {json.dumps(repos_context, ensure_ascii=False)}

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

    completion = client.chat.completions.create(
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
            #     fw_completion = client.chat.completions.create(
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
        #         chart_completion = client.chat.completions.create(
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
                inf_completion = client.chat.completions.create(
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
                    fw_completion = client.chat.completions.create(
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
                    chart_completion = client.chat.completions.create(
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
    return result

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
            completion = client.chat.completions.create(
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
        completion = client.chat.completions.create(
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

app.include_router(auth_router, prefix="/auth")