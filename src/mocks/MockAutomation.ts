import { IAutomation, ExtractedPost } from '../workers/SimpleStagehandWorker';
import { Logger } from '../utils/Logger';

/**
 * Mock automation for testing StagehandWorker
 * Simulates real automation behavior without browser dependencies
 */
export class MockAutomation implements IAutomation {
  private active: boolean = false;
  private logger: Logger;
  private instanceId: string;
  
  // Configurable behavior
  private config = {
    searchDelay: 1000,        // Base search delay
    searchVariance: 500,       // Random variance in search time
    postsPerSearch: 5,         // Average posts returned per search
    failureRate: 0.1,          // 10% chance of failure
    humanPatternDelay: 2000    // Base human pattern delay
  };

  constructor(instanceId?: string) {
    this.instanceId = instanceId || `mock-${Date.now()}`;
    this.logger = new Logger(`MockAutomation-${this.instanceId}`);
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing mock automation');
    
    // Simulate initialization delay
    await this.delay(500);
    
    // Randomly fail sometimes to test error handling
    if (Math.random() < 0.05) { // 5% init failure
      throw new Error('Mock initialization failed');
    }
    
    this.active = true;
    this.logger.info('Mock automation initialized');
  }

  async searchThreads(keywords: string[]): Promise<ExtractedPost[]> {
    if (!this.active) {
      throw new Error('Automation not initialized');
    }

    this.logger.info(`Searching for keywords: ${keywords.join(', ')}`);
    
    // Simulate search delay
    const searchTime = this.config.searchDelay + Math.random() * this.config.searchVariance;
    await this.delay(searchTime);
    
    // Randomly fail sometimes
    if (Math.random() < this.config.failureRate) {
      throw new Error('Mock search failed - simulated error');
    }
    
    // Generate mock posts
    const postCount = Math.floor(Math.random() * this.config.postsPerSearch * 2);
    const posts: ExtractedPost[] = [];
    
    for (let i = 0; i < postCount; i++) {
      posts.push(this.generateMockPost(keywords));
    }
    
    this.logger.info(`Found ${posts.length} mock posts`);
    return posts;
  }

  async browseWithHumanPattern(duration: number): Promise<void> {
    if (!this.active) {
      throw new Error('Automation not initialized');
    }

    this.logger.info(`Browsing with human pattern for ${duration}ms`);
    
    const startTime = Date.now();
    const actions = ['scroll', 'hover', 'pause', 'read'];
    
    while (Date.now() - startTime < duration) {
      // Pick random action
      const action = actions[Math.floor(Math.random() * actions.length)];
      this.logger.debug(`Human action: ${action}`);
      
      // Simulate action delay
      const actionDelay = 500 + Math.random() * 2000;
      await this.delay(actionDelay);
      
      if (Date.now() - startTime >= duration) {
        break;
      }
    }
    
    this.logger.info('Human pattern browsing complete');
  }

  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up mock automation');
    
    // Simulate cleanup delay
    await this.delay(200);
    
    this.active = false;
    this.logger.info('Mock automation cleaned up');
  }

  isActive(): boolean {
    return this.active;
  }

  /**
   * Configure mock behavior for testing
   */
  setConfig(config: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Mock configuration updated', config);
  }

  /**
   * Generate a realistic mock post
   */
  private generateMockPost(keywords: string[]): ExtractedPost {
    const templates = [
      'Looking for recommendations on {keyword}',
      'Has anyone tried {keyword} for their business?',
      'Struggling with {keyword}, need help!',
      'Just discovered {keyword} and it\'s amazing',
      'Why is {keyword} so complicated?',
      'Best practices for {keyword}?',
      '{keyword} vs alternatives - thoughts?',
      'How to get started with {keyword}',
      'Is {keyword} worth the investment?',
      'Tips for maximizing {keyword} efficiency'
    ];
    
    const handles = [
      'techfounder', 'startupguru', 'productmanager', 'devadvocate',
      'growthacker', 'saasbuilder', 'indiehacker', 'bootstrapper',
      'marketingpro', 'salesexpert'
    ];
    
    const keyword = keywords[Math.floor(Math.random() * keywords.length)] || 'automation';
    const template = templates[Math.floor(Math.random() * templates.length)] || 'Looking for {keyword}';
    const content = template.replace('{keyword}', keyword);
    const handleBase = handles[Math.floor(Math.random() * handles.length)] || 'user';
    const handle = handleBase + Math.floor(Math.random() * 1000);
    
    // Add random hashtags and mentions
    const hashtags = Math.random() > 0.5 
      ? [keyword.replace(/\s+/g, ''), 'startup', 'tech'].slice(0, Math.floor(Math.random() * 3) + 1)
      : [];
    
    const mentions = Math.random() > 0.7
      ? ['threads', 'meta'].slice(0, Math.floor(Math.random() * 2) + 1)
      : [];
    
    const postId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Within last week
    
    return {
      id: postId,
      url: `https://threads.net/@${handle}/post/${postId}`,
      text: content,
      author: {
        handle: handle,
        displayName: `${handle} User`,
        avatarUrl: `https://example.com/avatar/${handle}.jpg`,
        followerCount: Math.floor(Math.random() * 10000),
        isVerified: Math.random() > 0.9
      },
      timestamp: timestamp.toISOString(),
      likes: Math.floor(Math.random() * 500),
      replies: Math.floor(Math.random() * 100),
      reposts: Math.floor(Math.random() * 50),
      views: Math.floor(Math.random() * 5000),
      hashtags,
      mentions,
      links: Math.random() > 0.8 ? ['https://example.com'] : [],
      media: []
    };
  }

  /**
   * Helper to simulate delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory function for creating mock automations
 */
export function createMockAutomationFactory(config?: Partial<MockAutomation['config']>) {
  let instanceCounter = 0;
  
  return () => {
    const automation = new MockAutomation(`mock-${++instanceCounter}`);
    if (config) {
      automation.setConfig(config);
    }
    return automation;
  };
}