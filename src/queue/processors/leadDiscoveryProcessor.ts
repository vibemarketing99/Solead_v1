/**
 * Lead Discovery Queue Processor
 * Handles background lead discovery jobs
 */

import { Job } from 'bull';
import { SimpleStagehandWorker } from '../../workers/SimpleStagehandWorker';
import { Agent } from '../../database/entities/Agent.entity';
import { Lead } from '../../database/entities/Lead.entity';
import { Task } from '../../database/entities/Task.entity';
import { SessionManager } from '../../services/SessionManager';
import { createMockAutomationFactory } from '../../mocks/MockAutomation';
import { Logger } from '../../utils/Logger';
import { AppDataSource } from '../../database/config';

const logger = new Logger('LeadDiscoveryProcessor');

/**
 * Job data structure for lead discovery
 */
export interface LeadDiscoveryJobData {
  agentId: string;
  keywords: string[];
  priority?: 'high' | 'normal' | 'low';
  metadata?: {
    triggeredBy?: string;
    scheduledRun?: boolean;
    retryCount?: number;
  };
}

/**
 * Job result structure
 */
export interface LeadDiscoveryJobResult {
  success: boolean;
  leadsDiscovered: number;
  processingTime: number;
  errors?: string[];
}

// Singleton worker instance
let workerInstance: SimpleStagehandWorker | null = null;

/**
 * Initialize the worker instance
 */
async function initializeWorker(): Promise<SimpleStagehandWorker> {
  if (workerInstance) {
    return workerInstance;
  }

  const taskRepo = AppDataSource.getRepository(Task);
  const agentRepo = AppDataSource.getRepository(Agent);
  const leadRepo = AppDataSource.getRepository(Lead);
  const sessionRepo = AppDataSource.getRepository('Session');
  const accountRepo = AppDataSource.getRepository('Account');
  
  const sessionManager = new SessionManager(sessionRepo as any, accountRepo as any);
  
  // Create automation factory (using mock for now)
  const automationFactory = createMockAutomationFactory({
    searchDelay: 1000,
    searchVariance: 500,
    postsPerSearch: 5,
    failureRate: 0.05, // 5% failure rate
    humanPatternDelay: 2000
  });
  
  // Create worker with pool size based on environment
  const poolSize = parseInt(process.env.WORKER_POOL_SIZE || '3');
  workerInstance = new SimpleStagehandWorker(
    taskRepo,
    agentRepo,
    leadRepo,
    sessionManager,
    automationFactory,
    poolSize
  );
  
  await workerInstance.initialize();
  logger.info('Worker initialized', { poolSize });
  
  return workerInstance;
}

/**
 * Process lead discovery job
 */
export async function processLeadDiscovery(job: Job<LeadDiscoveryJobData>): Promise<LeadDiscoveryJobResult> {
  const startTime = Date.now();
  const { agentId, keywords, priority, metadata } = job.data;
  
  logger.info('Processing lead discovery job', {
    jobId: job.id,
    agentId,
    keywords,
    priority,
    metadata
  });
  
  try {
    // Ensure database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    
    // Initialize worker if needed
    const worker = await initializeWorker();
    
    // Update job progress
    await job.progress(10);
    
    // Verify agent exists and is active
    const agentRepo = AppDataSource.getRepository(Agent);
    const agent = await agentRepo.findOne({ where: { id: agentId } });
    
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    
    if (!agent.isActive) {
      throw new Error(`Agent ${agentId} is not active`);
    }
    
    await job.progress(20);
    
    // Check daily cap
    const leadRepo = AppDataSource.getRepository(Lead);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayLeadsCount = await leadRepo
      .createQueryBuilder('lead')
      .where('lead.agentId = :agentId', { agentId })
      .andWhere('lead.createdAt >= :today', { today })
      .getCount();
    
    if (todayLeadsCount >= agent.dailyCap) {
      logger.warn('Daily cap reached for agent', {
        agentId,
        dailyCap: agent.dailyCap,
        todayLeadsCount
      });
      
      return {
        success: false,
        leadsDiscovered: 0,
        processingTime: Date.now() - startTime,
        errors: [`Daily cap of ${agent.dailyCap} leads reached`]
      };
    }
    
    await job.progress(30);
    
    // Process lead discovery
    const beforeCount = await leadRepo.count({ where: { agentId } });
    
    await job.progress(40);
    
    // Execute discovery with priority-based processing
    if (priority === 'high') {
      // Process immediately with more resources
      await worker.processLeadDiscovery(agentId, keywords);
    } else if (priority === 'low') {
      // Add small delay for low priority
      await new Promise(resolve => setTimeout(resolve, 2000));
      await worker.processLeadDiscovery(agentId, keywords);
    } else {
      // Normal processing
      await worker.processLeadDiscovery(agentId, keywords);
    }
    
    await job.progress(80);
    
    const afterCount = await leadRepo.count({ where: { agentId } });
    const leadsDiscovered = afterCount - beforeCount;
    
    // Update agent's last run time
    agent.lastRunAt = new Date();
    await agentRepo.save(agent);
    
    await job.progress(100);
    
    logger.info('Lead discovery job completed', {
      jobId: job.id,
      agentId,
      leadsDiscovered,
      processingTime: Date.now() - startTime
    });
    
    return {
      success: true,
      leadsDiscovered,
      processingTime: Date.now() - startTime
    };
    
  } catch (error) {
    logger.error('Lead discovery job failed', error as Error, {
      jobId: job.id,
      agentId,
      attemptsMade: job.attemptsMade
    });
    
    // If this is the last attempt, update agent status
    if (job.attemptsMade >= (job.opts.attempts || 3) - 1) {
      try {
        const agentRepo = AppDataSource.getRepository(Agent);
        const agent = await agentRepo.findOne({ where: { id: agentId } });
        if (agent) {
          agent.lastRunAt = new Date();
          await agentRepo.save(agent);
        }
      } catch (updateError) {
        logger.error('Failed to update agent after job failure', updateError as Error);
      }
    }
    
    throw error; // Re-throw to mark job as failed
  }
}

/**
 * Cleanup worker on shutdown
 */
export async function cleanupWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.shutdown();
    workerInstance = null;
    logger.info('Worker cleaned up');
  }
}