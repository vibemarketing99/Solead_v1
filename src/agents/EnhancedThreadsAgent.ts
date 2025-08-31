/**
 * Enhanced Threads Automation Agent
 * Advanced browser automation with AI-powered anti-detection and caching
 */

import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";
import { Logger } from "../utils/Logger";
import { NodeHumanizationProfile, HumanizationConfig } from "../automation/NodeHumanizationProfile";
import { MediaCapture } from "../services/MediaCapture";

// Enhanced schema for Threads posts with better data extraction
const ThreadsPostSchema = z.object({
  id: z.string().optional(),
  url: z.string().optional(),
  text: z.string(),
  author: z.object({
    handle: z.string(),
    displayName: z.string().optional(),
    avatarUrl: z.string().optional(),
    isVerified: z.boolean().optional(),
    followerCount: z.number().optional(),
    bio: z.string().optional()
  }),
  timestamp: z.string().optional(),
  metrics: z.object({
    likes: z.number().optional(),
    replies: z.number().optional(),
    reposts: z.number().optional(),
    views: z.number().optional()
  }).optional(),
  content: z.object({
    hashtags: z.array(z.string()).optional(),
    mentions: z.array(z.string()).optional(),
    links: z.array(z.string()).optional(),
    hasImage: z.boolean().optional(),
    hasVideo: z.boolean().optional()
  }).optional(),
  engagement: z.object({
    engagementRate: z.number().optional(),
    isViral: z.boolean().optional(),
    sentiment: z.string().optional()
  }).optional()
});

const ThreadsSearchResultsSchema = z.object({
  posts: z.array(ThreadsPostSchema),
  hasMoreResults: z.boolean().optional(),
  searchQuery: z.string().optional(),
  totalFound: z.number().optional()
});

export interface EnhancedAgentConfig {
  session?: {
    cookies: any[];
    userAgent: string;
    accountId: string;
  };
  humanization?: HumanizationConfig;
  headless?: boolean;
  env?: "LOCAL" | "BROWSERBASE";
  caching?: {
    enabled: boolean;
    ttl?: number; // Cache TTL in milliseconds
    maxSize?: number; // Max cache entries
  };
  antiDetection?: {
    enabled: boolean;
    rotateViewport: boolean;
    randomDelays: boolean;
    mouseMovements: boolean;
    scrollPatterns: boolean;
  };
  monitoring?: {
    captureScreenshots: boolean;
    logMetrics: boolean;
    detectBlocking: boolean;
  };
}

export interface SearchOptions {
  keywords: string[];
  maxResults?: number;
  searchDepth?: 'shallow' | 'standard' | 'deep';
  timeRange?: 'hour' | 'day' | 'week' | 'month';
  sortBy?: 'recent' | 'popular' | 'relevant';
  includeReplies?: boolean;
}

export interface CachedResult {
  data: any;
  timestamp: number;
  ttl: number;
  searchQuery: string;
}

export class EnhancedThreadsAgent {
  private stagehand: Stagehand | null = null;
  private logger: Logger;
  private session?: any;
  private humanization?: NodeHumanizationProfile;
  private config: EnhancedAgentConfig;
  private mediaCapture: MediaCapture;
  private cache: Map<string, CachedResult> = new Map();
  private metrics: {
    requestCount: number;
    successCount: number;
    errorCount: number;
    averageResponseTime: number;
    lastActivity: Date;
    blockedCount: number;
  };

  constructor(config: EnhancedAgentConfig = {}) {
    this.logger = new Logger("EnhancedThreadsAgent");
    this.config = {
      headless: true,
      env: "BROWSERBASE",
      caching: { enabled: true, ttl: 300000, maxSize: 1000 }, // 5min cache
      antiDetection: { 
        enabled: true, 
        rotateViewport: true, 
        randomDelays: true,
        mouseMovements: true,
        scrollPatterns: true
      },
      monitoring: {
        captureScreenshots: true,
        logMetrics: true,
        detectBlocking: true
      },
      ...config
    };
    
    this.session = config.session;
    this.mediaCapture = new MediaCapture();
    this.metrics = {
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      lastActivity: new Date(),
      blockedCount: 0
    };
    
    if (config.humanization) {
      this.humanization = new NodeHumanizationProfile(config.humanization);
    }
  }

