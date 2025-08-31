/**
 * Media Capture Service
 * Handles screenshot and video recording for job monitoring
 */

import { Page } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';
import { Logger } from '../utils/Logger';

const logger = new Logger('MediaCapture');

export interface CaptureOptions {
  jobId: string;
  agentId: string;
  captureMode: 'screenshot' | 'video' | 'both';
  screenshotInterval?: number; // milliseconds between screenshots
  videoQuality?: 'low' | 'medium' | 'high';
  saveDirectory?: string;
}

export interface CaptureResult {
  jobId: string;
  screenshots: string[];
  videoPath?: string;
  thumbnails: string[];
  metadata: {
    startTime: Date;
    endTime?: Date;
    duration?: number;
    totalScreenshots: number;
    keywords: string[];
    leadsFound: number;
  };
}

export class MediaCaptureService {
  private captureDir: string;
  private activeCaptures: Map<string, CaptureResult> = new Map();
  private captureIntervals: Map<string, NodeJS.Timeout> = new Map();
  
  constructor(baseDir: string = './captures') {
    this.captureDir = baseDir;
    this.initializeCaptureDirectory();
  }
  
  private async initializeCaptureDirectory() {
    try {
      await fs.mkdir(this.captureDir, { recursive: true });
      await fs.mkdir(path.join(this.captureDir, 'screenshots'), { recursive: true });
      await fs.mkdir(path.join(this.captureDir, 'videos'), { recursive: true });
      await fs.mkdir(path.join(this.captureDir, 'thumbnails'), { recursive: true });
      logger.info('Capture directories initialized');
    } catch (error) {
      logger.error('Failed to initialize capture directories', error as Error);
    }
  }
  
  /**
   * Start capturing media for a job
   */
  async startCapture(
    page: Page | null,
    options: CaptureOptions,
    keywords: string[]
  ): Promise<void> {
    const { jobId, agentId, captureMode, screenshotInterval = 5000 } = options;
    
    logger.info('Starting media capture', { jobId, captureMode });
    
    // Initialize capture result
    const captureResult: CaptureResult = {
      jobId,
      screenshots: [],
      thumbnails: [],
      metadata: {
        startTime: new Date(),
        totalScreenshots: 0,
        keywords,
        leadsFound: 0
      }
    };
    
    this.activeCaptures.set(jobId, captureResult);
    
    // Start video recording if requested
    if ((captureMode === 'video' || captureMode === 'both') && page) {
      try {
        const videoPath = path.join(this.captureDir, 'videos', `job-${jobId}.webm`);
        await page.video()?.saveAs(videoPath);
        captureResult.videoPath = videoPath;
        logger.info('Video recording started', { jobId, videoPath });
      } catch (error) {
        logger.error('Failed to start video recording', error as Error);
      }
    }
    
    // Start screenshot capture if requested
    if ((captureMode === 'screenshot' || captureMode === 'both') && page) {
      const interval = setInterval(async () => {
        await this.captureScreenshot(page, jobId);
      }, screenshotInterval);
      
      this.captureIntervals.set(jobId, interval);
      
      // Capture initial screenshot
      await this.captureScreenshot(page, jobId);
    }
  }
  
