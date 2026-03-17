"""Orchestrator Agent — coordinates all agents in sequential pipeline."""

from backend.services import firestore
from backend.agents import site_structure, visual_ui, test_generator, execution, report


async def run_orchestrator(session_id: str) -> None:
    """Execute the full VisionQA pipeline for a session.

    Pipeline: SiteStructure → VisualUI → TestGeneration → Execution → Report
    """
    try:
        session = await firestore.get_session(session_id)
        if not session:
            return

        url = session["url"]
        prompt = session["prompt"]
        user_id = session["user_id"]

        # Phase 1: Site Structure Discovery
        structure = await site_structure.run(session_id, url)

        # Phase 2: Visual UI Analysis
        ui_analyses = await visual_ui.run(session_id, structure)

        # Phase 3: Test Case Generation
        test_cases = await test_generator.generate_tests(
            session_id=session_id,
            url=url,
            prompt=prompt,
            site_structure=structure,
            ui_analyses=ui_analyses,
        )

        # Phase 4: Test Execution (via CLI runner)
        test_results = await execution.run(session_id, user_id, test_cases)

        # Phase 5: Report Generation
        await report.run(session_id, url, prompt, test_results)

    except Exception as e:
        import traceback
        traceback.print_exc()
        # Mark session as failed with error info
        await firestore.update_session(
            session_id,
            status="failed",
            error=str(e),
        )
        raise e
