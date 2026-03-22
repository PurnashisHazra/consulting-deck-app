"""
PPTX template catalog (pptx_templates.json): selection + mapping to frontend slide_design (1280x720).
Source layout uses 1920x1080 absolute_px; we scale to match CanvasSlidePreview CANVAS dimensions.
"""
from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, List, Optional, Tuple

_SRC_W = 1920
_SRC_H = 1080


def _load_templates_raw() -> Dict[str, Any]:
    base = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(base, "pptx_templates.json")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


try:
    _PPTX_DOC = _load_templates_raw()
except Exception:
    _PPTX_DOC = {"templates": []}

PPTX_TEMPLATES: List[Dict[str, Any]] = list(_PPTX_DOC.get("templates") or [])
PPTX_TEMPLATES_BY_ID: Dict[str, Dict[str, Any]] = {
    str(t.get("id")): t for t in PPTX_TEMPLATES if isinstance(t, dict) and t.get("id")
}


def _tokenize_text(v: str) -> set:
    try:
        return {t for t in re.findall(r"[a-zA-Z0-9]+", str(v or "").lower()) if len(t) > 2}
    except Exception:
        return set()


def _flatten_top_level_regions(template: Dict[str, Any]) -> List[Dict[str, Any]]:
    regions = template.get("regions") or []
    out: List[Dict[str, Any]] = []
    for r in regions:
        if isinstance(r, dict):
            out.append(r)
    return out


def _scale_rect(
    x: float, y: float, w: float, h: float, canvas_w: float, canvas_h: float
) -> Dict[str, float]:
    sx = canvas_w / _SRC_W
    sy = canvas_h / _SRC_H
    return {
        "x": round(x * sx, 2),
        "y": round(y * sy, 2),
        "w": round(w * sx, 2),
        "h": round(h * sy, 2),
    }


def _union_rects(rects: List[Dict[str, float]]) -> Optional[Dict[str, float]]:
    if not rects:
        return None
    min_x = min(r["x"] for r in rects)
    min_y = min(r["y"] for r in rects)
    max_x = max(r["x"] + r["w"] for r in rects)
    max_y = max(r["y"] + r["h"] for r in rects)
    return {"x": min_x, "y": min_y, "w": max_x - min_x, "h": max_y - min_y}


def template_to_slide_design(
    template: Dict[str, Any],
    *,
    canvas_w: float = 1280,
    canvas_h: float = 720,
) -> Dict[str, Any]:
    """
    Map pptx template top-level regions to slide_design.zones (same coordinate space as layout zoning).
    """
    regions = _flatten_top_level_regions(template)
    by_id = {str(r.get("id")): r for r in regions if r.get("id")}

    margin = {"top": 40, "right": 40, "bottom": 30, "left": 40}
    zones: Dict[str, Dict[str, float]] = {}

    def pick_scaled(rid: str) -> Optional[Dict[str, float]]:
        r = by_id.get(rid)
        if not r:
            return None
        return _scale_rect(
            float(r.get("x", 0)),
            float(r.get("y", 0)),
            float(r.get("w", 0)),
            float(r.get("h", 0)),
            canvas_w,
            canvas_h,
        )

    t = pick_scaled("title")
    if t:
        zones["title"] = t

    sub = pick_scaled("subtitle") or pick_scaled("subtitle_band")
    if sub:
        zones["subtitle"] = sub

    footers = []
    for r in regions:
        rid = str(r.get("id") or "")
        if rid.startswith("footer_"):
            footers.append(
                _scale_rect(
                    float(r.get("x", 0)),
                    float(r.get("y", 0)),
                    float(r.get("w", 0)),
                    float(r.get("h", 0)),
                    canvas_w,
                    canvas_h,
                )
            )
    footer_u = _union_rects(footers)
    if footer_u:
        zones["footer"] = footer_u

    # Optional side / insight rail (common in chart templates)
    for cand in ("insight_rail", "side"):
        s = pick_scaled(cand)
        if s:
            zones["side"] = s
            break

    excluded_ids = {
        "title",
        "subtitle",
        "subtitle_band",
        "cta",
    }
    body_parts: List[Dict[str, float]] = []
    for r in regions:
        rid = str(r.get("id") or "")
        if rid in excluded_ids:
            continue
        if rid.startswith("footer_"):
            continue
        if rid.startswith("label_"):
            continue
        kind = str(r.get("kind") or "")
        if rid in ("insight_rail", "side") and "side" in zones:
            continue
        # Decorative / empty chrome optional — still include for body union
        body_parts.append(
            _scale_rect(
                float(r.get("x", 0)),
                float(r.get("y", 0)),
                float(r.get("w", 0)),
                float(r.get("h", 0)),
                canvas_w,
                canvas_h,
            )
        )

    body_u = _union_rects(body_parts)
    if body_u:
        zones["body"] = body_u
    else:
        zones["body"] = {"x": 40, "y": 120, "w": 1200, "h": 560}

    return {"margin": margin, "zones": zones}


