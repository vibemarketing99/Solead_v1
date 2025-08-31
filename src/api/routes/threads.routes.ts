/**
 * Threads API Routes
 * Real endpoints for Threads integration using Stagehand automation
 */

import { Router, Request, Response } from 'express';
import { ThreadsAutomationAgent } from '../../agents/ThreadsAutomationAgent';
import { SessionManager } from '../../services/SessionManager';
import { QueueManager } from '../../queue/QueueManager';
import { Logger } from '../../utils/Logger';
import { AppDataSource } from '../../database/config';
import { Session } from '../../database/entities/Session.entity';
import { Account } from '../../database/entities/Account.entity';
import { Lead } from '../../database/entities/Lead.entity';
import { Agent } from '../../database/entities/Agent.entity';

const router = Router();
const logger = new Logger('ThreadsAPI');

/**
 * Initialize Threads agent with session
 */
router.post('/sessions/initialize', async (req: Request, res: Response) => {
  try {
    const { accountId, username, password } = req.body;

    if (!accountId || (!username && !password)) {
      return res.status(400).json({
        success: false,
        error: 'Account ID and credentials required'
      });
    }

    // Get repositories
    const sessionRepo = AppDataSource.getRepository(Session);
    const accountRepo = AppDataSource.getRepository(Account);
    
    // Create session manager
    const sessionManager = new SessionManager(sessionRepo, accountRepo);
    
    // Check if account exists
    let account = await accountRepo.findOne({ where: { id: accountId } });
    if (!account) {
      // Create new account
      account = accountRepo.create({
        id: accountId,
        username: username || accountId,
        status: 'active',
        createdAt: new Date()
      });
      await accountRepo.save(account);
    }

    // Initialize Threads agent
    const agent = new ThreadsAutomationAgent({
      headless: process.env.NODE_ENV === 'production',
      env: 'BROWSERBASE'
    });

    await agent.initialize();
    
    // Login to Threads
    const loginSuccess = await agent.login(username, password);
    
    if (!loginSuccess) {
      await agent.cleanup();
      return res.status(401).json({
        success: false,
        error: 'Failed to login to Threads'
      });
    }

    // Get session cookies
    const sessionData = await agent.getCurrentSession();
    
    if (!sessionData) {
      await agent.cleanup();
      return res.status(500).json({
        success: false,
        error: 'Failed to capture session'
      });
    }

    // Store session in database
    const session = await sessionManager.createSession(
      accountId,
      JSON.stringify(sessionData.cookies),
      sessionData.userAgent
    );

    await agent.cleanup();

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        accountId: account.id,
        healthScore: session.healthScore,
        expiresAt: session.expiresAt
      }
    });
  } catch (error) {
    logger.error('Failed to initialize session', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize Threads session'
    });
  }
});

/**
 * Search Threads for posts
 */
router.post('/search', async (req: Request, res: Response) => {
  try {
    const { keywords, sessionId, limit = 10 } = req.body;

    if (!keywords || !Array.isArray(keywords)) {
      return res.status(400).json({
        success: false,
        error: 'Keywords array required'
      });
    }

    // Get session
    const sessionRepo = AppDataSource.getRepository(Session);
    const session = await sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['account']
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Initialize agent with session
    const agent = new ThreadsAutomationAgent({
      session: {
        cookies: JSON.parse(session.encryptedCookies), // Would decrypt in production
        userAgent: session.userAgent,
        accountId: session.accountId
      },
      headless: true,
      env: 'BROWSERBASE'
    });

    await agent.initialize();
    
    // Search for posts
    const posts = await agent.searchPosts(keywords);
    
    // Apply limit
    const limitedPosts = posts.slice(0, limit);
    
    // Save leads to database
    const leadRepo = AppDataSource.getRepository(Lead);
    const savedLeads = [];

    for (const post of limitedPosts) {
      // Calculate lead score
      const score = calculateLeadScore(post, keywords);
      
      const lead = leadRepo.create({
        accountId: session.accountId,
        postId: post.id || `threads-${Date.now()}`,
        postUrl: post.url || '',
        authorHandle: post.author.handle,
        authorDisplayName: post.author.displayName,
        authorAvatarUrl: post.author.avatarUrl,
        authorIsVerified: post.author.isVerified || false,
        content: {
          text: post.text,
          hashtags: post.hashtags || [],
          mentions: [],
          links: []
        },
        metrics: {
          likes: post.metrics?.likes || 0,
          replies: post.metrics?.replies || 0,
          reposts: post.metrics?.reposts || 0,
          views: post.metrics?.views || 0
        },
        category: score > 0.7 ? 'hot' : 'medium',
        score,
        status: 'new',
        createdAt: new Date()
      });

      const savedLead = await leadRepo.save(lead);
      savedLeads.push(savedLead);
    }

    await agent.cleanup();

    res.json({
      success: true,
      data: {
        posts: limitedPosts,
        leads: savedLeads,
        totalFound: posts.length,
        saved: savedLeads.length
      }
    });
  } catch (error) {
    logger.error('Search failed', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to search Threads'
    });
  }
});

