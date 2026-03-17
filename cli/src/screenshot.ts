import { Page } from "playwright";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const SCREENSHOTS_DIR = path.join(os.tmpdir(), "visionqa-screenshots");

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

export async function captureScreenshot(
  page: Page,
  sessionId: string,
  label: string,
): Promise<string | null> {
  try {
    const sessionDir = path.join(SCREENSHOTS_DIR, sessionId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const filename = `${label}-${Date.now()}.png`;
    const filepath = path.join(sessionDir, filename);
    await page.screenshot({ path: filepath, fullPage: true });

    // For now, return the local file path.
    // In production, this would upload to Cloud Storage and return a signed URL.
    return filepath;
  } catch (error) {
    console.error("Screenshot capture failed:", error);
    return null;
  }
}
