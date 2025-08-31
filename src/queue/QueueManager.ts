/**
 * Queue Manager
 * Centralized management of all Bull queues
 */

import Bull from 'bull';
import { createQueue, QueueName, checkQueueHealth, shutdownQueues } from './config';
import { processLeadDiscovery, cleanupWorker, LeadDiscoveryJobData } from './processors/leadDiscoveryProcessor';
import { Logger } from '../utils/Logger';

const logger = new Logger('QueueManager');

/**
 * QueueManager singleton class
 */
export class QueueManager {
  private static instance: QueueManager;
  private queues: Map<QueueName, Bull.Queue> = new Map();
  private isInitialized: boolean = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  /**
   * Initialize all queues and processors
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('QueueManager already initialized');
      return;
    }

    logger.info('Initializing QueueManager...');

    try {
      // Create queues
      this.queues.set(QueueName.LEAD_DISCOVERY, createQueue(QueueName.LEAD_DISCOVERY));
      this.queues.set(QueueName.LEAD_ENGAGEMENT, createQueue(QueueName.LEAD_ENGAGEMENT));
      this.queues.set(QueueName.SESSION_REFRESH, createQueue(QueueName.SESSION_REFRESH));
      this.queues.set(QueueName.REPORT_GENERATION, createQueue(QueueName.REPORT_GENERATION));

      // Register processors
      await this.registerProcessors();

      // Setup recurring jobs
      await this.setupRecurringJobs();

      this.isInitialized = true;
      logger.info('QueueManager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize QueueManager', error as Error);
      throw error;
    }
  }

  /**
   * Register job processors
   */
  private async registerProcessors(): Promise<void> {
    // Lead Discovery Processor
    const leadDiscoveryQueue = this.queues.get(QueueName.LEAD_DISCOVERY);
    if (leadDiscoveryQueue) {
      leadDiscoveryQueue.process(3, processLeadDiscovery); // Process up to 3 jobs concurrently
      logger.info('Lead discovery processor registered');
    }

    // Lead Engagement Processor (placeholder)
    const leadEngagementQueue = this.queues.get(QueueName.LEAD_ENGAGEMENT);
    if (leadEngagementQueue) {
      leadEngagementQueue.process(async (job) => {
        logger.info('Processing lead engagement job', { jobId: job.id, data: job.data });
        // TODO: Implement lead engagement logic
        return { success: true };
      });
    }

    // Session Refresh Processor (placeholder)
    const sessionRefreshQueue = this.queues.get(QueueName.SESSION_REFRESH);
    if (sessionRefreshQueue) {
      sessionRefreshQueue.process(async (job) => {
        logger.info('Processing session refresh job', { jobId: job.id, data: job.data });
        // TODO: Implement session refresh logic
        return { success: true };
      });
    }

    // Report Generation Processor (placeholder)
    const reportGenerationQueue = this.queues.get(QueueName.REPORT_GENERATION);
    if (reportGenerationQueue) {
      reportGenerationQueue.process(async (job) => {
        logger.info('Processing report generation job', { jobId: job.id, data: job.data });
        // TODO: Implement report generation logic
        return { success: true };
      });
    }
  }

  /**
   * Setup recurring jobs
   */
  private async setupRecurringJobs(): Promise<void> {
    // Example: Daily report generation at 9 AM
    const reportQueue = this.queues.get(QueueName.REPORT_GENERATION);
    if (reportQueue) {
      await reportQueue.add(
        'daily-report',
        { type: 'daily', date: new Date() },
        {
          repeat: {
            cron: '0 9 * * *', // Every day at 9 AM
            tz: 'America/New_York'
          }
        }
      );
      logger.info('Daily report job scheduled');
    }
  }

  /**
   * Add a lead discovery job
   */
  async addLeadDiscoveryJob(
    data: LeadDiscoveryJobData,
    options?: Bull.JobOptions
  ): Promise<Bull.Job<LeadDiscoveryJobData>> {
    const queue = this.queues.get(QueueName.LEAD_DISCOVERY);
    if (!queue) {
      throw new Error('Lead discovery queue not initialized');
    }

    const job = await queue.add(data, options);
    logger.info('Lead discovery job added', { 
      jobId: job.id, 
      agentId: data.agentId,
      keywords: data.keywords 
    });
    
    return job;
  }

  /**
   * Get queue by name
   */
  getQueue(queueName: QueueName): Bull.Queue | undefined {
    return this.queues.get(queueName);
  }

  /**
   * Get all queue stats
   */
  async getQueueStats(): Promise<Map<QueueName, any>> {
    const stats = new Map();
    
    for (const [name, queue] of this.queues) {
      const health = await checkQueueHealth(queue);
      stats.set(name, health);
    }
    
    return stats;
  }

  /**
   * Get job by ID
   */
  async getJob(queueName: QueueName, jobId: string): Promise<Bull.Job | null> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      return null;
    }
    
    return queue.getJob(jobId);
  }

  /**
   * Get jobs by state
   */
  async getJobs(
    queueName: QueueName, 
    states: Bull.JobStatus[], 
    start = 0, 
    end = 20
  ): Promise<Bull.Job[]> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      return [];
    }
    
    const jobs: Bull.Job[] = [];
    for (const state of states) {
      const stateJobs = await queue.getJobs([state], start, end);
      jobs.push(...stateJobs);
    }
    
    return jobs;
  }

  /**
   * Clean completed/failed jobs
   */
  async cleanJobs(queueName: QueueName, grace = 3600000): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      return;
    }
    
    await queue.clean(grace, 'completed');
    await queue.clean(grace, 'failed');
    logger.info(`Cleaned jobs older than ${grace}ms from ${queueName}`);
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName: QueueName): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.pause();
      logger.info(`Queue ${queueName} paused`);
    }
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName: QueueName): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.resume();
      logger.info(`Queue ${queueName} resumed`);
    }
  }

  /**
   * Shutdown all queues gracefully
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down QueueManager...');
    
    try {
      // Clean up processors
      await cleanupWorker();
      
      // Shutdown all queues
      const queueArray = Array.from(this.queues.values());
      await shutdownQueues(queueArray);
      
      this.queues.clear();
      this.isInitialized = false;
      
      logger.info('QueueManager shut down successfully');
    } catch (error) {
      logger.error('Error during QueueManager shutdown', error as Error);
      throw error;
    }
  }

  /**
   * Check if manager is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}