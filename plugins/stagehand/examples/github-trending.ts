import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";

/**
 * This example demonstrates Stagehand's AI capabilities by:
 * 1. Navigating to GitHub trending page
 * 2. Extracting trending repositories using natural language
 * 3. Interacting with the page using AI-powered actions
 */

async function main() {
  console.log("🚀 Starting GitHub Trending Explorer with Stagehand AI\n");
  
  const stagehand = new Stagehand({
    env: "BROWSERBASE", // Use cloud browser
    headless: false,    // Show browser window for demo
  });

  try {
    await stagehand.init();
    
    console.log(`📺 Watch live session at: https://browserbase.com/sessions/${stagehand.browserbaseSessionID}\n`);
    
    const page = stagehand.page;

    // Navigate to GitHub trending
    console.log("📍 Navigating to GitHub Trending page...");
    await page.goto("https://github.com/trending");
    
    // Use AI to extract trending repositories
    console.log("\n🤖 Using AI to extract trending repositories...\n");
    const trendingRepos = await page.extract({
      instruction: "Extract the top 5 trending repositories with their names, descriptions, stars today, and primary language",
      schema: {
        type: "object",
        properties: {
          repositories: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Repository name with owner" },
                description: { type: "string", description: "Repository description" },
                starsToday: { type: "string", description: "Number of stars gained today" },
                language: { type: "string", description: "Primary programming language" }
              }
            }
          }
        }
      }
    });

    console.log("📊 Top Trending Repositories Today:");
    console.log("=" .repeat(60));
    
    trendingRepos.repositories?.forEach((repo, index) => {
      console.log(`\n${index + 1}. ${repo.name}`);
      console.log(`   📝 ${repo.description || 'No description'}`);
      console.log(`   ⭐ ${repo.starsToday || 'N/A'} stars today`);
      console.log(`   💻 Language: ${repo.language || 'Not specified'}`);
    });

    // Use AI to interact with the page
    console.log("\n\n🔍 Using AI to explore filtering options...\n");
    
    const filterResult = await page.act({
      action: "Click on the language filter dropdown to see available programming languages"
    });
    
    if (filterResult.success) {
      console.log("✅ Successfully opened language filter!");
      
      // Observe what languages are available
      const languages = await page.observe({
        instruction: "What programming languages are available in the filter dropdown? List the top 10."
      });
      
      console.log("\n📋 Available Language Filters:");
      console.log(languages);
    }

    // Demonstrate the agent capability for complex tasks
    console.log("\n\n🤖 Using AI Agent for complex task...\n");
    
    const agent = stagehand.agent({
      instructions: "You are a helpful assistant that analyzes GitHub trends. Be concise and informative.",
    });

    const analysis = await agent.execute(
      "Based on what you see on this trending page, what are the main technology trends right now? Give me 3 key insights in bullet points."
    );
    
    console.log("📈 AI Agent Analysis of Current Trends:");
    console.log("=" .repeat(60));
    console.log(analysis);

    console.log("\n\n✨ Demo completed successfully!");
    
  } catch (error) {
    console.error("❌ Error occurred:", error);
    console.log("\nTroubleshooting:");
    console.log("- Check if all API keys are correctly set in .env");
    console.log("- Ensure you have internet connectivity");
    console.log("- Verify your OpenAI API key has credits available");
  } finally {
    await stagehand.close();
    console.log("\n👋 Browser session closed");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});