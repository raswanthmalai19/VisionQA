import { chromium, Browser, Page } from "playwright";
import { sendResult } from "./websocket.js";
import { captureScreenshot } from "./screenshot.js";

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
  }
  return browser;
}

interface TestStep {
  action: string;
  target?: string | null;
  value?: string | null;
}

interface TestTask {
  session_id: string;
  test_id: string;
  name: string;
  steps: TestStep[];
  expected_result: string;
}

export async function executeTest(task: TestTask): Promise<void> {
  console.log(`\n  Running: ${task.name}`);
  const screenshots: string[] = [];
  let page: Page | null = null;

  try {
    const b = await getBrowser();
    page = await b.newPage({
      viewport: { width: 1280, height: 720 },
    });

    for (const step of task.steps) {
      await executeStep(page, step, task.session_id, screenshots);
    }

    // Take a final screenshot
    const finalShot = await captureScreenshot(page, task.session_id, `${task.test_id}-final`);
    if (finalShot) screenshots.push(finalShot);

    // Test passed
    console.log(`  PASSED: ${task.name}`);
    sendResult({
      type: "result",
      session_id: task.session_id,
      test_id: task.test_id,
      status: "passed",
      screenshots,
    });
  } catch (error: any) {
    // Take error screenshot
    if (page) {
      const errShot = await captureScreenshot(page, task.session_id, `${task.test_id}-error`);
      if (errShot) screenshots.push(errShot);
    }

    console.log(`  FAILED: ${task.name} — ${error.message}`);
    sendResult({
      type: "result",
      session_id: task.session_id,
      test_id: task.test_id,
      status: "failed",
      error: error.message,
      screenshots,
    });
  } finally {
    if (page) await page.close();
  }
}

async function executeStep(
  page: Page,
  step: TestStep,
  sessionId: string,
  screenshots: string[],
): Promise<void> {
  switch (step.action) {
    case "goto":
      if (step.target) {
        await page.goto(step.target, { waitUntil: "domcontentloaded", timeout: 30000 });
      }
      break;

    case "click":
      if (step.target) {
        // Try clicking by visible text first, then by selector
        try {
          await page.getByText(step.target, { exact: false }).first().click({ timeout: 10000 });
        } catch {
          await page.click(step.target, { timeout: 10000 });
        }
      }
      break;

    case "fill":
      if (step.target && step.value) {
        try {
          await page.getByLabel(step.target, { exact: false }).first().fill(step.value);
        } catch {
          try {
            await page.getByPlaceholder(step.target, { exact: false }).first().fill(step.value);
          } catch {
            await page.fill(step.target, step.value);
          }
        }
      }
      break;

    case "screenshot": {
      const shot = await captureScreenshot(page, sessionId, `step-${Date.now()}`);
      if (shot) screenshots.push(shot);
      break;
    }

    case "assert_visible":
      if (step.target) {
        await page.getByText(step.target, { exact: false }).first().waitFor({
          state: "visible",
          timeout: 10000,
        });
      }
      break;

    case "assert_text":
      if (step.target && step.value) {
        const text = await page.locator(step.target).first().textContent();
        if (!text || !text.includes(step.value)) {
          throw new Error(`Expected text "${step.value}" not found in "${step.target}"`);
        }
      }
      break;

    case "wait":
      await page.waitForTimeout(parseInt(step.value || "1000", 10));
      break;

    default:
      console.log(`    Unknown action: ${step.action}`);
  }
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
