import WebSocket from "ws";
import { getApiKey, getServerUrl } from "./config.js";

type MessageHandler = (data: any) => void;

let ws: WebSocket | null = null;
let onTaskHandler: MessageHandler | null = null;

export function setTaskHandler(handler: MessageHandler): void {
  onTaskHandler = handler;
}

export function connect(): Promise<void> {
  return new Promise((resolve, reject) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      reject(new Error("No API key configured. Run: visionqa connect --api-key <key>"));
      return;
    }

    const serverUrl = getServerUrl();
    const url = `${serverUrl}?api_key=${encodeURIComponent(apiKey)}`;

    ws = new WebSocket(url);

    ws.on("open", () => {
      console.log("Connected to VisionQA server");
      resolve();
    });

    ws.on("message", (raw: WebSocket.RawData) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.type === "task" && onTaskHandler) {
          onTaskHandler(data);
        }
      } catch (e) {
        console.error("Failed to parse message:", e);
      }
    });

    ws.on("close", (code: number, reason: Buffer) => {
      console.log(`Disconnected: ${code} ${reason.toString()}`);
      ws = null;
    });

    ws.on("error", (err: Error) => {
      console.error("WebSocket error:", err.message);
      reject(err);
    });
  });
}

export function sendResult(result: {
  type: "result";
  session_id: string;
  test_id: string;
  status: "passed" | "failed";
  error?: string;
  screenshots: string[];
}): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(result));
  } else {
    console.error("WebSocket not connected. Cannot send result.");
  }
}

export function isConnected(): boolean {
  return ws !== null && ws.readyState === WebSocket.OPEN;
}

export function disconnect(): void {
  if (ws) {
    ws.close();
    ws = null;
  }
}
