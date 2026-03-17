"""Execution Agent — runs Playwright browser tests directly on the backend."""

import asyncio
import base64
import traceback

from playwright.async_api import async_playwright, Page, Browser

from backend.services import firestore
from backend.services import storage as gcs_storage
from backend.services.gemini import analyze_screenshot


async def _take_screenshot(page: Page, session_id: str, test_id: str, step_idx: int) -> str | None:
    """Capture a screenshot and upload to GCS. Returns the blob path."""
    try:
        screenshot_bytes = await page.screenshot(full_page=False)
        blob_path = f"screenshots/{session_id}/{test_id}/step_{step_idx}.png"
        await gcs_storage.upload_blob(blob_path, screenshot_bytes, "image/png")
        return blob_path
    except Exception:
        return None


async def _execute_single_test(
    page: Page, session_id: str, tc: dict, base_url: str,
) -> dict:
    """Execute a single test case using Playwright and return the result."""
    test_id = tc["test_id"]
    screenshots: list[str] = []

    try:
        await firestore.update_testcase(session_id, test_id, status="running")

        steps = tc.get("steps", [])
        for i, step in enumerate(steps):
            action = step.get("action", "")
            target = step.get("target", "")
            value = step.get("value", "")

            if action == "goto":
                url = target if target.startswith("http") else f"{base_url.rstrip('/')}{target}"
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                await page.wait_for_timeout(1000)

            elif action == "click":
                # Try multiple strategies to find the element
                clicked = False
                for selector in [
                    f"text={target}",
                    f"role=button[name='{target}']",
                    f"role=link[name='{target}']",
                    f"[aria-label='{target}']",
                    f"input[type='submit'][value='{target}']",
                    target,  # raw CSS/XPath selector
                ]:
                    try:
                        locator = page.locator(selector).first
                        if await locator.is_visible(timeout=3000):
                            await locator.click(timeout=5000)
                            clicked = True
                            break
                    except Exception:
                        continue
                if not clicked:
                    raise Exception(f"Could not find clickable element: {target}")
                await page.wait_for_timeout(800)

            elif action == "fill":
                filled = False
                for selector in [
                    f"[placeholder*='{target}' i]",
                    f"[name='{target}']",
                    f"[aria-label='{target}']",
                    f"label:has-text('{target}') + input",
                    f"label:has-text('{target}') >> .. >> input",
                    target,
                ]:
                    try:
                        locator = page.locator(selector).first
                        if await locator.is_visible(timeout=3000):
                            await locator.fill(value or "", timeout=5000)
                            filled = True
                            break
                    except Exception:
                        continue
                if not filled:
                    raise Exception(f"Could not find input field: {target}")

            elif action == "screenshot":
                shot = await _take_screenshot(page, session_id, test_id, i)
                if shot:
                    screenshots.append(shot)

            elif action == "assert_visible":
                try:
                    await page.locator(f"text={target}").first.wait_for(
                        state="visible", timeout=10000
                    )
                except Exception:
                    raise Exception(f"Expected element not visible: {target}")

            elif action == "assert_text":
                try:
                    content = await page.content()
                    if value and value.lower() not in content.lower():
                        raise Exception(
                            f"Expected text '{value}' not found on page"
                        )
                except Exception as e:
                    if "Expected text" in str(e):
                        raise
                    raise Exception(f"Could not assert text: {e}")

            elif action == "wait":
                ms = int(value) if value and value.isdigit() else 2000
                await page.wait_for_timeout(ms)

            elif action == "select":
                try:
                    await page.select_option(target, value=value, timeout=5000)
                except Exception:
                    raise Exception(f"Could not select option '{value}' in {target}")

            elif action == "hover":
                try:
                    await page.locator(f"text={target}").first.hover(timeout=5000)
                except Exception:
                    pass

        # Final screenshot after all steps
        final_shot = await _take_screenshot(page, session_id, test_id, len(steps))
        if final_shot:
            screenshots.append(final_shot)

        # If we reached here, the test passed
        await firestore.update_testcase(
            session_id, test_id,
            status="passed", screenshots=screenshots,
        )
        return {**tc, "status": "passed", "screenshots": screenshots}

    except Exception as e:
        error_msg = str(e)
        # Take error screenshot
        err_shot = await _take_screenshot(page, session_id, test_id, 999)
        if err_shot:
            screenshots.append(err_shot)

        await firestore.update_testcase(
            session_id, test_id,
            status="failed", error=error_msg, screenshots=screenshots,
        )
        return {**tc, "status": "failed", "error": error_msg, "screenshots": screenshots}


async def run(session_id: str, user_id: str, test_cases: list[dict]) -> list[dict]:
    """Execute all test cases using Playwright headless browser."""
    await firestore.update_session(session_id, status="executing")

    # Get the session URL for base URL resolution
    session = await firestore.get_session(session_id)
    base_url = session["url"] if session else ""

    results = []
    browser: Browser | None = None

    try:
        pw = await async_playwright().start()
        browser = await pw.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )

        for tc in test_cases:
            # Each test gets a fresh page (browser context)
            context = await browser.new_context(
                viewport={"width": 1280, "height": 720},
                user_agent="VisionQA-Agent/1.0",
            )
            page = await context.new_page()

            try:
                result = await _execute_single_test(page, session_id, tc, base_url)
                results.append(result)
            finally:
                await page.close()
                await context.close()

    except Exception as e:
        # If browser couldn't start, fail all remaining tests
        for tc in test_cases:
            if not any(r.get("test_id") == tc["test_id"] for r in results):
                await firestore.update_testcase(
                    session_id, tc["test_id"],
                    status="failed",
                    error=f"Browser launch failed: {e}",
                )
                results.append({**tc, "status": "failed", "error": f"Browser launch failed: {e}"})
    finally:
        if browser:
            await browser.close()

    return results