  /**
   * Initialize the enhanced agent with anti-detection measures
   */
  async initialize(): Promise<void> {
    const startTime = Date.now();
    this.logger.info("Initializing enhanced Threads automation agent");

    try {
      // Create Stagehand with enhanced configuration
      this.stagehand = new Stagehand({
        env: this.config.env || "BROWSERBASE",
        headless: this.config.headless !== false,
        enableCaching: true,
        modelName: "gpt-4o-mini",
        modelClientOptions: {
          apiKey: process.env.OPENAI_API_KEY
        },
        browserOptions: {
          args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-features=VizDisplayCompositor',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
            '--disable-ipc-flooding-protection'
          ]
        }
      });

      await this.stagehand.init();
      
      // Apply anti-detection measures
      await this.setupAntiDetection();
      
      // Restore session if available
      if (this.session?.cookies) {
        await this.restoreSession();
      }
      
      const initTime = Date.now() - startTime;
      this.logger.info(`Enhanced agent initialized in ${initTime}ms`, {
        sessionId: this.stagehand.browserbaseSessionID
      });
      
    } catch (error) {
      this.metrics.errorCount++;
      this.logger.error("Failed to initialize enhanced agent", error as Error);
      throw error;
    }
  }

  /**
   * Setup advanced anti-detection measures
   */
  private async setupAntiDetection(): Promise<void> {
    if (!this.stagehand || !this.config.antiDetection?.enabled) return;

    const page = this.stagehand.page;
    
    try {
      // Remove webdriver property
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });
      });

      // Randomize viewport if enabled
      if (this.config.antiDetection.rotateViewport) {
        const viewports = [
          { width: 1920, height: 1080 },
          { width: 1366, height: 768 },
          { width: 1440, height: 900 },
          { width: 1280, height: 720 },
        ];
        const viewport = viewports[Math.floor(Math.random() * viewports.length)];
        await page.setViewportSize(viewport);
      }

      // Set realistic user agent
      const userAgents = [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ];
      const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
      await page.setUserAgent(userAgent);

      // Spoof permissions
      await page.context().grantPermissions(['geolocation', 'notifications']);

      this.logger.info("Anti-detection measures configured");
    } catch (error) {
      this.logger.warn("Failed to setup anti-detection", error as Error);
    }
  }

  /**
   * Enhanced search with intelligent caching and multiple strategies
   */
  async searchPosts(options: SearchOptions): Promise<any[]> {
    const startTime = Date.now();
    this.metrics.requestCount++;
    
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(options);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.logger.info("Returning cached search results", { cacheKey });
        return cached.data;
      }

      if (!this.stagehand) {
        throw new Error("Agent not initialized");
      }

      this.logger.info("Enhanced search initiated", { options });
      
      // Navigate to Threads with anti-detection
      await this.navigateToThreads();
      
      // Perform search with multiple strategies
      const results = await this.performEnhancedSearch(options);
      
      // Cache results
      if (this.config.caching?.enabled) {
        this.addToCache(cacheKey, results, options.keywords.join(' '));
      }
      
      // Capture screenshot if monitoring enabled
      if (this.config.monitoring?.captureScreenshots) {
        await this.captureSearchScreenshot(options.keywords);
      }
      
      const responseTime = Date.now() - startTime;
      this.updateMetrics(true, responseTime);
      
      this.logger.info(`Enhanced search completed in ${responseTime}ms`, {
        resultsCount: results.length,
        keywords: options.keywords
      });
      
      return results;
      
    } catch (error) {
      this.metrics.errorCount++;
      this.updateMetrics(false, Date.now() - startTime);
      this.logger.error("Enhanced search failed", error as Error);
      throw error;
    }
  }

  /**
   * Navigate to Threads with human-like behavior
   */
  private async navigateToThreads(): Promise<void> {
    if (!this.stagehand) return;
    
    const page = this.stagehand.page;
    
    // Navigate with realistic timing
    await page.goto("https://www.threads.net", { 
      waitUntil: "networkidle",
      timeout: 30000
    });
    
    // Human-like delay
    if (this.config.antiDetection?.randomDelays) {
      await this.randomDelay(2000, 5000);
    }
    
    // Perform human-like interactions
    if (this.config.antiDetection?.mouseMovements) {
      await this.simulateMouseMovements();
    }
    
    if (this.config.antiDetection?.scrollPatterns) {
      await this.simulateScrollBehavior();
    }
  }

  /**
   * Enhanced search with multiple extraction strategies
   */
  private async performEnhancedSearch(options: SearchOptions): Promise<any[]> {
    if (!this.stagehand) throw new Error("Agent not initialized");
    
    const page = this.stagehand.page;
    const searchQuery = options.keywords.join(' ');
    
    // Strategy 1: Try search functionality
    let results = await this.trySearchStrategy(searchQuery, options);
    
    // Strategy 2: If search fails, try explore/discover
    if (results.length === 0) {
      results = await this.tryExploreStrategy(options);
    }
    
    // Strategy 3: If still no results, try trending topics
    if (results.length === 0) {
      results = await this.tryTrendingStrategy(options);
    }
    
    // Enhance results with additional data
    results = await this.enhanceResults(results, options);
    
    return results.slice(0, options.maxResults || 50);
  }

  /**
   * Primary search strategy using search functionality
   */
  private async trySearchStrategy(query: string, options: SearchOptions): Promise<any[]> {
    if (!this.stagehand) return [];
    
    try {
      const page = this.stagehand.page;
      
      // Look for and click search
      await page.act({
        action: "Find and click the search button or search icon"
      });
      
      await this.randomDelay(1000, 2000);
      
      // Type search query
      await page.act({
        action: `Type "${query}" in the search field`
      });
      
      await this.randomDelay(500, 1000);
      
      // Submit search
      await page.act({
        action: "Press Enter or click search button to submit"
      });
      
      // Wait for results
      await page.waitForTimeout(3000);
      
      // Scroll to load more results
      await this.performIntelligentScroll();
      
      // Extract results
      const searchResults = await page.extract({
        instruction: `Extract all visible posts from the search results. For each post, get:
        - Author handle and display name
        - Post text content
        - Number of likes, replies, reposts if visible
        - Timestamp or time ago
        - Any hashtags or mentions
        - Whether the author is verified
        - Post URL if available`,
        schema: ThreadsSearchResultsSchema
      });
      
      return searchResults.posts || [];
      
    } catch (error) {
      this.logger.warn("Search strategy failed", error as Error);
      return [];
    }
  }

  /**
   * Fallback strategy using explore/discover pages
   */
  private async tryExploreStrategy(options: SearchOptions): Promise<any[]> {
    if (!this.stagehand) return [];
    
    try {
      const page = this.stagehand.page;
      
      // Navigate to explore or home feed
      await page.act({
        action: "Find and click on explore, discover, or home feed"
      });
      
      await this.randomDelay(2000, 3000);
      
      // Scroll through content
      await this.performIntelligentScroll();
      
      // Extract posts that match keywords
      const exploreResults = await page.extract({
        instruction: `Extract all visible posts that might be relevant to these topics: ${options.keywords.join(', ')}. 
        Look for posts that mention these keywords or related concepts.`,
        schema: ThreadsSearchResultsSchema
      });
      
      // Filter results by keyword relevance
      const filtered = (exploreResults.posts || []).filter(post => {
        const text = post.text.toLowerCase();
        return options.keywords.some(keyword => 
          text.includes(keyword.toLowerCase())
        );
      });
      
      return filtered;
      
    } catch (error) {
      this.logger.warn("Explore strategy failed", error as Error);
      return [];
    }
  }

  /**
   * Trending strategy for high-engagement content
   */
  private async tryTrendingStrategy(options: SearchOptions): Promise<any[]> {
    if (!this.stagehand) return [];
    
    try {
      const page = this.stagehand.page;
      
      // Look for trending or popular content
      await page.act({
        action: "Find trending topics, popular posts, or featured content"
      });
      
      await this.randomDelay(2000, 3000);
      await this.performIntelligentScroll();
      
      const trendingResults = await page.extract({
        instruction: `Extract trending or popular posts that have high engagement (lots of likes, replies, reposts).
        Focus on posts that seem to be getting significant attention.`,
        schema: ThreadsSearchResultsSchema
      });
      
      return trendingResults.posts || [];
      
    } catch (error) {
      this.logger.warn("Trending strategy failed", error as Error);
      return [];
    }
  }

  /**
   * Enhance results with additional analysis and scoring
   */
  private async enhanceResults(results: any[], options: SearchOptions): Promise<any[]> {
    return results.map(post => {
      // Calculate enhanced engagement metrics
      const engagement = this.calculateEngagementMetrics(post);
      
      // Detect sentiment and intent
      const analysis = this.analyzePostContent(post, options.keywords);
      
      // Add lead score
      const leadScore = this.calculateLeadScore(post, options.keywords);
      
      return {
        ...post,
        enhanced: {
          engagement,
          analysis,
          leadScore,
          category: leadScore > 0.7 ? 'hot' : leadScore > 0.4 ? 'medium' : 'cold',
          extractedAt: new Date().toISOString(),
          searchQuery: options.keywords.join(' ')
        }
      };
    });
  }

  /**
   * Intelligent scrolling with human-like patterns
   */
  private async performIntelligentScroll(): Promise<void> {
    if (!this.stagehand) return;
    
    const page = this.stagehand.page;
    const scrollCount = 3 + Math.floor(Math.random() * 5); // 3-8 scrolls
    
    for (let i = 0; i < scrollCount; i++) {
      // Variable scroll distance
      const scrollDistance = 300 + Math.random() * 500;
      
      await page.evaluate((distance) => {
        window.scrollBy(0, distance);
      }, scrollDistance);
      
      // Random pause between scrolls
      await this.randomDelay(1000, 3000);
      
      // Occasionally scroll back up (human behavior)
      if (Math.random() < 0.2) {
        await page.evaluate(() => window.scrollBy(0, -200));
        await this.randomDelay(500, 1000);
      }
    }
  }

  /**
   * Simulate realistic mouse movements
   */
  private async simulateMouseMovements(): Promise<void> {
    if (!this.stagehand) return;
    
    const page = this.stagehand.page;
    
    // Random mouse movements
    for (let i = 0; i < 3; i++) {
      const x = Math.random() * 1000;
      const y = Math.random() * 600;
      
      await page.mouse.move(x, y);
      await this.randomDelay(100, 500);
    }
  }

  /**
   * Simulate natural scroll behavior
   */
  private async simulateScrollBehavior(): Promise<void> {
    if (!this.stagehand) return;
    
    const page = this.stagehand.page;
    
    // Initial small scroll to "wake up" the page
    await page.evaluate(() => window.scrollBy(0, 100));
    await this.randomDelay(500, 1000);
    
    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await this.randomDelay(1000, 2000);
  }

  /**
   * Calculate enhanced engagement metrics
   */
  private calculateEngagementMetrics(post: any): any {
    const likes = post.metrics?.likes || 0;
    const replies = post.metrics?.replies || 0;
    const reposts = post.metrics?.reposts || 0;
    const views = post.metrics?.views || 1;
    
    const totalEngagement = likes + (replies * 2) + (reposts * 3);
    const engagementRate = totalEngagement / Math.max(views, 1);
    
    return {
      totalEngagement,
      engagementRate,
      isViral: totalEngagement > 1000,
      isHighEngagement: engagementRate > 0.1,
      likesToRepliesRatio: likes / Math.max(replies, 1)
    };
  }

  /**
   * Analyze post content for intent and sentiment
   */
  private analyzePostContent(post: any, keywords: string[]): any {
    const text = post.text.toLowerCase();
    
    // Intent detection
    const hasQuestion = /\?|how|what|when|where|why|help|need|looking for|recommend/i.test(text);
    const hasUrgency = /urgent|asap|quickly|immediately|deadline|rush/i.test(text);
    const hasBuyingIntent = /buy|purchase|price|cost|budget|invest|pay|hire/i.test(text);
    
    // Sentiment analysis (simple)
    const positiveWords = /good|great|amazing|love|excellent|perfect|best/i.test(text);
    const negativeWords = /bad|terrible|awful|hate|worst|problem|issue|frustrated/i.test(text);
    
    // Keyword relevance
    const keywordMatches = keywords.filter(k => text.includes(k.toLowerCase()));
    const keywordDensity = keywordMatches.length / Math.max(keywords.length, 1);
    
    return {
      hasQuestion,
      hasUrgency,
      hasBuyingIntent,
      sentiment: positiveWords ? 'positive' : negativeWords ? 'negative' : 'neutral',
      keywordMatches,
      keywordDensity,
      isBusinessContext: /business|company|startup|enterprise|corporate/i.test(text)
    };
  }

  /**
   * Calculate lead score using enhanced PRD algorithm
   */
  private calculateLeadScore(post: any, keywords: string[]): number {
    let score = 0;
    const text = post.text.toLowerCase();
    
    // Topic match (35% weight) - enhanced
    const keywordMatches = keywords.filter(k => text.includes(k.toLowerCase()));
    const topicMatch = keywordMatches.length / Math.max(keywords.length, 1);
    score += topicMatch * 0.35;
    
    // Engagement velocity (20% weight) - enhanced
    const engagement = this.calculateEngagementMetrics(post);
    score += Math.min(1, engagement.engagementRate * 10) * 0.20;
    
    // Recency (15% weight)
    if (post.timestamp) {
      const hoursAgo = (Date.now() - new Date(post.timestamp).getTime()) / (1000 * 60 * 60);
      const recencyScore = Math.max(0, 1 - (hoursAgo / 168)); // 1 week decay
      score += recencyScore * 0.15;
    } else {
      score += 0.075; // Default middle value
    }
    
    // Answerability (15% weight) - enhanced
    const analysis = this.analyzePostContent(post, keywords);
    if (analysis.hasQuestion) score += 0.15;
    if (analysis.hasUrgency) score += 0.05;
    if (analysis.hasBuyingIntent) score += 0.1;
    
    // Author quality (10% weight) - enhanced
    if (post.author?.isVerified) score += 0.05;
    const followerBonus = Math.min(0.05, (post.author?.followerCount || 0) / 100000);
    score += followerBonus;
    
    // Business context bonus (5% weight)
    if (analysis.isBusinessContext) score += 0.05;
    
    // Toxicity penalty (-15% weight) - enhanced
    const toxicPatterns = /spam|scam|fake|bot|promotional|advertisement/i;
    if (toxicPatterns.test(text)) score -= 0.15;
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Cache management
   */
  private generateCacheKey(options: SearchOptions): string {
    return `search_${options.keywords.sort().join('_')}_${options.maxResults || 50}_${options.timeRange || 'day'}`;
  }

  private getFromCache(key: string): CachedResult | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached;
  }

  private addToCache(key: string, data: any, searchQuery: string): void {
    if (!this.config.caching?.enabled) return;
    
    // Cleanup old entries if cache is full
    if (this.cache.size >= (this.config.caching.maxSize || 1000)) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.config.caching.ttl || 300000,
      searchQuery
    });
  }

  /**
   * Capture screenshot for monitoring
   */
  private async captureSearchScreenshot(keywords: string[]): Promise<void> {
    if (!this.stagehand) return;
    
    try {
      const filename = `search_${keywords.join('_')}_${Date.now()}.png`;
      await this.mediaCapture.captureState(
        `enhanced-search-${Date.now()}`,
        'search-results',
        { keywords, timestamp: new Date() }
      );
    } catch (error) {
      this.logger.warn("Failed to capture screenshot", error as Error);
    }
  }

  /**
   * Metrics and monitoring
   */
  private updateMetrics(success: boolean, responseTime: number): void {
    if (success) {
      this.metrics.successCount++;
    }
    
    // Update rolling average response time
    const total = this.metrics.averageResponseTime * (this.metrics.requestCount - 1) + responseTime;
    this.metrics.averageResponseTime = total / this.metrics.requestCount;
    this.metrics.lastActivity = new Date();
  }

  /**
   * Random delay helper
   */
  private async randomDelay(min: number, max: number): Promise<void> {
    const delay = min + Math.random() * (max - min);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Restore session from cookies
   */
  private async restoreSession(): Promise<void> {
    if (!this.stagehand || !this.session?.cookies) return;
    
    try {
      await this.stagehand.page.context().addCookies(this.session.cookies);
      this.logger.info("Session restored from cookies");
    } catch (error) {
      this.logger.warn("Failed to restore session", error as Error);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.cache.size,
      successRate: this.metrics.successCount / Math.max(this.metrics.requestCount, 1),
      isActive: this.stagehand !== null
    };
  }

  /**
   * Get cache statistics  
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.caching?.maxSize || 1000,
      enabled: this.config.caching?.enabled || false,
      ttl: this.config.caching?.ttl || 300000
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.info("Cache cleared");
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{healthy: boolean, issues: string[]}> {
    const issues: string[] = [];
    
    if (!this.stagehand) {
      issues.push("Stagehand not initialized");
    }
    
    if (this.metrics.errorCount / Math.max(this.metrics.requestCount, 1) > 0.5) {
      issues.push("High error rate");
    }
    
    if (this.metrics.averageResponseTime > 30000) {
      issues.push("Slow response times");
    }
    
    const timeSinceActivity = Date.now() - this.metrics.lastActivity.getTime();
    if (timeSinceActivity > 600000) { // 10 minutes
      issues.push("No recent activity");
    }
    
    return {
      healthy: issues.length === 0,
      issues
    };
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    this.logger.info("Cleaning up enhanced Threads agent");
    
    if (this.stagehand) {
      await this.stagehand.close();
      this.stagehand = null;
    }
    
    this.clearCache();
    this.logger.info("Enhanced agent cleanup completed");
  }

  /**
   * Check if agent is active
   */
  isActive(): boolean {
    return this.stagehand !== null;
  }
}