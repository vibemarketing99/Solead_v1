import { Repository } from 'typeorm';
import { Session } from '../database/entities/Session.entity';
import { Account } from '../database/entities/Account.entity';
import { Logger } from '../utils/Logger';
import { encryptionService } from '../utils/encryption';
// NodeStagehandAutomation will be used when we integrate the automation
// import { NodeStagehandAutomation } from '../automation/NodeStagehandAutomation';

/**
 * SessionHealth tracks the health status of a session
 */
export interface SessionHealth {
  score: number; // 0-1 health score
  isHealthy: boolean;
  lastChecked: Date;
  issues: string[];
  metrics: {
    lastSuccessfulUse?: Date;
    failureCount: number;
    successCount: number;
    averageResponseTime?: number;
  };
}

/**
 * SessionManager handles the lifecycle of Threads sessions
 * Including creation, validation, refresh, and health monitoring
 */
export class SessionManager {
  private logger: Logger;
  private sessionRepo: Repository<Session>;
  private accountRepo: Repository<Account>;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private refreshInterval: NodeJS.Timeout | null = null;

  // Configuration
  private readonly HEALTH_CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes
  private readonly REFRESH_THRESHOLD = 6 * 60 * 60 * 1000; // 6 hours
  private readonly MIN_HEALTH_SCORE = 0.5;

  constructor(
    sessionRepo: Repository<Session>,
    accountRepo: Repository<Account>
  ) {
    this.sessionRepo = sessionRepo;
    this.accountRepo = accountRepo;
    this.logger = new Logger('SessionManager');
  }

  /**
   * Create a new session from cookies
   */
  async createSession(
    accountId: string,
    cookies: string,
    userAgent?: string
  ): Promise<Session> {
    try {
      this.logger.info(`Creating session for account ${accountId}`);

      // Verify account exists
      const account = await this.accountRepo.findOne({
        where: { id: accountId }
      });

      if (!account) {
        throw new Error(`Account ${accountId} not found`);
      }

      // Encrypt cookies before storage
      const encryptedCookies = encryptionService.encrypt(cookies);

      // Create session entity
      const session = this.sessionRepo.create({
        accountId: account.id,
        account,
        encryptedCookies,
        encryptionKeyId: 'default-key-v1',
        userAgent: userAgent || this.getDefaultUserAgent(),
        viewport: {
          width: 1920,
          height: 1080,
          deviceScaleFactor: 1,
          isMobile: false,
          hasTouch: false
        },
        healthScore: 1.0,
        failureCount: 0,
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        status: 'active'
      });

      // Validate the session works before saving
      // TODO: Uncomment when StagehandAutomation is fixed
      // const isValid = await this.validateSession(session);
      // 
      // if (!isValid) {
      //   throw new Error('Session validation failed - cookies may be invalid');
      // }
      console.log('⚠️  Skipping validation in demo mode')

      // Save to database
      const savedSession = await this.sessionRepo.save(session);
      
      this.logger.info(`Session ${savedSession.id} created successfully`);
      this.logger.session(savedSession.id, 'created', 1.0);

      return savedSession;
    } catch (error) {
      this.logger.error('Failed to create session', error);
      throw error;
    }
  }

  /**
   * Refresh an expiring session
   */
  async refreshSession(sessionId: string): Promise<Session> {
    try {
      this.logger.info(`Refreshing session ${sessionId}`);

      const session = await this.sessionRepo.findOne({
        where: { id: sessionId },
        relations: ['account']
      });

      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Decrypt cookies
      // const cookies = encryptionService.decrypt(session.encryptedCookies);

      // Use Stagehand to refresh the session
      // const config: StagehandConfig = {
      //   env: 'BROWSERBASE',
      //   headless: true,
      //   enableCaching: false,
      //   modelName: 'gpt-4o-mini',
      //   modelClientOptions: {
      //     apiKey: process.env.OPENAI_API_KEY || ''
      //   }
      // };

      // TODO: Uncomment when StagehandAutomation is fixed
      // const automation = new StagehandAutomation(config, cookies);
      // 
      // try {
      //   await automation.initialize();
      //   
      //   // Browse with human pattern to refresh session
      //   await automation.browseWithHumanPattern(30000); // 30 seconds
      
      console.log('⚠️  Skipping automation in demo mode');
        
        // Update session expiry
        session.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        session.lastActivityAt = new Date();
        session.healthScore = 1.0;
        session.status = 'active';
        
        await this.sessionRepo.save(session);
        
        this.logger.info(`Session ${sessionId} refreshed successfully`);
        this.logger.session(sessionId, 'refreshed', session.healthScore);
        
        return session;
      // } finally {
      //   await automation.cleanup();
      // }
    } catch (error) {
      this.logger.error(`Failed to refresh session ${sessionId}`, error);
      
      // Mark session as unhealthy
      await this.markSessionUnhealthy(sessionId, 'Refresh failed');
      
      throw error;
    }
  }

