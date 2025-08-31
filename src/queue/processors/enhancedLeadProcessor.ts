/**
 * Enhanced Lead Discovery Processor
 * Advanced processing with intelligent caching, anti-detection, and monitoring
 */

import { Job } from 'bull';
import { EnhancedThreadsAgent, SearchOptions } from '../../agents/EnhancedThreadsAgent';
import { DataPersistenceService } from '../../services/DataPersistenceService';
import { SessionManager } from '../../services/SessionManager';
import { MediaCapture } from '../../services/MediaCapture';
import { Logger } from '../../utils/Logger';
import { AppDataSource } from '../../database/config';
import { Session } from '../../database/entities/Session.entity';
import { Account } from '../../database/entities/Account.entity';
import { Agent } from '../../database/entities/Agent.entity';
import { Lead } from '../../database/entities/Lead.entity';

const logger = new Logger('EnhancedLeadProcessor');

export interface EnhancedLeadDiscoveryJobData {
  agentId: string;
  accountId: string;
  keywords: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  config?: {
    maxResults?: number;
    searchDepth?: 'shallow' | 'standard' | 'deep';
    timeRange?: 'hour' | 'day' | 'week' | 'month';
    sortBy?: 'recent' | 'popular' | 'relevant';
    humanization?: {
      enabled: boolean;
      delayBetweenActions?: [number, number];
      mouseMovements?: boolean;
      scrollPatterns?: boolean;
    };
    caching?: {
      enabled: boolean;
      forceFresh?: boolean;
      ttl?: number;
    };
    monitoring?: {
      captureScreenshots: boolean;
      logDetailedMetrics: boolean;
      detectBlocking: boolean;
    };
  };
}

export interface ProcessingResult {
  success: boolean;
  jobId: string | number;
  agentId: string;
  keywords: string[];
  results: {
    totalFound: number;
    processed: number;
    saved: number;
    duplicatesSkipped: number;
    cached: boolean;
    hotLeads: number;
    mediumLeads: number;
    coldLeads: number;
    errors: number;
    processingTimeMs: number;
  };
  leads: Array<{
    id: string;
    author: string;
    category: string;
    score: number;
    url: string;
    cached?: boolean;
  }>;
  metrics: {
    searchStrategiesUsed: string[];
    cacheHitRate: number;
    antiDetectionMeasures: string[];
    sessionHealth: number;
  };
}

/**
 * Process enhanced lead discovery job with intelligent caching and monitoring
 */
