/**
 * Node.js-compatible version of HumanizationProfile
 * Provides human-like behavior patterns for server-side automation
 */

import { Logger } from '../utils/Logger';

export interface HumanizationConfig {
  scrollPattern: 'linear' | 'exponential' | 'random';
  mouseMovement: boolean;
  readingDelays: boolean;
  randomBreaks: [number, number]; // min, max in ms
  dwellTime?: [number, number]; // min, max in ms
}

export interface BehaviorMetrics {
  totalScrolls: number;
  totalClicks: number;
  totalDwellTime: number;
  totalReadingTime: number;
  mouseMovements: number;
  breaks: number;
  sessionDuration: number;
}

/**
 * Node.js-compatible humanization profile
 * Simulates human behavior patterns without browser dependencies
 */
export class NodeHumanizationProfile {
  private logger: Logger;
  private startTime: number;
  private metrics: BehaviorMetrics = {
    totalScrolls: 0,
    totalClicks: 0,
    totalDwellTime: 0,
    totalReadingTime: 0,
    mouseMovements: 0,
    breaks: 0,
    sessionDuration: 0
  };

  // Human-like timing ranges (in ms)
  private readonly timingPatterns = {
    shortPause: [100, 500],
    mediumPause: [500, 2000],
    longPause: [2000, 5000],
    readingSpeed: [200, 400], // per 100 characters
    typingSpeed: [50, 200], // per character
    decisionTime: [1000, 3000],
    scrollDelay: [300, 1500]
  };

  constructor(private config: HumanizationConfig) {
    this.logger = new Logger('NodeHumanizationProfile');
    this.startTime = Date.now();
  }

  /**
   * Simulate human-like delays without actual browser interaction
   */
  async simulateScrollBehavior(): Promise<void> {
    this.logger.debug('Simulating scroll behavior', { pattern: this.config.scrollPattern });
    
    switch (this.config.scrollPattern) {
      case 'linear':
        await this.simulateLinearScroll();
        break;
      case 'exponential':
        await this.simulateExponentialScroll();
        break;
      case 'random':
        await this.simulateRandomScroll();
        break;
    }
    
    this.metrics.totalScrolls++;
  }

  private async simulateLinearScroll(): Promise<void> {
    // Simulate time taken for linear scrolling
    const scrollTime = 1000 + Math.random() * 2000;
    await this.sleep(scrollTime);
    this.logger.debug('Linear scroll simulated', { duration: scrollTime });
  }

  private async simulateExponentialScroll(): Promise<void> {
    // Simulate exponential scrolling pattern
    const distances = [100, 150, 250, 400, 250, 150, 100];
    let totalTime = 0;
    
    for (const _distance of distances) {
      const delay = 300 + Math.random() * 700;
      await this.sleep(delay);
      totalTime += delay;
    }
    
    this.logger.debug('Exponential scroll simulated', { duration: totalTime });
  }

  private async simulateRandomScroll(): Promise<void> {
    const numScrolls = 2 + Math.floor(Math.random() * 4);
    let totalTime = 0;
    
    for (let i = 0; i < numScrolls; i++) {
      const delay = 500 + Math.random() * 2000;
      await this.sleep(delay);
      totalTime += delay;
    }
    
    this.logger.debug('Random scroll simulated', { scrolls: numScrolls, duration: totalTime });
  }

  /**
   * Simulate reading behavior based on content length
   */
  async simulateReading(contentLength: number): Promise<void> {
    if (!this.config.readingDelays) return;
    
    // Calculate reading time based on content length
    const wordsPerMinute = 200 + Math.random() * 100; // 200-300 WPM
    const words = contentLength / 5; // Rough estimate
    const readingTime = (words / wordsPerMinute) * 60 * 1000;
    
    const actualDelay = Math.min(readingTime, 5000); // Cap at 5 seconds
    await this.sleep(actualDelay);
    
    this.metrics.totalReadingTime += actualDelay;
    this.logger.debug('Reading simulated', { contentLength, duration: actualDelay });
  }

