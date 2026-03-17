"""Test Generation Agent — generates structured test cases using Gemini."""

import json

from backend.services.gemini import generate_text
from backend.services import firestore


async def generate_tests(
    session_id: str,
    url: str,
    prompt: str,
    site_structure: dict,
    ui_analyses: list[dict],
) -> list[dict]:
    """Generate test cases based on site structure, UI analysis, and user prompt."""
    await firestore.update_session(session_id, status="generating")

    # Build context for Gemini
    pages_summary = []
    for page in site_structure.get("pages", []):
        pages_summary.append({
            "path": page.get("path"),
            "title": page.get("title"),
            "status": page.get("status"),
        })

    ui_summary = []
    for analysis in ui_analyses:
        ui_summary.append({
            "page_url": analysis.get("page_url"),
            "elements_count": len(analysis.get("elements", [])),
            "forms": analysis.get("forms", []),
            "interactive_elements": [
                e for e in analysis.get("elements", []) if e.get("interactive")
            ],
            "page_summary": analysis.get("page_summary", ""),
        })

    generation_prompt = f"""You are a Senior QA Test Engineer. Generate comprehensive end-to-end test cases for the website at {url}.

## User's Testing Objective:
{prompt}

## Discovered Site Structure:
{json.dumps(pages_summary, indent=2)}

## UI Analysis Per Page:
{json.dumps(ui_summary, indent=2)}

Generate test cases as a JSON array. Each test case must include:
- "name": descriptive test name
- "steps": array of step objects, each with:
  - "action": one of "goto", "click", "fill", "screenshot", "assert_visible", "assert_text", "wait"
  - "target": URL path (for goto), text/label of element (for click), or selector hint (for fill)
  - "value": text to type (for fill), expected text (for assert_text), or null
- "expected_result": what should happen if the test passes

Generate 5-15 test cases covering:
1. Happy path flows matching the user's objective
2. Error handling (invalid inputs, empty fields)
3. Navigation flows
4. Form submissions
5. Edge cases

Respond ONLY with a JSON array of test cases, no other text.
"""

    response_text = await generate_text(
        generation_prompt,
        system_instruction="You are a QA engineer generating test cases. Respond only with a valid JSON array.",
    )

    # Parse the response
    response_text = response_text.strip()
    if response_text.startswith("```"):
        response_text = response_text.split("\n", 1)[1].rsplit("```", 1)[0]

    try:
        test_cases = json.loads(response_text)
        if not isinstance(test_cases, list):
            test_cases = [test_cases]
    except json.JSONDecodeError:
        # Fallback: generate basic test cases
        test_cases = [
            {
                "name": f"Navigate to {page.get('path', '/')}",
                "steps": [
                    {"action": "goto", "target": page.get("url", url), "value": None},
                    {"action": "screenshot", "target": None, "value": None},
                ],
                "expected_result": f"Page {page.get('path', '/')} loads successfully",
            }
            for page in site_structure.get("pages", [])[:5]
            if page.get("status") == 200
        ]

    # Save test cases to Firestore
    saved_tests = []
    for tc in test_cases:
        saved = await firestore.create_testcase(session_id, {
            "name": tc.get("name", "Unnamed Test"),
            "steps": tc.get("steps", []),
            "expected_result": tc.get("expected_result", ""),
        })
        saved_tests.append(saved)

    return saved_tests