  /**
   * Capture a screenshot with annotations
   */
  async captureScreenshot(
    page: Page | null,
    jobId: string,
    annotation?: string
  ): Promise<string | null> {
    if (!page) {
      return null;
    }
    
    const captureResult = this.activeCaptures.get(jobId);
    if (!captureResult) {
      logger.warn('No active capture for job', { jobId });
      return null;
    }
    
    try {
      const timestamp = Date.now();
      const filename = `job-${jobId}-${timestamp}.png`;
      const filepath = path.join(this.captureDir, 'screenshots', filename);
      
      // Add visual annotations if provided
      if (annotation) {
        await page.evaluate((text) => {
          const div = document.createElement('div');
          div.id = 'capture-annotation';
          div.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 14px;
            z-index: 999999;
            max-width: 300px;
          `;
          div.textContent = text;
          document.body.appendChild(div);
        }, annotation);
      }
      
      // Take screenshot
      await page.screenshot({
        path: filepath,
        fullPage: false // Capture viewport only for performance
      });
      
      // Remove annotation
      if (annotation) {
        await page.evaluate(() => {
          const div = document.getElementById('capture-annotation');
          if (div) div.remove();
        });
      }
      
      captureResult.screenshots.push(filepath);
      captureResult.metadata.totalScreenshots++;
      
      // Create thumbnail every 5th screenshot
      if (captureResult.metadata.totalScreenshots % 5 === 1) {
        await this.createThumbnail(filepath, jobId);
      }
      
      logger.debug('Screenshot captured', { jobId, filepath, annotation });
      return filepath;
      
    } catch (error) {
      logger.error('Failed to capture screenshot', error as Error);
      return null;
    }
  }
  
  /**
   * Capture a critical moment (e.g., lead found, error occurred)
   */
  async captureCriticalMoment(
    page: Page | null,
    jobId: string,
    eventType: 'lead_found' | 'error' | 'login' | 'search' | 'complete',
    details: any
  ): Promise<void> {
    if (!page) return;
    
    // For lead_found events, capture additional context
    if (eventType === 'lead_found' && details.threadUrl) {
      // Add visual marker on the page for the lead
      await page.evaluate((leadDetails) => {
        const marker = document.createElement('div');
        marker.id = 'lead-marker';
        marker.style.cssText = `
          position: fixed;
          top: 20px;
          left: 20px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          padding: 15px 20px;
          border-radius: 8px;
          font-family: monospace;
          font-size: 14px;
          z-index: 999999;
          box-shadow: 0 4px 6px rgba(0,0,0,0.2);
          max-width: 400px;
        `;
        marker.innerHTML = `
          <div style="font-weight: bold; margin-bottom: 8px;">🎯 LEAD CAPTURED</div>
          <div style="font-size: 12px;">@${leadDetails.authorHandle}</div>
          <div style="font-size: 11px; opacity: 0.9; margin-top: 4px;">Score: ${leadDetails.score}</div>
          <div style="font-size: 10px; opacity: 0.8; margin-top: 4px; word-break: break-all;">
            ${leadDetails.threadUrl}
          </div>
        `;
        document.body.appendChild(marker);
      }, details);
    }
    
    const annotation = this.formatAnnotation(eventType, details);
    const screenshot = await this.captureScreenshot(page, jobId, annotation);
    
    // Remove lead marker after screenshot
    if (eventType === 'lead_found') {
      await page.evaluate(() => {
        const marker = document.getElementById('lead-marker');
        if (marker) marker.remove();
      });
    }
    
    if (screenshot) {
      logger.info('Critical moment captured', { 
        jobId, 
        eventType, 
        screenshot,
        threadUrl: details.threadUrl 
      });
      
      // Update metadata with lead details
      const captureResult = this.activeCaptures.get(jobId);
      if (captureResult && eventType === 'lead_found') {
        captureResult.metadata.leadsFound++;
        
        // Store lead with thread URL for later reference
        if (!captureResult.metadata.leadDetails) {
          captureResult.metadata.leadDetails = [];
        }
        captureResult.metadata.leadDetails.push({
          authorHandle: details.authorHandle,
          threadUrl: details.threadUrl,
          score: details.score,
          screenshot,
          capturedAt: new Date()
        });
      }
    }
  }
  
  /**
   * Stop capturing media for a job
   */
  async stopCapture(jobId: string): Promise<CaptureResult | null> {
    logger.info('Stopping media capture', { jobId });
    
    // Stop screenshot interval
    const interval = this.captureIntervals.get(jobId);
    if (interval) {
      clearInterval(interval);
      this.captureIntervals.delete(jobId);
    }
    
    // Get capture result
    const captureResult = this.activeCaptures.get(jobId);
    if (!captureResult) {
      return null;
    }
    
    // Update metadata
    captureResult.metadata.endTime = new Date();
    captureResult.metadata.duration = 
      captureResult.metadata.endTime.getTime() - 
      captureResult.metadata.startTime.getTime();
    
    // Generate summary image
    await this.generateSummaryImage(jobId);
    
    this.activeCaptures.delete(jobId);
    
    logger.info('Media capture stopped', {
      jobId,
      screenshots: captureResult.screenshots.length,
      duration: captureResult.metadata.duration
    });
    
    return captureResult;
  }
  
  /**
   * Create thumbnail from screenshot
   */
  private async createThumbnail(
    screenshotPath: string,
    jobId: string
  ): Promise<void> {
    try {
      // For now, just copy as thumbnail (in production, would resize)
      const filename = path.basename(screenshotPath);
      const thumbPath = path.join(
        this.captureDir,
        'thumbnails',
        `thumb-${filename}`
      );
      
      await fs.copyFile(screenshotPath, thumbPath);
      
      const captureResult = this.activeCaptures.get(jobId);
      if (captureResult) {
        captureResult.thumbnails.push(thumbPath);
      }
    } catch (error) {
      logger.error('Failed to create thumbnail', error as Error);
    }
  }
  
  /**
   * Generate summary image for completed job
   */
  private async generateSummaryImage(jobId: string): Promise<void> {
    const captureResult = this.activeCaptures.get(jobId);
    if (!captureResult || captureResult.screenshots.length === 0) {
      return;
    }
    
    // For now, copy the last screenshot as summary
    // In production, would create a collage of key moments
    const lastScreenshot = captureResult.screenshots[captureResult.screenshots.length - 1];
    const summaryPath = path.join(
      this.captureDir,
      'screenshots',
      `summary-${jobId}.png`
    );
    
    try {
      await fs.copyFile(lastScreenshot, summaryPath);
      logger.info('Summary image generated', { jobId, summaryPath });
    } catch (error) {
      logger.error('Failed to generate summary', error as Error);
    }
  }
  
  /**
   * Format annotation text for screenshots
   */
  private formatAnnotation(eventType: string, details: any): string {
    switch (eventType) {
      case 'lead_found':
        return `🎯 Lead Found!\n@${details.authorHandle}\nScore: ${details.score}`;
      case 'error':
        return `❌ Error: ${details.message}`;
      case 'login':
        return `🔐 Logging in...`;
      case 'search':
        return `🔍 Searching: ${details.keywords?.join(', ')}`;
      case 'complete':
        return `✅ Job Complete!\nLeads: ${details.leadsFound}`;
      default:
        return `📸 ${eventType}`;
    }
  }
  
  /**
   * Get capture status for a job
   */
  getCaptureStatus(jobId: string): any {
    const captureResult = this.activeCaptures.get(jobId);
    if (!captureResult) {
      return null;
    }
    
    return {
      jobId,
      isActive: true,
      screenshotCount: captureResult.screenshots.length,
      duration: Date.now() - captureResult.metadata.startTime.getTime(),
      leadsFound: captureResult.metadata.leadsFound
    };
  }
  
  /**
   * Get all captures for display
   */
  async getAllCaptures(): Promise<any[]> {
    try {
      const screenshotDir = path.join(this.captureDir, 'screenshots');
      const files = await fs.readdir(screenshotDir);
      
      const captures = files
        .filter(f => f.startsWith('summary-'))
        .map(f => ({
          jobId: f.replace('summary-', '').replace('.png', ''),
          summaryImage: path.join(screenshotDir, f),
          timestamp: new Date() // Would get actual timestamp from file
        }));
      
      return captures;
    } catch (error) {
      logger.error('Failed to get captures', error as Error);
      return [];
    }
  }
  
  /**
   * Clean old captures
   */
  async cleanOldCaptures(daysToKeep: number = 7): Promise<void> {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    try {
      const dirs = ['screenshots', 'videos', 'thumbnails'];
      
      for (const dir of dirs) {
        const fullPath = path.join(this.captureDir, dir);
        const files = await fs.readdir(fullPath);
        
        for (const file of files) {
          const filepath = path.join(fullPath, file);
          const stats = await fs.stat(filepath);
          
          if (stats.mtimeMs < cutoffTime) {
            await fs.unlink(filepath);
            logger.debug('Deleted old capture', { filepath });
          }
        }
      }
      
      logger.info('Old captures cleaned', { daysToKeep });
    } catch (error) {
      logger.error('Failed to clean captures', error as Error);
    }
  }
}