export async function processEnhancedLeadDiscoveryJob(
  job: Job<EnhancedLeadDiscoveryJobData>
): Promise<ProcessingResult> {
  const startTime = Date.now();
  const { agentId, accountId, keywords, config } = job.data;
  
  let enhancedAgent: EnhancedThreadsAgent | null = null;
  let dataService: DataPersistenceService | null = null;
  
  const result: ProcessingResult = {
    success: false,
    jobId: job.id,
    agentId,
    keywords,
    results: {
      totalFound: 0,
      processed: 0,
      saved: 0,
      duplicatesSkipped: 0,
      cached: false,
      hotLeads: 0,
      mediumLeads: 0,
      coldLeads: 0,
      errors: 0,
      processingTimeMs: 0
    },
    leads: [],
    metrics: {
      searchStrategiesUsed: [],
      cacheHitRate: 0,
      antiDetectionMeasures: [],
      sessionHealth: 0
    }
  };

  try {
    logger.info(`Processing enhanced lead discovery job ${job.id}`, {
      agentId,
      keywords,
      priority: job.data.priority
    });

    // Initialize services
    dataService = new DataPersistenceService();
    
    await job.progress(5);

    // Get repositories
    const sessionRepo = AppDataSource.getRepository(Session);
    const accountRepo = AppDataSource.getRepository(Account);
    const agentRepo = AppDataSource.getRepository(Agent);
    const leadRepo = AppDataSource.getRepository(Lead);

    // Get agent configuration
    const agent = await agentRepo.findOne({
      where: { id: agentId },
      relations: ['account']
    });

    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    await job.progress(10);

    // Check cache first if enabled
    if (config?.caching?.enabled && !config.caching.forceFresh) {
      const searchOptions: SearchOptions = {
        keywords,
        maxResults: config.maxResults || 50,
        searchDepth: config.searchDepth || 'standard',
        timeRange: config.timeRange || 'day',
        sortBy: config.sortBy || 'relevant'
      };

      const cachedResults = await dataService.getCachedSearchResults(
        keywords.join(' '),
        keywords,
        searchOptions
      );

      if (cachedResults && cachedResults.results.length > 0) {
        logger.info('Using cached search results', {
          query: keywords.join(' '),
          cachedCount: cachedResults.results.length
        });

        // Process cached results
        const savedLeads = await dataService.persistLeads(
          cachedResults.results,
          agentId,
          accountId
        );

        result.success = true;
        result.results.cached = true;
        result.results.totalFound = cachedResults.totalFound;
        result.results.processed = cachedResults.results.length;
        result.results.saved = savedLeads.length;
        result.results.duplicatesSkipped = cachedResults.results.length - savedLeads.length;
        result.leads = savedLeads.map(lead => ({
          id: lead.id,
          author: lead.authorHandle,
          category: lead.category,
          score: lead.score,
          url: lead.postUrl,
          cached: true
        }));
        
        // Update metrics
        const cacheStats = dataService.getCacheStats();
        result.metrics.cacheHitRate = cacheStats.hitRate;
        result.results.processingTimeMs = Date.now() - startTime;

        await job.progress(100);
        return result;
      }
    }

    await job.progress(15);

    // Get healthy session for account
    const sessionManager = new SessionManager(sessionRepo, accountRepo);
    const session = await sessionManager.getHealthySession(accountId);

    if (!session) {
      throw new Error(`No healthy session available for account ${accountId}`);
    }

    result.metrics.sessionHealth = session.healthScore;
    await job.progress(20);

    // Initialize enhanced agent
    enhancedAgent = new EnhancedThreadsAgent({
      session: session ? {
        cookies: JSON.parse(session.encryptedCookies), // Would decrypt in production
        userAgent: session.userAgent,
        accountId: session.accountId
      } : undefined,
      humanization: config?.humanization?.enabled ? {
        delays: {
          betweenActions: config.humanization.delayBetweenActions || [2000, 8000],
          betweenSearches: [5000, 15000],
          typing: [50, 150],
          scrolling: [1000, 3000]
        },
        patterns: {
          scrollBehavior: 'natural',
          clickAccuracy: 0.95,
          typingSpeed: 'variable'
        }
      } : undefined,
      headless: true,
      env: 'BROWSERBASE',
      caching: {
        enabled: config?.caching?.enabled !== false,
        ttl: config?.caching?.ttl || 300000,
        maxSize: 1000
      },
      antiDetection: {
        enabled: true,
        rotateViewport: true,
        randomDelays: config?.humanization?.enabled !== false,
        mouseMovements: config?.humanization?.mouseMovements !== false,
        scrollPatterns: config?.humanization?.scrollPatterns !== false
      },
      monitoring: {
        captureScreenshots: config?.monitoring?.captureScreenshots !== false,
        logMetrics: config?.monitoring?.logDetailedMetrics !== false,
        detectBlocking: config?.monitoring?.detectBlocking !== false
      }
    });

    await enhancedAgent.initialize();
    await job.progress(30);

    // Build search options
    const searchOptions: SearchOptions = {
      keywords,
      maxResults: config?.maxResults || 50,
      searchDepth: config?.searchDepth || 'standard',
      timeRange: config?.timeRange || 'day',
      sortBy: config?.sortBy || 'relevant',
      includeReplies: false
    };

    // Perform enhanced search
    logger.info('Starting enhanced search', { searchOptions });
    const posts = await enhancedAgent.searchPosts(searchOptions);
    
    await job.progress(60);

    result.results.totalFound = posts.length;
    result.results.processed = posts.length;

    // Cache results if enabled
    if (config?.caching?.enabled && posts.length > 0) {
      await dataService.cacheSearchResults(
        keywords.join(' '),
        keywords,
        posts,
        searchOptions
      );
    }

    // Persist leads to database
    const savedLeads = await dataService.persistLeads(posts, agentId, accountId);
    result.results.saved = savedLeads.length;
    result.results.duplicatesSkipped = posts.length - savedLeads.length;

    await job.progress(80);

    // Categorize leads
    result.results.hotLeads = savedLeads.filter(l => l.category === 'hot').length;
    result.results.mediumLeads = savedLeads.filter(l => l.category === 'medium').length;
    result.results.coldLeads = savedLeads.filter(l => l.category === 'cold').length;

    // Build leads result
    result.leads = savedLeads.map(lead => ({
      id: lead.id,
      author: lead.authorHandle,
      category: lead.category,
      score: lead.score,
      url: lead.postUrl
    }));

    // Get enhanced metrics
    const agentMetrics = enhancedAgent.getMetrics();
    result.metrics.cacheHitRate = agentMetrics.successRate;
    
    // Update session health based on success
    const successRate = savedLeads.length / Math.max(posts.length, 1);
    session.healthScore = Math.min(1.0, session.healthScore + (successRate * 0.1));
    session.lastActivityAt = new Date();
    await sessionRepo.save(session);

    result.metrics.sessionHealth = session.healthScore;
    result.results.processingTimeMs = Date.now() - startTime;
    result.success = true;

    await job.progress(100);

    logger.info(`Enhanced lead discovery job ${job.id} completed successfully`, {
      totalFound: result.results.totalFound,
      saved: result.results.saved,
      hotLeads: result.results.hotLeads,
      processingTime: result.results.processingTimeMs
    });

    return result;

  } catch (error) {
    result.results.errors = 1;
    result.results.processingTimeMs = Date.now() - startTime;
    
    logger.error(`Enhanced lead discovery job ${job.id} failed`, error as Error);
    
    // Update session health on failure
    try {
      const sessionRepo = AppDataSource.getRepository(Session);
      const session = await sessionRepo.findOne({ 
        where: { accountId } 
      });
      
      if (session) {
        session.healthScore = Math.max(0, session.healthScore - 0.1);
        session.failureCount = (session.failureCount || 0) + 1;
        await sessionRepo.save(session);
      }
    } catch (sessionError) {
      logger.error('Failed to update session after error', sessionError as Error);
    }

    throw error;

  } finally {
    // Cleanup resources
    if (enhancedAgent) {
      try {
        await enhancedAgent.cleanup();
      } catch (cleanupError) {
        logger.warn('Agent cleanup warning', cleanupError as Error);
      }
    }

    if (dataService) {
      try {
        await dataService.close();
      } catch (closeError) {
        logger.warn('Data service close warning', closeError as Error);
      }
    }
  }
}