/**
 * Create automated lead discovery job
 */
router.post('/agents/:agentId/discover', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { keywords, priority = 'normal' } = req.body;

    if (!keywords || !Array.isArray(keywords)) {
      return res.status(400).json({
        success: false,
        error: 'Keywords array required'
      });
    }

    // Get agent
    const agentRepo = AppDataSource.getRepository(Agent);
    const agent = await agentRepo.findOne({
      where: { id: agentId },
      relations: ['account']
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    // Add job to queue
    const queueManager = QueueManager.getInstance();
    const jobId = await queueManager.addLeadDiscoveryJob({
      agentId: agent.id,
      accountId: agent.accountId,
      keywords,
      priority,
      config: {
        maxResults: 50,
        searchDepth: 'standard',
        humanization: {
          enabled: true,
          delayBetweenActions: [2000, 8000]
        }
      }
    });

    res.json({
      success: true,
      data: {
        jobId,
        agentId: agent.id,
        keywords,
        priority,
        status: 'queued'
      }
    });
  } catch (error) {
    logger.error('Failed to create discovery job', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to create discovery job'
    });
  }
});

/**
 * Get leads for an agent
 */
router.get('/agents/:agentId/leads', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { category, status, limit = 50, offset = 0 } = req.query;

    // Get agent
    const agentRepo = AppDataSource.getRepository(Agent);
    const agent = await agentRepo.findOne({ where: { id: agentId } });

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    // Build query
    const leadRepo = AppDataSource.getRepository(Lead);
    const query = leadRepo.createQueryBuilder('lead')
      .where('lead.accountId = :accountId', { accountId: agent.accountId })
      .orderBy('lead.score', 'DESC')
      .addOrderBy('lead.createdAt', 'DESC')
      .take(Number(limit))
      .skip(Number(offset));

    if (category) {
      query.andWhere('lead.category = :category', { category });
    }

    if (status) {
      query.andWhere('lead.status = :status', { status });
    }

    const [leads, total] = await query.getManyAndCount();

    res.json({
      success: true,
      data: leads,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset)
      }
    });
  } catch (error) {
    logger.error('Failed to get leads', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to get leads'
    });
  }
});

/**
 * Get session health status
 */
router.get('/sessions/:sessionId/health', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const sessionRepo = AppDataSource.getRepository(Session);
    const accountRepo = AppDataSource.getRepository(Account);
    const sessionManager = new SessionManager(sessionRepo, accountRepo);

    const health = await sessionManager.calculateHealthScore(sessionId);

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error('Failed to get session health', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session health'
    });
  }
});

/**
 * Calculate lead score based on content and keywords
 */
function calculateLeadScore(post: any, keywords: string[]): number {
  let score = 0;
  
  // Topic match (35%)
  const text = post.text.toLowerCase();
  const matchedKeywords = keywords.filter(k => text.includes(k.toLowerCase()));
  const topicMatch = matchedKeywords.length / keywords.length;
  score += topicMatch * 0.35;
  
  // Engagement velocity (20%)
  const engagementRate = ((post.metrics?.likes || 0) + 
                          (post.metrics?.replies || 0) * 2 + 
                          (post.metrics?.reposts || 0) * 3) / 
                         Math.max(1, post.metrics?.views || 1);
  score += Math.min(1, engagementRate * 10) * 0.20;
  
  // Recency (15%)
  const hoursSincePost = post.timestamp ? 
    (Date.now() - new Date(post.timestamp).getTime()) / (1000 * 60 * 60) : 24;
  const recencyScore = Math.max(0, 1 - (hoursSincePost / 168)); // 1 week decay
  score += recencyScore * 0.15;
  
  // Answerability (15%)
  const hasQuestion = /\?|how|what|when|where|why|help|need|looking for/i.test(text);
  if (hasQuestion) score += 0.15;
  
  // Author quality (10%)
  if (post.author.isVerified) score += 0.05;
  const followerScore = Math.min(1, (post.author.followerCount || 0) / 10000);
  score += followerScore * 0.05;
  
  // Toxicity penalty (-15%)
  const toxicWords = /spam|scam|fake|stupid|hate/i.test(text);
  if (toxicWords) score -= 0.15;
  
  return Math.max(0, Math.min(1, score));
}

export default router;