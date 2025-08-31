/**
 * Queue Management API Routes
 * Provides endpoints for queue monitoring and control
 */

import { Router, Request, Response } from 'express';
import { QueueManager } from '../../queue/QueueManager';
import { AppDataSource } from '../../database/config';
import { Agent } from '../../database/entities/Agent.entity';
import { Lead } from '../../database/entities/Lead.entity';
import { Logger } from '../../utils/Logger';

const logger = new Logger('QueueRoutes');
const router = Router();

/**
 * Get all queue statistics
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const queueManager = QueueManager.getInstance();
    
    if (!queueManager.isReady()) {
      return res.status(503).json({
        error: 'Queue system not initialized'
      });
    }
    
    const stats = await queueManager.getQueueStats();
    const formattedStats: any = {};
    
    for (const [queueName, queueStats] of stats) {
      formattedStats[queueName] = queueStats;
    }
    
    res.json({
      success: true,
      data: formattedStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get queue stats', error as Error);
    res.status(500).json({
      error: 'Failed to retrieve queue statistics'
    });
  }
});

/**
 * Get jobs for a specific queue
 */
router.get('/:queueName/jobs', async (req: Request, res: Response) => {
  try {
    const { queueName } = req.params;
    const { states = 'waiting,active,completed,failed', limit = '20' } = req.query;
    
    const queueManager = QueueManager.getInstance();
    
    if (!queueManager.isReady()) {
      return res.status(503).json({
        error: 'Queue system not initialized'
      });
    }
    
    const stateArray = (states as string).split(',') as any[];
    const jobs = await queueManager.getJobs(
      queueName as any,
      stateArray,
      0,
      parseInt(limit as string)
    );
    
    const formattedJobs = await Promise.all(jobs.map(async (job) => ({
      id: job.id,
      data: job.data,
      state: await job.getState(),
      progress: job.progress(),
      attemptsMade: job.attemptsMade,
      createdAt: new Date(job.timestamp).toISOString(),
      processedOn: job.processedOn ? new Date(job.processedOn).toISOString() : null,
      finishedOn: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
      result: job.returnvalue,
      failedReason: job.failedReason
    })));
    
    res.json({
      success: true,
      data: formattedJobs,
      count: formattedJobs.length
    });
  } catch (error) {
    logger.error('Failed to get jobs', error as Error);
    res.status(500).json({
      error: 'Failed to retrieve jobs'
    });
  }
});

/**
 * Get a specific job by ID
 */
router.get('/:queueName/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const { queueName, jobId } = req.params;
    const queueManager = QueueManager.getInstance();
    
    if (!queueManager.isReady()) {
      return res.status(503).json({
        error: 'Queue system not initialized'
      });
    }
    
    const job = await queueManager.getJob(queueName as any, jobId ? jobId.toString() : '');
    
    if (!job) {
      return res.status(404).json({
        error: 'Job not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: job.id,
        data: job.data,
        state: await job.getState(),
        progress: job.progress(),
        attemptsMade: job.attemptsMade,
        createdAt: new Date(job.timestamp).toISOString(),
        processedOn: job.processedOn ? new Date(job.processedOn).toISOString() : null,
        finishedOn: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
        result: job.returnvalue,
        failedReason: job.failedReason,
        stacktrace: job.stacktrace,
        opts: job.opts
      }
    });
  } catch (error) {
    logger.error('Failed to get job', error as Error);
    res.status(500).json({
      error: 'Failed to retrieve job'
    });
  }
});

/**
 * Add a new lead discovery job
 */
