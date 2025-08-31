/**
 * ThreadsAutomationAgent
 * Real Threads automation using Stagehand for browser control
 */

import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";
import { Logger } from "../utils/Logger";
import { NodeHumanizationProfile, HumanizationConfig } from "../automation/NodeHumanizationProfile";

// Schema for extracting Threads posts
const ThreadsPostSchema = z.object({
  id: z.string().optional(),
  text: z.string(),
  author: z.object({
    handle: z.string(),
    displayName: z.string().optional(),
    avatarUrl: z.string().optional(),
    isVerified: z.boolean().optional()
  }),
  timestamp: z.string().optional(),
  metrics: z.object({
    likes: z.number().optional(),
    replies: z.number().optional(),
    reposts: z.number().optional(),
    views: z.number().optional()
  }).optional(),
  url: z.string().optional(),
  media: z.array(z.string()).optional(),
  hashtags: z.array(z.string()).optional()
});

const ThreadsSearchResultsSchema = z.object({
  posts: z.array(ThreadsPostSchema)
});

export interface ThreadsSession {
  cookies: any[];
  userAgent: string;
  accountId: string;
}

export interface ThreadsAgentConfig {
  session?: ThreadsSession;
  humanization?: HumanizationConfig;
  headless?: boolean;
  env?: "LOCAL" | "BROWSERBASE";
}

export class ThreadsAutomationAgent {
  private stagehand: Stagehand | null = null;
  private logger: Logger;
  private session?: ThreadsSession;
  private humanization?: NodeHumanizationProfile;
  private config: ThreadsAgentConfig;
  private isLoggedIn: boolean = false;

  constructor(config: ThreadsAgentConfig = {}) {
    this.logger = new Logger("ThreadsAutomationAgent");
    this.config = config;
    this.session = config.session;
    
    if (config.humanization) {
      this.humanization = new NodeHumanizationProfile(config.humanization);
    }
  }

  /**
   * Initialize the automation agent
   */
  async initialize(): Promise<void> {
    this.logger.info("Initializing Threads automation agent");

    try {
      // Create Stagehand instance with configuration
      this.stagehand = new Stagehand({
        env: this.config.env || "BROWSERBASE",
        headless: this.config.headless !== false,
        enableCaching: true,
        modelName: "gpt-4o-mini", // Cost-optimized model
        modelClientOptions: {
          apiKey: process.env.OPENAI_API_KEY
        }
      });

      await this.stagehand.init();
      
      this.logger.info(`Browser session initialized: ${this.stagehand.browserbaseSessionID}`);
      
      // If we have a session, restore it
      if (this.session && this.session.cookies) {
        await this.restoreSession();
      }
    } catch (error) {
      this.logger.error("Failed to initialize agent", error as Error);
      throw error;
    }
  }

  /**
   * Restore a previous session using cookies
   */
  private async restoreSession(): Promise<void> {
    if (!this.stagehand || !this.session) return;

    this.logger.info("Restoring previous session");
    
    try {
      const page = this.stagehand.page;
      
      // Set cookies
      await page.context().addCookies(this.session.cookies);
      
      // Navigate to Threads
      await page.goto("https://www.threads.net", { waitUntil: "networkidle" });
      
      // Check if we're logged in
      const loginCheck = await page.observe({
        instruction: "Check if the user is logged in by looking for profile menu or compose button"
      });
      
      if (loginCheck.includes("logged in") || loginCheck.includes("profile")) {
        this.isLoggedIn = true;
        this.logger.info("Session restored successfully");
      } else {
        this.logger.warn("Session restore failed, login required");
        this.isLoggedIn = false;
      }
    } catch (error) {
      this.logger.error("Failed to restore session", error as Error);
      this.isLoggedIn = false;
    }
  }

  /**
   * Login to Threads
   */
  async login(username: string, password: string): Promise<boolean> {
    if (!this.stagehand) {
      throw new Error("Agent not initialized");
    }

    this.logger.info("Attempting to login to Threads");
    
    try {
      const page = this.stagehand.page;
      
      // Navigate to Threads login
      await page.goto("https://www.threads.net/login", { waitUntil: "networkidle" });
      
      // Add human-like delay
      if (this.humanization) {
        await this.humanization.simulateDecision();
      }
      
      // Fill in login form using natural language
      await page.act({
        action: `Type "${username}" into the username or email field`
      });
      
      if (this.humanization) {
        await this.humanization.simulateTyping(username);
      }
      
      await page.act({
        action: `Type the password into the password field`
      });
      
      if (this.humanization) {
        await this.humanization.simulateTyping(password);
      }
      
      // Click login button
      await page.act({
        action: "Click the login or sign in button"
      });
      
      // Wait for navigation
      await page.waitForTimeout(5000);
      
      // Check if login was successful
      const loginResult = await page.observe({
        instruction: "Check if login was successful by looking for the home feed or profile menu"
      });
      
      if (loginResult.includes("feed") || loginResult.includes("profile")) {
        this.isLoggedIn = true;
        
        // Save cookies for session persistence
        const cookies = await page.context().cookies();
        this.session = {
          cookies,
          userAgent: await page.evaluate(() => navigator.userAgent),
          accountId: username
        };
        
        this.logger.info("Login successful");
        return true;
      } else {
        this.logger.error("Login failed");
        return false;
      }
    } catch (error) {
      this.logger.error("Login error", error as Error);
      return false;
    }
  }

