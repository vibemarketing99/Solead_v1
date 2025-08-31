/**
 * Playwright Mock Automation
 * Uses real browser for screenshots while simulating Threads behavior
 */

import { chromium, Browser, Page, BrowserContext } from '@playwright/test';
import { IAutomation, ExtractedPost, HumanizationProfile } from '../types/automation.types';
import { MediaCaptureService } from '../services/MediaCapture';
import { Logger } from '../utils/Logger';

const logger = new Logger('PlaywrightMockAutomation');

export class PlaywrightMockAutomation implements IAutomation {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private mediaCapture: MediaCaptureService;
  private jobId?: string;
  
  constructor(
    private options: {
      headless?: boolean;
      captureMedia?: boolean;
    } = {}
  ) {
    this.mediaCapture = new MediaCaptureService();
  }
  
  async initialize(): Promise<void> {
    logger.info('Initializing Playwright automation', {
      headless: this.options.headless !== false,
      captureMedia: this.options.captureMedia
    });
    
    // Launch browser
    this.browser = await chromium.launch({
      headless: this.options.headless !== false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Create context with viewport
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    
    // Create page
    this.page = await this.context.newPage();
    
    logger.info('Browser initialized');
  }
  
  async login(username: string, password: string): Promise<boolean> {
    if (!this.page) throw new Error('Browser not initialized');
    
    logger.info('Simulating login', { username });
    
    // Navigate to mock Threads page
    await this.page.goto('data:text/html,<html><body style="font-family: Arial; padding: 20px;"><h1>Threads Mock</h1><div id="status">Logging in as ' + username + '...</div></body></html>');
    
    // Capture login screenshot
    if (this.options.captureMedia && this.jobId) {
      await this.mediaCapture.captureCriticalMoment(
        this.page,
        this.jobId,
        'login',
        { username }
      );
    }
    
    await this.page.waitForTimeout(1000);
    
    // Update page to show logged in
    await this.page.evaluate(() => {
      const status = document.getElementById('status');
      if (status) {
        status.innerHTML = '✅ Logged in successfully';
      }
    });
    
    return true;
  }
  
  async searchPosts(keywords: string[]): Promise<ExtractedPost[]> {
    if (!this.page) throw new Error('Browser not initialized');
    
    logger.info('Searching posts', { keywords });
    
    // Create mock search results page
    const searchHTML = this.generateMockSearchPage(keywords);
    await this.page.goto(`data:text/html,${encodeURIComponent(searchHTML)}`);
    
    // Capture search screenshot
    if (this.options.captureMedia && this.jobId) {
      await this.mediaCapture.captureCriticalMoment(
        this.page,
        this.jobId,
        'search',
        { keywords }
      );
    }
    
    // Simulate scrolling and finding posts
    const posts: ExtractedPost[] = [];
    
    for (let i = 0; i < 3; i++) {
      await this.page.waitForTimeout(1000);
      
      // Scroll down
      await this.page.evaluate(() => window.scrollBy(0, 300));
      
      // Generate mock post
      const post = this.generateMockPost(keywords, i);
      posts.push(post);
      
      // Add post to page
      await this.page.evaluate((postData) => {
        const container = document.getElementById('posts');
        if (container) {
          const postDiv = document.createElement('div');
          postDiv.className = 'post';
          postDiv.innerHTML = `
            <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 8px;">
              <div style="font-weight: bold;">@${postData.authorHandle}</div>
              <div style="margin: 10px 0;">${postData.text}</div>
              <div style="color: #666; font-size: 0.9em;">
                ❤️ ${postData.metrics.likes} | 💬 ${postData.metrics.replies} | 🔁 ${postData.metrics.reposts}
              </div>
            </div>
          `;
          container.appendChild(postDiv);
        }
      }, post);
      
      // Capture lead found screenshot if it's a good lead
      if (post.metrics.likes > 5 && this.options.captureMedia && this.jobId) {
        await this.mediaCapture.captureCriticalMoment(
          this.page,
          this.jobId,
          'lead_found',
          {
            authorHandle: post.authorHandle,
            threadUrl: post.postUrl,
            score: (post.metrics.likes / 20).toFixed(2),
            text: post.text.substring(0, 100)
          }
        );
      }
    }
    
    // Capture completion
    if (this.options.captureMedia && this.jobId) {
      await this.mediaCapture.captureCriticalMoment(
        this.page,
        this.jobId,
        'complete',
        { leadsFound: posts.length }
      );
    }
    
    return posts;
  }
  
  async extractPostDetails(postUrl: string): Promise<ExtractedPost | null> {
    logger.info('Extracting post details', { postUrl });
    return this.generateMockPost(['detail'], 0);
  }
  
  async scrollToLoadMore(): Promise<void> {
    if (!this.page) return;
    
    await this.page.evaluate(() => window.scrollBy(0, 500));
    await this.page.waitForTimeout(1000);
  }
  
  async applyHumanization(profile: HumanizationProfile): Promise<void> {
    if (!this.page) return;
    
    // Simulate human-like delays
    const delay = profile.randomBreaks[0] + Math.random() * 
      (profile.randomBreaks[1] - profile.randomBreaks[0]);
    await this.page.waitForTimeout(delay);
  }
  
  async cleanup(): Promise<void> {
    logger.info('Cleaning up browser');
    
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
  
  /**
   * Set job ID for media capture
   */
  setJobId(jobId: string): void {
    this.jobId = jobId;
  }
  
  /**
   * Start media capture for current job
   */
  async startCapture(jobId: string, agentId: string, keywords: string[]): Promise<void> {
    this.jobId = jobId;
    
    if (this.options.captureMedia && this.page) {
      await this.mediaCapture.startCapture(
        this.page,
        {
          jobId,
          agentId,
          captureMode: 'screenshot',
          screenshotInterval: 5000
        },
        keywords
      );
    }
  }
  
  /**
   * Stop media capture
   */
  async stopCapture(): Promise<any> {
    if (this.jobId) {
      const result = await this.mediaCapture.stopCapture(this.jobId);
      this.jobId = undefined;
      return result;
    }
    return null;
  }
  
  /**
   * Generate mock search page HTML
   */
  private generateMockSearchPage(keywords: string[]): string {
    return `
      <html>
        <head>
          <title>Threads - Search</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background: #f5f5f5;
            }
            .header {
              background: white;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .search-bar {
              display: flex;
              align-items: center;
              padding: 10px;
              background: #f0f0f0;
              border-radius: 20px;
            }
            #posts {
              min-height: 500px;
            }
            .status {
              text-align: center;
              padding: 20px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">Threads</h1>
            <div class="search-bar" style="margin-top: 10px;">
              🔍 Searching for: ${keywords.join(', ')}
            </div>
          </div>
          <div id="posts">
            <div class="status">Loading posts...</div>
          </div>
        </body>
      </html>
    `;
  }
  
  /**
   * Generate mock post data
   */
  private generateMockPost(keywords: string[], index: number): ExtractedPost {
    const templates = [
      {
        text: `Looking for solutions to automate our ${keywords[0]} workflow. Any recommendations?`,
        likes: 15,
        replies: 8
      },
      {
        text: `Just discovered an amazing tool for ${keywords[0]}! Has anyone else tried it?`,
        likes: 23,
        replies: 12
      },
      {
        text: `Our team needs help with ${keywords.join(' and ')}. What are the best practices?`,
        likes: 7,
        replies: 4
      }
    ];
    
    const template = templates[index % templates.length];
    
    return {
      postId: `mock-${Date.now()}-${index}`,
      postUrl: `https://threads.net/t/mock-${index}`,
      authorHandle: `user_${Math.random().toString(36).substr(2, 9)}`,
      authorFollowers: Math.floor(Math.random() * 5000),
      text: template.text,
      metrics: {
        replies: template.replies,
        likes: template.likes,
        reposts: Math.floor(Math.random() * 5),
        views: Math.floor(Math.random() * 1000),
        timestampRaw: new Date().toISOString(),
        timestampParsed: new Date()
      },
      hashtags: keywords.map(k => `#${k}`),
      mentions: [],
      hasQuestion: template.text.includes('?'),
      capturedAt: new Date()
    };
  }
}