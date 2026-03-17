"""Visual UI Agent — analyzes screenshots using Gemini Vision."""

import json

from backend.services.gemini import analyze_screenshot, generate_text
from backend.services import firestore


async def analyze_page_screenshot(image_bytes: bytes, page_url: str) -> dict:
    """Analyze a single page screenshot using Gemini Vision."""
    prompt = f"""You are a Visual QA Agent. Analyze this screenshot of the web page at {page_url}.

Identify and list all visible UI elements with their:
- type (button, input, link, text, image, form, nav, modal, dropdown, etc.)
- label or visible text
- approximate location (top, center, bottom, left, right)
- interactive: true/false

Also note any visual issues:
- overlapping elements
- text overflow or truncation
- misaligned layout
- broken images
- accessibility concerns (low contrast, missing labels)

Respond with a JSON object:
{{
  "page_url": "{page_url}",
  "elements": [
    {{"type": "button", "label": "Submit", "location": "bottom-center", "interactive": true}},
    ...
  ],
  "visual_issues": [
    {{"type": "overlap", "description": "...", "severity": "high|medium|low"}},
    ...
  ],
  "page_summary": "Brief description of what this page is for"
}}
"""
    response_text = await analyze_screenshot(image_bytes, prompt)

    # Parse JSON from response
    response_text = response_text.strip()
    if response_text.startswith("```"):
        response_text = response_text.split("\n", 1)[1].rsplit("```", 1)[0]

    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        return {
            "page_url": page_url,
            "elements": [],
            "visual_issues": [],
            "page_summary": response_text[:500],
            "parse_error": True,
        }


async def analyze_page_from_html(html_content: str, page_url: str) -> dict:
    """Fallback: analyze a page from its HTML when no screenshot is available."""
    prompt = f"""You are a Visual QA Agent. Based on the HTML below for {page_url}, identify all major UI elements:

{html_content[:8000]}

Respond with a JSON object:
{{
  "page_url": "{page_url}",
  "elements": [
    {{"type": "button", "label": "...", "selector_hint": "...", "interactive": true}},
    ...
  ],
  "forms": [
    {{"action": "...", "fields": ["email", "password"]}},
    ...
  ],
  "page_summary": "Brief description"
}}
"""
    response_text = await generate_text(
        prompt,
        system_instruction="You are a QA engineer. Respond only with valid JSON.",
    )

    response_text = response_text.strip()
    if response_text.startswith("```"):
        response_text = response_text.split("\n", 1)[1].rsplit("```", 1)[0]

    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        return {
            "page_url": page_url,
            "elements": [],
            "forms": [],
            "page_summary": response_text[:500],
            "parse_error": True,
        }


async def run(session_id: str, site_structure: dict) -> list[dict]:
    """Run visual UI analysis on all discovered pages of a session."""
    await firestore.update_session(session_id, status="analyzing")

    ui_analyses = []

    for page in site_structure.get("pages", []):
        page_url = page.get("url", "")
        if page.get("status") != 200:
            continue

        # For now, use HTML-based analysis. Screenshots come from CLI runner.
        import httpx
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(page_url)
                if resp.status_code == 200:
                    analysis = await analyze_page_from_html(resp.text, page_url)
                    ui_analyses.append(analysis)
        except httpx.RequestError:
            ui_analyses.append({
                "page_url": page_url,
                "elements": [],
                "error": "Failed to fetch page for analysis",
            })

    return ui_analyses
