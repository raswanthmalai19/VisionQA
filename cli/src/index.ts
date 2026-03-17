import { Command } from "commander";
import { setApiKey, getApiKey, setServerUrl, getServerUrl } from "./config.js";
import { connect, setTaskHandler, disconnect } from "./websocket.js";
import { executeTest, closeBrowser } from "./executor.js";

const program = new Command();

program
  .name("visionqa")
  .description("VisionQA CLI Runner — executes visual UI tests")
  .version("0.1.0");

program
  .command("connect")
  .description("Configure API key and server connection")
  .requiredOption("--api-key <key>", "Your VisionQA API key")
  .option("--server <url>", "WebSocket server URL", "ws://localhost:8000/ws")
  .action((opts: { apiKey: string; server: string }) => {
    setApiKey(opts.apiKey);
    setServerUrl(opts.server);
    console.log("Configuration saved.");
    console.log(`  API Key: ${opts.apiKey.substring(0, 20)}...`);
    console.log(`  Server:  ${opts.server}`);
    console.log("\nRun 'visionqa run' to start listening for test tasks.");
  });

program
  .command("status")
  .description("Show current configuration")
  .action(() => {
    const apiKey = getApiKey();
    const serverUrl = getServerUrl();
    console.log("VisionQA CLI Status:");
    console.log(`  API Key:    ${apiKey ? apiKey.substring(0, 20) + "..." : "Not configured"}`);
    console.log(`  Server:     ${serverUrl}`);
  });

program
  .command("run")
  .description("Start listening for test tasks from VisionQA server")
  .action(async () => {
    console.log("VisionQA Runner starting...\n");

    const apiKey = getApiKey();
    if (!apiKey) {
      console.error("No API key configured. Run: visionqa connect --api-key <key>");
      process.exit(1);
    }

    // Set up task handler
    setTaskHandler(async (task: any) => {
      if (task.type === "task") {
        await executeTest(task);
      }
    });

    try {
      await connect();
      console.log("Waiting for test tasks...\n");

      // Keep process alive
      process.on("SIGINT", async () => {
        console.log("\nShutting down...");
        disconnect();
        await closeBrowser();
        process.exit(0);
      });

    } catch (error: any) {
      console.error("Failed to connect:", error.message);
      process.exit(1);
    }
  });

program.parse();