  /**
   * Validate a session is working
   */
  async validateSession(session: Session | string): Promise<boolean> {
    try {
      // Get session if ID provided
      if (typeof session === 'string') {
        const found = await this.sessionRepo.findOne({
          where: { id: session }
        });
        
        if (!found) {
          return false;
        }
        
        session = found;
      }

      // Decrypt cookies
      // const cookies = encryptionService.decrypt(session.encryptedCookies);

      // Test with Stagehand
      // const config: StagehandConfig = {
      //   env: 'BROWSERBASE',
      //   headless: true,
      //   enableCaching: false,
      //   modelName: 'gpt-4o-mini',
      //   modelClientOptions: {
      //     apiKey: process.env.OPENAI_API_KEY || ''
      //   }
      // };

      // TODO: Uncomment when StagehandAutomation is fixed
      // const automation = new StagehandAutomation(config, cookies);
      // 
      // try {
      //   await automation.initialize();
      //   const isValid = await automation.validateSession();
      
      // Demo mode - simulate validation
      const isValid = Math.random() > 0.3; // 70% success rate for demo
        
        // Update session status
        session.status = isValid ? 'active' : 'failed';
        session.lastActivityAt = new Date();
        
        if (isValid) {
          session.healthScore = Math.min(1.0, session.healthScore + 0.1);
          session.failureCount = 0; // Reset on success
        } else {
          session.healthScore = Math.max(0, session.healthScore - 0.3);
          session.failureCount = session.failureCount + 1;
        }
        
        await this.sessionRepo.save(session);
        
        this.logger.info(`Session ${session.id} validation: ${isValid ? 'PASS' : 'FAIL'}`);
        
        return isValid;
      // } finally {
      //   await automation.cleanup();
      // }
    } catch (error) {
      this.logger.error('Session validation error', error);
      return false;
    }
  }

  /**
   * Get a healthy session for use
   */
  async getHealthySession(accountId?: string): Promise<Session | null> {
    try {
      const query = this.sessionRepo.createQueryBuilder('session')
        .leftJoinAndSelect('session.account', 'account')
        .where('session.status = :status', { status: 'active' })
        .andWhere('session.healthScore >= :minScore', { minScore: this.MIN_HEALTH_SCORE })
        .andWhere('session.expiresAt > :now', { now: new Date() })
        .orderBy('session.healthScore', 'DESC')
        .addOrderBy('session.lastActivityAt', 'ASC');

      if (accountId) {
        query.andWhere('account.id = :accountId', { accountId });
      }

      const session = await query.getOne();

      if (session) {
        // Update last activity
        session.lastActivityAt = new Date();
        await this.sessionRepo.save(session);
        
        this.logger.info(`Retrieved healthy session ${session.id}`);
      } else {
        this.logger.warn('No healthy sessions available');
      }

      return session;
    } catch (error) {
      this.logger.error('Failed to get healthy session', error);
      return null;
    }
  }

  /**
   * Calculate session health score
   */
  async calculateHealthScore(sessionId: string): Promise<SessionHealth> {
    try {
      const session = await this.sessionRepo.findOne({
        where: { id: sessionId }
      });

      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const health: SessionHealth = {
        score: session.healthScore,
        isHealthy: session.healthScore >= this.MIN_HEALTH_SCORE,
        lastChecked: new Date(),
        issues: [],
        metrics: {
          lastSuccessfulUse: session.lastActivityAt,
          failureCount: session.failureCount || 0,
          successCount: Math.max(0, 10 - (session.failureCount || 0)), // Estimate based on failures
          averageResponseTime: undefined // Not tracked in current schema
        }
      };

      // Check expiry
      const timeToExpiry = session.expiresAt.getTime() - Date.now();
      if (timeToExpiry < this.REFRESH_THRESHOLD) {
        health.issues.push('Session expiring soon');
        health.score *= 0.8;
      }

      // Check last activity
      if (session.lastActivityAt) {
        const timeSinceActivity = Date.now() - session.lastActivityAt.getTime();
        if (timeSinceActivity > this.HEALTH_CHECK_INTERVAL) {
          health.issues.push('No recent activity');
          health.score *= 0.9;
        }
      }

      // Check failure rate
      const totalOps = health.metrics.failureCount + health.metrics.successCount;
      if (totalOps > 0) {
        const failureRate = health.metrics.failureCount / totalOps;
        if (failureRate > 0.1) {
          health.issues.push(`High failure rate: ${(failureRate * 100).toFixed(1)}%`);
          health.score *= (1 - failureRate);
        }
      }

      health.score = Math.max(0, Math.min(1, health.score));
      health.isHealthy = health.score >= this.MIN_HEALTH_SCORE;

      this.logger.info(`Session ${sessionId} health score: ${health.score.toFixed(2)}`);
      
      return health;
    } catch (error) {
      this.logger.error('Failed to calculate health score', error);
      throw error;
    }
  }