router.post('/lead-discovery/jobs', async (req: Request, res: Response) => {
  try {
    const { agentId, keywords, priority = 'normal' } = req.body;
    
    if (!agentId || !keywords || !Array.isArray(keywords)) {
      return res.status(400).json({
        error: 'Missing required fields: agentId and keywords (array)'
      });
    }
    
    const queueManager = QueueManager.getInstance();
    
    if (!queueManager.isReady()) {
      return res.status(503).json({
        error: 'Queue system not initialized'
      });
    }
    
    // Verify agent exists
    const agentRepo = AppDataSource.getRepository(Agent);
    const agent = await agentRepo.findOne({ where: { id: agentId } });
    
    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found'
      });
    }
    
    if (!agent.isActive) {
      return res.status(400).json({
        error: 'Agent is not active'
      });
    }
    
    // Add job to queue
    const job = await queueManager.addLeadDiscoveryJob({
      agentId,
      keywords,
      priority,
      metadata: {
        triggeredBy: 'api',
        scheduledRun: false
      }
    }, {
      priority: priority === 'high' ? 1 : priority === 'low' ? 10 : 5
    });
    
    res.status(201).json({
      success: true,
      data: {
        jobId: job.id,
        agentId,
        keywords,
        priority,
        state: await job.getState()
      }
    });
  } catch (error) {
    logger.error('Failed to add job', error as Error);
    res.status(500).json({
      error: 'Failed to add job to queue'
    });
  }
});

/**
 * Pause a queue
 */
router.post('/:queueName/pause', async (req: Request, res: Response) => {
  try {
    const { queueName } = req.params;
    const queueManager = QueueManager.getInstance();
    
    if (!queueManager.isReady()) {
      return res.status(503).json({
        error: 'Queue system not initialized'
      });
    }
    
    await queueManager.pauseQueue(queueName as any);
    
    res.json({
      success: true,
      message: `Queue ${queueName} paused`
    });
  } catch (error) {
    logger.error('Failed to pause queue', error as Error);
    res.status(500).json({
      error: 'Failed to pause queue'
    });
  }
});

/**
 * Resume a queue
 */
router.post('/:queueName/resume', async (req: Request, res: Response) => {
  try {
    const { queueName } = req.params;
    const queueManager = QueueManager.getInstance();
    
    if (!queueManager.isReady()) {
      return res.status(503).json({
        error: 'Queue system not initialized'
      });
    }
    
    await queueManager.resumeQueue(queueName as any);
    
    res.json({
      success: true,
      message: `Queue ${queueName} resumed`
    });
  } catch (error) {
    logger.error('Failed to resume queue', error as Error);
    res.status(500).json({
      error: 'Failed to resume queue'
    });
  }
});

/**
 * Clean old jobs from a queue
 */
router.post('/:queueName/clean', async (req: Request, res: Response) => {
  try {
    const { queueName } = req.params;
    const { grace = 3600000 } = req.body; // Default 1 hour
    
    const queueManager = QueueManager.getInstance();
    
    if (!queueManager.isReady()) {
      return res.status(503).json({
        error: 'Queue system not initialized'
      });
    }
    
    await queueManager.cleanJobs(queueName as any, grace);
    
    res.json({
      success: true,
      message: `Cleaned jobs older than ${grace}ms from ${queueName}`
    });
  } catch (error) {
    logger.error('Failed to clean queue', error as Error);
    res.status(500).json({
      error: 'Failed to clean queue'
    });
  }
});

/**
 * Get recent leads for an agent
 */
router.get('/agents/:agentId/leads', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { limit = '20' } = req.query;
    
    const leadRepo = AppDataSource.getRepository(Lead);
    const leads = await leadRepo.find({
      where: { agentId },
      order: { createdAt: 'DESC' },
      take: parseInt(limit as string)
    });
    
    res.json({
      success: true,
      data: leads.map(lead => ({
        id: lead.id,
        authorHandle: lead.authorHandle,
        category: lead.category,
        score: parseFloat(lead.score.toString()),
        content: {
          text: lead.content.text.substring(0, 200) + '...',
          hashtags: lead.content.hashtags
        },
        metrics: lead.metrics,
        postUrl: lead.postUrl,
        createdAt: lead.createdAt
      })),
      count: leads.length
    });
  } catch (error) {
    logger.error('Failed to get leads', error as Error);
    res.status(500).json({
      error: 'Failed to retrieve leads'
    });
  }
});

export default router;