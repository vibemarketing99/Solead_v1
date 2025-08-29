import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";

async function main() {
  console.log("Starting Stagehand test...");
  console.log("BrowserBase API Key:", process.env.BROWSERBASE_API_KEY ? "✓ Set" : "✗ Missing");
  console.log("BrowserBase Project ID:", process.env.BROWSERBASE_PROJECT_ID ? "✓ Set" : "✗ Missing");
  console.log("OpenAI API Key:", process.env.OPENAI_API_KEY ? "✓ Set" : "✗ Missing");

  // Try running with local environment if BrowserBase isn't fully configured
  const config = process.env.BROWSERBASE_PROJECT_ID ? 
    { env: "BROWSERBASE" as const } : 
    { env: "LOCAL" as const };

  console.log(`\nUsing environment: ${config.env}`);

  try {
    const stagehand = new Stagehand(config);
    await stagehand.init();
    
    console.log("\n✅ Stagehand initialized successfully!");
    
    if (config.env === "BROWSERBASE") {
      console.log(`Watch live: https://browserbase.com/sessions/${stagehand.browserbaseSessionID}`);
    }

    // Simple navigation test
    const page = stagehand.page;
    await page.goto("https://example.com");
    console.log("\n✅ Successfully navigated to example.com");

    const title = await page.title();
    console.log(`Page title: ${title}`);

    await stagehand.close();
    console.log("\n✅ Browser closed successfully");
  } catch (error) {
    console.error("\n❌ Error:", error);
    console.log("\nTroubleshooting tips:");
    console.log("1. Make sure all required API keys are set in .env");
    console.log("2. For BrowserBase, you need both PROJECT_ID and API_KEY");
    console.log("3. For LOCAL mode, you still need an OpenAI API key for AI features");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});