  /**
   * Search for posts on Threads
   */
  async searchPosts(keywords: string[]): Promise<any[]> {
    if (!this.stagehand) {
      throw new Error("Agent not initialized");
    }

    if (!this.isLoggedIn) {
      throw new Error("Not logged in to Threads");
    }

    this.logger.info("Searching for posts", { keywords });
    
    try {
      const page = this.stagehand.page;
      const searchQuery = keywords.join(" ");
      
      // Navigate to search or use search bar
      await page.act({
        action: "Click on the search icon or search bar"
      });
      
      // Add human-like delay
      if (this.humanization) {
        await this.humanization.simulateDecision();
      }
      
      // Type search query
      await page.act({
        action: `Type "${searchQuery}" in the search field`
      });
      
      if (this.humanization) {
        await this.humanization.simulateTyping(searchQuery);
      }
      
      // Press enter or click search
      await page.act({
        action: "Press Enter or click the search button"
      });
      
      // Wait for results to load
      await page.waitForTimeout(3000);
      
      // Scroll to load more results
      if (this.humanization) {
        await this.humanization.simulateScrollBehavior();
      } else {
        await page.evaluate(() => window.scrollBy(0, 500));
      }
      
      // Extract posts using Stagehand's AI extraction
      const results = await page.extract({
        instruction: `Extract all visible posts from the search results. For each post, get the author's handle and display name, the post text content, number of likes, replies, reposts if visible, and any hashtags used.`,
        schema: ThreadsSearchResultsSchema
      });
      
      this.logger.info(`Found ${results.posts.length} posts`);
      
      // Take screenshot for verification
      const screenshotPath = `/tmp/threads-search-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath });
      this.logger.info(`Screenshot saved: ${screenshotPath}`);
      
      return results.posts;
    } catch (error) {
      this.logger.error("Search failed", error as Error);
      throw error;
    }
  }

  /**
   * Extract a specific post's details
   */
  async extractPost(postUrl: string): Promise<any> {
    if (!this.stagehand) {
      throw new Error("Agent not initialized");
    }

    this.logger.info("Extracting post details", { postUrl });
    
    try {
      const page = this.stagehand.page;
      
      // Navigate to the post
      await page.goto(postUrl, { waitUntil: "networkidle" });
      
      // Add human-like delay
      if (this.humanization) {
        await this.humanization.simulateDwell();
      }
      
      // Extract post details
      const postDetails = await page.extract({
        instruction: "Extract the main post details including author information, post content, engagement metrics, and any replies",
        schema: ThreadsPostSchema
      });
      
      // Take screenshot
      const screenshotPath = `/tmp/threads-post-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath });
      this.logger.info(`Screenshot saved: ${screenshotPath}`);
      
      return postDetails;
    } catch (error) {
      this.logger.error("Failed to extract post", error as Error);
      throw error;
    }
  }

  /**
   * Perform human-like browsing to avoid detection
   */
  async performHumanBehavior(): Promise<void> {
    if (!this.stagehand || !this.humanization) return;

    this.logger.info("Performing human-like behavior");
    
    try {
      const page = this.stagehand.page;
      
      // Random browsing actions
      const actions = [
        "Scroll down slowly to view more content",
        "Click on a random post to view details",
        "Go back to the home feed",
        "Click on a trending topic"
      ];
      
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      
      await page.act({ action: randomAction });
      
      // Human-like delays and movements
      await this.humanization.simulateMouseMovement();
      await this.humanization.simulateDwell();
      
      // Random chance to take a break
      if (Math.random() < 0.2) {
        await this.humanization.takeBreak();
      }
    } catch (error) {
      this.logger.warn("Human behavior simulation failed", error as Error);
    }
  }

  /**
   * Get current session for persistence
   */
  async getCurrentSession(): Promise<ThreadsSession | null> {
    if (!this.stagehand || !this.isLoggedIn) return null;

    try {
      const page = this.stagehand.page;
      const cookies = await page.context().cookies();
      const userAgent = await page.evaluate(() => navigator.userAgent);
      
      return {
        cookies,
        userAgent,
        accountId: this.session?.accountId || "unknown"
      };
    } catch (error) {
      this.logger.error("Failed to get session", error as Error);
      return null;
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    this.logger.info("Cleaning up Threads automation agent");
    
    if (this.stagehand) {
      await this.stagehand.close();
      this.stagehand = null;
    }
    
    this.isLoggedIn = false;
  }

  /**
   * Check if agent is active
   */
  isActive(): boolean {
    return this.stagehand !== null && this.isLoggedIn;
  }
}