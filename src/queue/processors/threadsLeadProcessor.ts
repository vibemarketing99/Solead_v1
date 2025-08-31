/**
 * Threads Lead Discovery Processor
 * Processes lead discovery jobs using ThreadsAutomationAgent
 */

import { Job } from 'bull';
import { ThreadsAutomationAgent } from '../../agents/ThreadsAutomationAgent';
import { SessionManager } from '../../services/SessionManager';
import { MediaCapture } from '../../services/MediaCapture';
import { Logger } from '../../utils/Logger';
import { AppDataSource } from '../../database/config';
import { Session } from '../../database/entities/Session.entity';
import { Account } from '../../database/entities/Account.entity';
import { Agent } from '../../database/entities/Agent.entity';
import { Lead } from '../../database/entities/Lead.entity';

const logger = new Logger('ThreadsLeadProcessor');

export interface LeadDiscoveryJobData {
  agentId: string;
  accountId: string;
  keywords: string[];
  priority: 'low' | 'normal' | 'high';
  config?: {
    maxResults?: number;
    searchDepth?: 'shallow' | 'standard' | 'deep';
    humanization?: {
      enabled: boolean;
      delayBetweenActions?: [number, number];
    };
  };
}

/**
 * Process a lead discovery job
 */
export async function processLeadDiscoveryJob(job: Job<LeadDiscoveryJobData>) {
  const { agentId, accountId, keywords, config } = job.data;
  const mediaCapture = new MediaCapture();
  let threadsAgent: ThreadsAutomationAgent | null = null;

  try {
    logger.info(`Processing lead discovery job ${job.id}`, {
      agentId,
      keywords,
      priority: job.data.priority
    });

    // Update job progress
    await job.progress(10);

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

    // Get a healthy session for this account
    const sessionManager = new SessionManager(sessionRepo, accountRepo);
    const session = await sessionManager.getHealthySession(accountId);

    if (!session) {
      throw new Error(`No healthy session available for account ${accountId}`);
    }

    await job.progress(20);

    // Initialize Threads automation agent
    threadsAgent = new ThreadsAutomationAgent({
      session: {
        cookies: JSON.parse(session.encryptedCookies), // Would decrypt in production
        userAgent: session.userAgent,
        accountId: session.accountId
      },
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
      env: 'BROWSERBASE'
    });

    await threadsAgent.initialize();
    
    await job.progress(30);

    // Capture initial state
    await mediaCapture.captureState(
      `job-${job.id}`,
      'initializing',
      { keywords, agentId }
    );

    // Search for posts
    logger.info(`Searching Threads for keywords: ${keywords.join(', ')}`);
    const posts = await threadsAgent.searchPosts(keywords);
    
    await job.progress(50);

    // Capture search results
    await mediaCapture.captureState(
      `job-${job.id}`,
      'search-complete',
      { 
        keywords, 
        resultsFound: posts.length 
      }
    );

    // Process and save leads
    const maxResults = config?.maxResults || 50;
    const leadsToProcess = posts.slice(0, maxResults);
    const savedLeads: Lead[] = [];
    const errors: any[] = [];

    for (let i = 0; i < leadsToProcess.length; i++) {
      const post = leadsToProcess[i];
      
      try {
        // Calculate lead score
        const score = calculateLeadScore(post, keywords);
        
        // Determine category based on score
        let category: 'hot' | 'medium' | 'cold';
        if (score > 0.7) category = 'hot';
        else if (score > 0.4) category = 'medium';
        else category = 'cold';

        // Skip low-quality leads in production
        if (category === 'cold' && process.env.NODE_ENV === 'production') {
          continue;
        }

        // Create lead entity
        const lead = leadRepo.create({
          accountId,
          agentId,
          postId: post.id || `threads-${Date.now()}-${i}`,
          postUrl: post.url || '',
          authorHandle: post.author.handle,
          authorDisplayName: post.author.displayName,
          authorAvatarUrl: post.author.avatarUrl,
          authorIsVerified: post.author.isVerified || false,
          content: {
            text: post.text,
            hashtags: post.hashtags || [],
            mentions: post.mentions || [],
            links: post.links || []
          },
          metrics: {
            likes: post.metrics?.likes || 0,
            replies: post.metrics?.replies || 0,
            reposts: post.metrics?.reposts || 0,
            views: post.metrics?.views || 0
          },
          category,
          score,
          status: 'new',
          createdAt: new Date()
        });

        const savedLead = await leadRepo.save(lead);
        savedLeads.push(savedLead);

        // Capture lead screenshot
        if (category === 'hot') {
          await mediaCapture.captureState(
            `job-${job.id}`,
            `lead-${savedLead.id}`,
            {
              leadId: savedLead.id,
              category,
              score,
              author: post.author.handle
            }
          );
        }

        // Update progress
        const progress = 50 + Math.floor((i / leadsToProcess.length) * 40);
        await job.progress(progress);

        // Human-like behavior between leads
        if (threadsAgent.isActive() && config?.humanization?.enabled) {
          await threadsAgent.performHumanBehavior();
        }

      } catch (error) {
        logger.error(`Failed to process lead ${i}`, error as Error);
        errors.push({
          index: i,
          error: (error as Error).message
        });
      }
    }

    // Update session health based on success
    const successRate = savedLeads.length / Math.max(1, leadsToProcess.length);
    session.healthScore = Math.min(1.0, session.healthScore + (successRate * 0.1));
    session.lastActivityAt = new Date();
    await sessionRepo.save(session);

    // Capture completion state
    await mediaCapture.captureState(
      `job-${job.id}`,
      'complete',
      {
        totalProcessed: leadsToProcess.length,
        totalSaved: savedLeads.length,
        errors: errors.length
      }
    );

    await job.progress(100);

    logger.info(`Lead discovery job ${job.id} completed`, {
      processed: leadsToProcess.length,
      saved: savedLeads.length,
      errors: errors.length
    });

    return {
      success: true,
      jobId: job.id,
      agentId,
      keywords,
      results: {
        totalFound: posts.length,
        processed: leadsToProcess.length,
        saved: savedLeads.length,
        hotLeads: savedLeads.filter(l => l.category === 'hot').length,
        mediumLeads: savedLeads.filter(l => l.category === 'medium').length,
        errors: errors.length
      },
      leads: savedLeads.map(lead => ({
        id: lead.id,
        author: lead.authorHandle,
        category: lead.category,
        score: lead.score,
        url: lead.postUrl
      }))
    };

  } catch (error) {
    logger.error(`Lead discovery job ${job.id} failed`, error as Error);
    
    // Capture error state
    await mediaCapture.captureState(
      `job-${job.id}`,
      'error',
      {
        error: (error as Error).message,
        stack: (error as Error).stack
      }
    );

    throw error;
  } finally {
    // Clean up resources
    if (threadsAgent) {
      await threadsAgent.cleanup();
    }
  }
}

