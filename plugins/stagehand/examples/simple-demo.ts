import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";

/**
 * Simple demo showing Stagehand's core AI capabilities
 */

async function main() {
  console.log("🚀 Starting Stagehand Demo\n");
  
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    headless: false,
  });

  try {
    await stagehand.init();
    
    console.log(`📺 Watch your browser automation live at:`);
    console.log(`   https://browserbase.com/sessions/${stagehand.browserbaseSessionID}\n`);
    
    const page = stagehand.page;

    // 1. Navigate to a website
    console.log("Step 1: Navigating to Hacker News...");
    await page.goto("https://news.ycombinator.com");
    await page.waitForTimeout(2000);
    
    // 2. Extract information using AI
    console.log("\nStep 2: Extracting top stories using AI...\n");
    const topStories = await page.extract(
      "Get the titles of the top 5 stories on this page"
    );
    
    console.log("📰 Top Stories on Hacker News:");
    console.log("-".repeat(40));
    console.log(topStories);
    
    // 3. Perform an action using natural language
    console.log("\n\nStep 3: Clicking on 'new' link using AI...");
    const clickResult = await page.act("Click on the 'new' link in the navigation");
    
    if (clickResult.success) {
      console.log("✅ Successfully navigated to New stories!");
      await page.waitForTimeout(2000);
    } else {
      console.log("⚠️  Could not click the link");
    }
    
    // 4. Observe the page
    console.log("\nStep 4: Observing what's on the page...\n");
    const observation = await page.observe(
      "What type of content is shown on this page? Give a brief description."
    );
    
    console.log("👁️  Page Observation:");
    console.log("-".repeat(40));
    console.log(observation);
    
    // 5. Use an agent for complex reasoning
    console.log("\n\nStep 5: Using AI Agent for analysis...\n");
    const agent = stagehand.agent({
      instructions: "You are a tech trends analyzer. Be concise and insightful.",
    });

    const analysis = await agent.execute(
      "Based on the stories you see, what seems to be the main topic of discussion in the tech community today? Give me 2-3 bullet points."
    );
    
    console.log("🤖 AI Agent Analysis:");
    console.log("-".repeat(40));
    console.log(analysis);
    
    console.log("\n\n✨ Demo completed successfully!");
    console.log("Check the BrowserBase session URL above to replay what happened!");
    
  } catch (error) {
    console.error("\n❌ Error:", error);
    
    if (error.message?.includes('API key')) {
      console.log("\n⚠️  API Key Issue Detected:");
      console.log("- Make sure your OpenAI API key is valid");
      console.log("- Check that your OpenAI account has available credits");
    }
  } finally {
    await stagehand.close();
    console.log("\n👋 Session ended");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});