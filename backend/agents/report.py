"""Report Agent — generates comprehensive QA reports using Gemini."""

import json

from backend.services.gemini import generate_text
from backend.services import firestore


async def generate_report(
    session_id: str,
    url: str,
    prompt: str,
    test_results: list[dict],
) -> dict:
    """Generate a comprehensive QA report from test execution results."""
    await firestore.update_session(session_id, status="reporting")

    passed = [r for r in test_results if r.get("status") == "passed"]
    failed = [r for r in test_results if r.get("status") == "failed"]

    # Build report data
    failures = []
    for f in failed:
        failures.append({
            "test_id": f.get("test_id", ""),
            "test_name": f.get("name", "Unknown"),
            "page": f.get("steps", [{}])[0].get("target", "unknown") if f.get("steps") else "unknown",
            "issue": f.get("error", "Test failed"),
            "screenshot_url": f.get("screenshots", [None])[0] if f.get("screenshots") else None,
        })

    report_data = {
        "total_tests": len(test_results),
        "passed": len(passed),
        "failed": len(failed),
        "failures": failures,
    }

    # Use Gemini to generate an executive summary
    summary_prompt = f"""You are a Senior QA Manager generating an executive summary.

Website tested: {url}
Testing objective: {prompt}
Total tests: {report_data['total_tests']}
Passed: {report_data['passed']}
Failed: {report_data['failed']}

Failed test details:
{json.dumps(failures, indent=2)}

Generate a JSON object with:
- "executive_summary": 3-5 sentence overview of test results
- "risk_assessment": "low" | "medium" | "high" | "critical"
- "recommendations": array of 3-5 actionable recommendations
- "priority_fixes": array of the most critical failures to fix first
"""

    try:
        summary_text = await generate_text(
            summary_prompt,
            system_instruction="You are a QA manager. Respond only with valid JSON.",
        )
        summary_text = summary_text.strip()
        if summary_text.startswith("```"):
            summary_text = summary_text.split("\n", 1)[1].rsplit("```", 1)[0]
        analysis = json.loads(summary_text)
        report_data["analysis"] = analysis
    except (json.JSONDecodeError, Exception):
        report_data["analysis"] = {
            "executive_summary": f"Testing completed with {report_data['passed']}/{report_data['total_tests']} tests passing.",
            "risk_assessment": "high" if report_data["failed"] > report_data["passed"] else "medium",
            "recommendations": ["Review and fix failing test cases."],
            "priority_fixes": [f["test_name"] for f in failures[:3]],
        }

    # Save report to Firestore
    await firestore.create_report(session_id, report_data)
    await firestore.update_session(session_id, status="completed")

    return report_data


async def run(
    session_id: str,
    url: str,
    prompt: str,
    test_results: list[dict],
) -> dict:
    """Execute the Report Agent for a session."""
    return await generate_report(session_id, url, prompt, test_results)