/**
 * Calculate lead score based on PRD criteria
 */
function calculateLeadScore(post: any, keywords: string[]): number {
  let score = 0;
  
  // Topic match (35% weight)
  const text = (post.text || '').toLowerCase();
  const matchedKeywords = keywords.filter(k => 
    text.includes(k.toLowerCase())
  );
  const topicMatch = matchedKeywords.length / Math.max(1, keywords.length);
  score += topicMatch * 0.35;
  
  // Engagement velocity (20% weight)
  const totalEngagement = (post.metrics?.likes || 0) + 
                          (post.metrics?.replies || 0) * 2 + 
                          (post.metrics?.reposts || 0) * 3;
  const views = Math.max(1, post.metrics?.views || 1);
  const engagementRate = totalEngagement / views;
  score += Math.min(1, engagementRate * 10) * 0.20;
  
  // Recency (15% weight)
  if (post.timestamp) {
    const hoursSincePost = (Date.now() - new Date(post.timestamp).getTime()) / (1000 * 60 * 60);
    const recencyScore = Math.max(0, 1 - (hoursSincePost / 168)); // 1 week decay
    score += recencyScore * 0.15;
  } else {
    score += 0.075; // Default to middle value if no timestamp
  }
  
  // Answerability (15% weight)
  const questionPatterns = [
    /\?/,
    /\bhow\b/i,
    /\bwhat\b/i,
    /\bwhen\b/i,
    /\bwhere\b/i,
    /\bwhy\b/i,
    /\bhelp\b/i,
    /\bneed\b/i,
    /\blooking for\b/i,
    /\brecommend/i,
    /\bsuggestion/i,
    /\badvice/i
  ];
  
  const hasQuestion = questionPatterns.some(pattern => pattern.test(text));
  if (hasQuestion) {
    score += 0.15;
  }
  
  // Author quality (10% weight)
  if (post.author?.isVerified) {
    score += 0.05;
  }
  
  const followerCount = post.author?.followerCount || 0;
  const followerScore = Math.min(1, followerCount / 10000);
  score += followerScore * 0.05;
  
  // Toxicity penalty (-15% weight)
  const toxicPatterns = [
    /\bspam\b/i,
    /\bscam\b/i,
    /\bfake\b/i,
    /\bstupid\b/i,
    /\bhate\b/i,
    /\bsucks\b/i,
    /\bterrible\b/i
  ];
  
  const hasToxicity = toxicPatterns.some(pattern => pattern.test(text));
  if (hasToxicity) {
    score -= 0.15;
  }
  
  // Ensure score is between 0 and 1
  return Math.max(0, Math.min(1, score));
}