/**
 * Process batch lead discovery for multiple agents
 */
export async function processBatchLeadDiscovery(
  jobs: EnhancedLeadDiscoveryJobData[]
): Promise<ProcessingResult[]> {
  const results: ProcessingResult[] = [];
  
  logger.info(`Processing batch of ${jobs.length} lead discovery jobs`);

  // Process in batches of 3 to avoid overwhelming resources
  const batchSize = 3;
  
  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (jobData) => {
      // Create fake job object for compatibility
      const fakeJob = {
        id: `batch-${Date.now()}-${Math.random()}`,
        data: jobData,
        progress: async (progress: number) => {
          logger.debug(`Batch job progress: ${progress}%`, { 
            agentId: jobData.agentId 
          });
        }
      } as Job<EnhancedLeadDiscoveryJobData>;

      try {
        return await processEnhancedLeadDiscoveryJob(fakeJob);
      } catch (error) {
        logger.error('Batch job failed', error as Error, {
          agentId: jobData.agentId
        });
        
        return {
          success: false,
          jobId: fakeJob.id,
          agentId: jobData.agentId,
          keywords: jobData.keywords,
          results: {
            totalFound: 0,
            processed: 0,
            saved: 0,
            duplicatesSkipped: 0,
            cached: false,
            hotLeads: 0,
            mediumLeads: 0,
            coldLeads: 0,
            errors: 1,
            processingTimeMs: 0
          },
          leads: [],
          metrics: {
            searchStrategiesUsed: [],
            cacheHitRate: 0,
            antiDetectionMeasures: [],
            sessionHealth: 0
          }
        } as ProcessingResult;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Brief pause between batches
    if (i + batchSize < jobs.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  const successCount = results.filter(r => r.success).length;
  const totalLeads = results.reduce((sum, r) => sum + r.results.saved, 0);

  logger.info('Batch processing completed', {
    total: jobs.length,
    successful: successCount,
    failed: jobs.length - successCount,
    totalLeadsDiscovered: totalLeads
  });

  return results;
}

/**
 * Health check for enhanced processor
 */
export async function healthCheckEnhancedProcessor(): Promise<{
  healthy: boolean;
  issues: string[];
  metrics: any;
}> {
  const issues: string[] = [];
  let metrics = {};

  try {
    // Test data persistence service
    const dataService = new DataPersistenceService();
    const dataHealth = await dataService.healthCheck();
    
    if (!dataHealth.healthy) {
      issues.push(...dataHealth.issues.map(i => `DataService: ${i}`));
    }

    metrics = {
      ...metrics,
      cacheStats: dataService.getCacheStats()
    };

    await dataService.close();

  } catch (error) {
    issues.push('Data persistence service unavailable');
  }

  try {
    // Test database connection
    const leadRepo = AppDataSource.getRepository(Lead);
    await leadRepo.count();
  } catch (error) {
    issues.push('Database connection failed');
  }

  try {
    // Test session manager
    const sessionRepo = AppDataSource.getRepository(Session);
    const accountRepo = AppDataSource.getRepository(Account);
    const sessionManager = new SessionManager(sessionRepo, accountRepo);
    
    const stats = await sessionManager.getStatistics();
    metrics = { ...metrics, sessionStats: stats };
    
  } catch (error) {
    issues.push('Session manager unavailable');
  }

  return {
    healthy: issues.length === 0,
    issues,
    metrics
  };
}