/**
 * Bull Queue Configuration
 * Manages job queues for background processing
 */

import Bull from 'bull';
import { Logger } from '../utils/Logger';

const logger = new Logger('QueueConfig');

/**
 * Redis connection configuration
 */
export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
};

/**
 * Default job options for all queues
 */
export const defaultJobOptions: Bull.JobOptions = {
  removeOnComplete: 100, // Keep last 100 completed jobs
  removeOnFail: 500,     // Keep last 500 failed jobs
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000
  }
};

/**
 * Queue names enum for type safety
 */
export enum QueueName {
  LEAD_DISCOVERY = 'lead-discovery',
  LEAD_ENGAGEMENT = 'lead-engagement',
  SESSION_REFRESH = 'session-refresh',
  REPORT_GENERATION = 'report-generation'
}

/**
 * Queue configurations
 */
export const queueConfigs = {
  [QueueName.LEAD_DISCOVERY]: {
    name: QueueName.LEAD_DISCOVERY,
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    },
    rateLimiter: {
      max: 10,        // Max 10 jobs
      duration: 60000 // Per minute
    }
  },
  [QueueName.LEAD_ENGAGEMENT]: {
    name: QueueName.LEAD_ENGAGEMENT,
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 3,
      delay: 5000 // 5 second delay before processing
    },
    rateLimiter: {
      max: 5,
      duration: 60000
    }
  },
  [QueueName.SESSION_REFRESH]: {
    name: QueueName.SESSION_REFRESH,
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 10,
      backoff: {
        type: 'fixed',
        delay: 10000
      }
    }
  },
  [QueueName.REPORT_GENERATION]: {
    name: QueueName.REPORT_GENERATION,
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 2
    }
  }
};

/**
 * Create a Bull queue with configuration
 */
export function createQueue(queueName: QueueName): Bull.Queue {
  const config = queueConfigs[queueName];
  
  const queue = new Bull(config.name, {
    redis: redisConfig,
    defaultJobOptions: config.defaultJobOptions
  });

  // Add event listeners
  queue.on('error', (error) => {
    logger.error(`Queue ${queueName} error`, error);
  });

  queue.on('waiting', (jobId) => {
    logger.debug(`Job ${jobId} waiting in ${queueName}`);
  });

  queue.on('active', (job) => {
    logger.info(`Job ${job.id} active in ${queueName}`, {
      data: job.data,
      attemptsMade: job.attemptsMade
    });
  });

  queue.on('completed', (job, result) => {
    logger.info(`Job ${job.id} completed in ${queueName}`, {
      result,
      processingTime: job.finishedOn ? job.finishedOn - job.timestamp : 0
    });
  });

  queue.on('failed', (job, err) => {
    logger.error(`Job ${job.id} failed in ${queueName}`, err, {
      data: job.data,
      attemptsMade: job.attemptsMade
    });
  });

  queue.on('stalled', (job) => {
    logger.warn(`Job ${job.id} stalled in ${queueName}`, {
      data: job.data
    });
  });

  return queue;
}

/**
 * Queue health check
 */
export async function checkQueueHealth(queue: Bull.Queue): Promise<{
  isHealthy: boolean;
  metrics: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
  };
}> {
  try {
    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.isPaused()
    ]);

    return {
      isHealthy: true,
      metrics: {
        waiting,
        active,
        completed,
        failed,
        delayed,
        paused
      }
    };
  } catch (error) {
    logger.error('Queue health check failed', error as Error);
    return {
      isHealthy: false,
      metrics: {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: true
      }
    };
  }
}

/**
 * Gracefully shutdown all queues
 */
export async function shutdownQueues(queues: Bull.Queue[]): Promise<void> {
  logger.info('Shutting down queues...');
  
  await Promise.all(queues.map(async (queue) => {
    await queue.pause(true); // Pause local processing
    await queue.close();
  }));
  
  logger.info('All queues shut down');
}