import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const CONFIG_DIR = path.join(os.homedir(), ".visionqa");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

interface VisionQAConfig {
  apiKey: string;
  serverUrl: string;
}

function readConfig(): VisionQAConfig {
  const defaults: VisionQAConfig = {
    apiKey: "",
    serverUrl: "ws://localhost:8000/ws",
  };

  if (!fs.existsSync(CONFIG_FILE)) {
    return defaults;
  }

  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

function writeConfig(config: Partial<VisionQAConfig>): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  const current = readConfig();
  const merged = { ...current, ...config };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2));
}

export function getApiKey(): string {
  return readConfig().apiKey;
}

export function setApiKey(key: string): void {
  writeConfig({ apiKey: key });
}

export function getServerUrl(): string {
  return readConfig().serverUrl;
}

export function setServerUrl(url: string): void {
  writeConfig({ serverUrl: url });
}