  /**
   * Simulate mouse movement patterns
   */
  async simulateMouseMovement(): Promise<void> {
    if (!this.config.mouseMovement) return;
    
    // Simulate mouse movement time
    const movementTime = 50 + Math.random() * 150;
    await this.sleep(movementTime);
    
    this.metrics.mouseMovements++;
    this.logger.debug('Mouse movement simulated', { duration: movementTime });
  }

  /**
   * Simulate click behavior with natural timing
   */
  async simulateClick(): Promise<void> {
    // Pre-click hover time
    const hoverTime = 100 + Math.random() * 300;
    await this.sleep(hoverTime);
    
    // Click
    this.metrics.totalClicks++;
    
    // Post-click delay
    const postClickDelay = 200 + Math.random() * 500;
    await this.sleep(postClickDelay);
    
    this.logger.debug('Click simulated', { totalDelay: hoverTime + postClickDelay });
  }

  /**
   * Simulate typing with human-like speed and patterns
   */
  async simulateTyping(text: string): Promise<void> {
    const chars = text.split('');
    let totalTime = 0;
    
    for (const _char of chars) {
      const [minSpeed = 50, maxSpeed = 200] = this.timingPatterns.typingSpeed;
      const delay = minSpeed + Math.random() * (maxSpeed - minSpeed);
      await this.sleep(delay);
      totalTime += delay;
      
      // Occasional longer pauses (thinking)
      if (Math.random() < 0.1) {
        const thinkingTime = 500 + Math.random() * 1500;
        await this.sleep(thinkingTime);
        totalTime += thinkingTime;
      }
    }
    
    this.logger.debug('Typing simulated', { length: text.length, duration: totalTime });
  }

  /**
   * Take a random break
   */
  async takeBreak(): Promise<void> {
    const [min, max] = this.config.randomBreaks;
    const breakDuration = min + Math.random() * (max - min);
    
    this.logger.debug('Taking break', { duration: breakDuration });
    await this.sleep(breakDuration);
    
    this.metrics.breaks++;
  }

  /**
   * Simulate decision-making pause
   */
  async simulateDecision(): Promise<void> {
    const [min = 1000, max = 3000] = this.timingPatterns.decisionTime;
    const decisionTime = min + Math.random() * (max - min);
    
    await this.sleep(decisionTime);
    this.logger.debug('Decision time simulated', { duration: decisionTime });
  }

  /**
   * Simulate dwell time on content
   */
  async simulateDwell(): Promise<void> {
    if (!this.config.dwellTime) return;
    
    const [min = 1000, max = 3000] = this.config.dwellTime;
    const dwellDuration = min + Math.random() * (max - min);
    
    await this.sleep(dwellDuration);
    this.metrics.totalDwellTime += dwellDuration;
    
    this.logger.debug('Dwell time simulated', { duration: dwellDuration });
  }

  /**
   * Get current behavior metrics
   */
  getMetrics(): BehaviorMetrics {
    this.metrics.sessionDuration = Date.now() - this.startTime;
    return { ...this.metrics };
  }

  /**
   * Reset metrics for new session
   */
  resetMetrics(): void {
    this.startTime = Date.now();
    this.metrics = {
      totalScrolls: 0,
      totalClicks: 0,
      totalDwellTime: 0,
      totalReadingTime: 0,
      mouseMovements: 0,
      breaks: 0,
      sessionDuration: 0
    };
  }

  /**
   * Generate random user agent for requests
   */
  static generateUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
    ];
    
    const agent = userAgents[Math.floor(Math.random() * userAgents.length)];
    return agent || userAgents[0];
  }

  /**
   * Generate random viewport size
   */
  static generateViewport(): { width: number; height: number } {
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
      { width: 1536, height: 864 },
      { width: 1280, height: 720 }
    ];
    
    const viewport = viewports[Math.floor(Math.random() * viewports.length)];
    return viewport || viewports[0];
  }

  /**
   * Helper to sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}