  /**
   * Start automated health monitoring
   */
  startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      return; // Already running
    }

    this.logger.info('Starting session health monitoring');

    this.healthCheckInterval = setInterval(async () => {
      await this.checkAllSessionHealth();
    }, this.HEALTH_CHECK_INTERVAL);

    this.refreshInterval = setInterval(async () => {
      await this.refreshExpiringSessions();
    }, this.REFRESH_THRESHOLD / 2);

    // Run initial check
    this.checkAllSessionHealth();
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }

    this.logger.info('Stopped session health monitoring');
  }

  /**
   * Private helper methods
   */

  private async checkAllSessionHealth(): Promise<void> {
    try {
      const activeSessions = await this.sessionRepo.find({
        where: { status: 'active' }
      });

      this.logger.info(`Checking health of ${activeSessions.length} active sessions`);

      for (const session of activeSessions) {
        const health = await this.calculateHealthScore(session.id);
        
        session.healthScore = health.score;
        
        if (!health.isHealthy) {
          this.logger.warn(`Session ${session.id} is unhealthy: ${health.issues.join(', ')}`);
        }
        
        await this.sessionRepo.save(session);
      }
    } catch (error) {
      this.logger.error('Health check failed', error);
    }
  }

  private async refreshExpiringSessions(): Promise<void> {
    try {
      const expiringSessions = await this.sessionRepo
        .createQueryBuilder('session')
        .where('session.status = :status', { status: 'active' })
        .andWhere('session.expiresAt < :threshold', { 
          threshold: new Date(Date.now() + this.REFRESH_THRESHOLD) 
        })
        .getMany();

      this.logger.info(`Found ${expiringSessions.length} sessions needing refresh`);

      for (const session of expiringSessions) {
        try {
          await this.refreshSession(session.id);
        } catch (error) {
          this.logger.error(`Failed to refresh session ${session.id}`, error);
        }
      }
    } catch (error) {
      this.logger.error('Refresh check failed', error);
    }
  }

  private async markSessionUnhealthy(sessionId: string, reason: string): Promise<void> {
    try {
      const session = await this.sessionRepo.findOne({
        where: { id: sessionId }
      });

      if (session) {
        session.healthScore = Math.max(0, session.healthScore - 0.3);
        session.failureCount = session.failureCount + 1;
        session.lastActivityAt = new Date();
        
        if (session.healthScore < this.MIN_HEALTH_SCORE) {
          session.status = 'failed';
        }
        
        await this.sessionRepo.save(session);
        
        this.logger.warn(`Session ${sessionId} marked unhealthy: ${reason}`);
      }
    } catch (error) {
      this.logger.error('Failed to mark session unhealthy', error);
    }
  }

  private getDefaultUserAgent(): string {
    return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  /**
   * Get session statistics
   */
  async getStatistics(): Promise<{
    total: number;
    active: number;
    healthy: number;
    expiringSoon: number;
    averageHealth: number;
  }> {
    const stats = await this.sessionRepo
      .createQueryBuilder('session')
      .select('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN session.status = \'active\' THEN 1 ELSE 0 END)', 'active')
      .addSelect('SUM(CASE WHEN session.healthScore >= :minScore THEN 1 ELSE 0 END)', 'healthy')
      .addSelect('SUM(CASE WHEN session.expiresAt < :threshold THEN 1 ELSE 0 END)', 'expiringSoon')
      .addSelect('AVG(session.healthScore)', 'averageHealth')
      .setParameter('minScore', this.MIN_HEALTH_SCORE)
      .setParameter('threshold', new Date(Date.now() + this.REFRESH_THRESHOLD))
      .getRawOne();

    return {
      total: parseInt(stats.total) || 0,
      active: parseInt(stats.active) || 0,
      healthy: parseInt(stats.healthy) || 0,
      expiringSoon: parseInt(stats.expiringSoon) || 0,
      averageHealth: parseFloat(stats.averageHealth) || 0
    };
  }
}