def select_pptx_template_for_slide(
    slide: Dict[str, Any],
    problem_statement: str,
    storyline: List[str],
) -> Dict[str, Any]:
    """
    Deterministic template pick: token overlap on use_case, name, id, and slide signals.
    Returns a full template dict (must include 'id', 'name', 'regions').
    """
    if not PPTX_TEMPLATES:
        return {
            "id": "custom_layout",
            "name": "Fallback",
            "regions": [],
            "use_case": [],
        }

    query_bits: List[str] = [
        problem_statement or "",
        slide.get("title") or "",
        slide.get("slide_archetype") or "",
        slide.get("visualization") or "",
    ]
    query_bits.extend(storyline or [])
    for sec in (slide.get("sections") or [])[:8]:
        if not isinstance(sec, dict):
            continue
        query_bits.append(sec.get("title") or "")
        c = sec.get("content")
        if isinstance(c, list):
            query_bits.extend([str(x) for x in c[:4]])
        else:
            query_bits.append(str(c or ""))
        query_bits.extend(sec.get("charts") or [])
        query_bits.extend(sec.get("frameworks") or [])
        query_bits.extend(sec.get("infographics") or [])

    qset = _tokenize_text(" ".join([str(x) for x in query_bits if x is not None]))
    scored: List[Tuple[float, Dict[str, Any]]] = []

    viz = str(slide.get("visualization") or "").lower()

    for t in PPTX_TEMPLATES:
        if not isinstance(t, dict):
            continue
        tid = str(t.get("id") or "")
        name = str(t.get("name") or "")
        use_cases = t.get("use_case") or []
        if not isinstance(use_cases, list):
            use_cases = []

        tset = _tokenize_text(tid)
        tset |= _tokenize_text(name)
        tset |= _tokenize_text(" ".join([str(x) for x in use_cases]))

        overlap = len(qset.intersection(tset))
        bonus = 0.0
        # Strong nudges from visualization string
        if viz:
            if "bar" in viz and "bar_chart" in tid:
                bonus += 4
            if "waterfall" in viz and "waterfall" in tid:
                bonus += 4
            if ("line" in viz or "trend" in viz) and "line_chart" in tid:
                bonus += 4
            if "heat" in viz and "heatmap" in tid:
                bonus += 4
            if "swot" in qset and "swot" in tid:
                bonus += 5
            if "stakeholder" in qset and "stakeholder" in tid:
                bonus += 5
            if ("executive" in qset or "summary" in qset) and "executive_summary" in tid:
                bonus += 3

        score = overlap + bonus
        scored.append((score, t))

    scored.sort(key=lambda x: x[0], reverse=True)
    best = scored[0][1] if scored else PPTX_TEMPLATES[0]
    return best


def apply_pptx_template_to_slide(
    slide: Dict[str, Any],
    problem_statement: str,
    storyline: List[str],
) -> Dict[str, Any]:
    """
    Pick template, attach ids to slide, return slide_design dict for layout zoning (fixed geometry).
    """
    tmpl = select_pptx_template_for_slide(slide, problem_statement, storyline)
    tid = str(tmpl.get("id") or "custom_layout")
    slide["pptx_template_id"] = tid
    slide["pptx_template_name"] = tmpl.get("name")
    sd = template_to_slide_design(tmpl)
    slide["slide_design"] = sd
    return sd
