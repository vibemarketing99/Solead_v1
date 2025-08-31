/**
 * Compliance and Monitoring Service
 * Ensures responsible automation with rate limiting, detection avoidance, and ethical usage
 */

import { Logger } from '../utils/Logger';
import { AppDataSource } from '../database/config';
import { Agent } from '../database/entities/Agent.entity';
import { Session } from '../database/entities/Session.entity';
import { Repository } from 'typeorm';

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstAllowance: number;
  cooldownPeriod: number; // minutes
}

export interface ComplianceConfig {
  respectRobotsTxt: boolean;
  maxConcurrentSessions: number;
  minDelayBetweenRequests: number; // milliseconds
  maxSessionDuration: number; // minutes
  autoRotateUserAgents: boolean;
  blockDetectionSensitivity: 'low' | 'medium' | 'high';
  ethicalGuidelines: {
    respectPrivacy: boolean;
    noPersonalDataCollection: boolean;
    honorOptOuts: boolean;
    transparentDataUsage: boolean;
  };
}

export interface MonitoringMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  blockedRequests: number;
  averageResponseTime: number;
  detectionsCount: number;
  complianceViolations: number;
  activeAgents: number;
  activeSessions: number;
  lastActivity: Date;
}

export interface ComplianceAlert {
  type: 'rate_limit' | 'detection' | 'blocking' | 'violation' | 'warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  agentId?: string;
  sessionId?: string;
  timestamp: Date;
  action: 'log' | 'pause' | 'stop' | 'blacklist';
  metadata?: any;
}

export class ComplianceMonitoringService {
  private logger: Logger;
  private agentRepo: Repository<Agent>;
  private sessionRepo: Repository<Session>;
  
  // Rate limiting tracking
  private requestCounts: Map<string, {
    minute: { count: number; reset: number };
    hour: { count: number; reset: number };
    day: { count: number; reset: number };
    burst: { count: number; reset: number };
  }> = new Map();

  // Monitoring data
  private metrics: MonitoringMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    blockedRequests: 0,
    averageResponseTime: 0,
    detectionsCount: 0,
    complianceViolations: 0,
    activeAgents: 0,
    activeSessions: 0,
    lastActivity: new Date()
  };

  // Configuration
  private config: ComplianceConfig = {
    respectRobotsTxt: true,
    maxConcurrentSessions: 10,
    minDelayBetweenRequests: 2000,
    maxSessionDuration: 60, // 1 hour
    autoRotateUserAgents: true,
    blockDetectionSensitivity: 'medium',
    ethicalGuidelines: {
      respectPrivacy: true,
      noPersonalDataCollection: true,
      honorOptOuts: true,
      transparentDataUsage: true
    }
  };

  private rateLimits: RateLimitConfig = {
    requestsPerMinute: 30,
    requestsPerHour: 500,
    requestsPerDay: 5000,
    burstAllowance: 5,
    cooldownPeriod: 5
  };

  // Alert handling
  private alertQueue: ComplianceAlert[] = [];
  private readonly MAX_ALERT_QUEUE_SIZE = 1000;

  constructor(complianceConfig?: Partial<ComplianceConfig>, rateLimitConfig?: Partial<RateLimitConfig>) {
    this.logger = new Logger('ComplianceMonitoringService');
    this.agentRepo = AppDataSource.getRepository(Agent);
    this.sessionRepo = AppDataSource.getRepository(Session);
    
    if (complianceConfig) {
      this.config = { ...this.config, ...complianceConfig };
    }
    
    if (rateLimitConfig) {
      this.rateLimits = { ...this.rateLimits, ...rateLimitConfig };
    }

    // Start monitoring
    this.startMonitoring();
  }

  /**
   * Check if request is allowed under rate limits
   */
  async checkRateLimit(agentId: string, sessionId?: string): Promise<{
    allowed: boolean;
    reason?: string;
    retryAfter?: number;
    currentLimits: any;
  }> {
    const identifier = sessionId || agentId;
    const now = Date.now();

    // Get or create rate limit tracking for this identifier
    if (!this.requestCounts.has(identifier)) {
      this.requestCounts.set(identifier, {
        minute: { count: 0, reset: now + 60000 },
        hour: { count: 0, reset: now + 3600000 },
        day: { count: 0, reset: now + 86400000 },
        burst: { count: 0, reset: now + 10000 } // 10 second burst window
      });
    }

    const limits = this.requestCounts.get(identifier)!;

    // Reset counters if time windows have passed
    if (now >= limits.minute.reset) {
      limits.minute = { count: 0, reset: now + 60000 };
    }
    if (now >= limits.hour.reset) {
      limits.hour = { count: 0, reset: now + 3600000 };
    }
    if (now >= limits.day.reset) {
      limits.day = { count: 0, reset: now + 86400000 };
    }
    if (now >= limits.burst.reset) {
      limits.burst = { count: 0, reset: now + 10000 };
    }

    // Check limits
    if (limits.minute.count >= this.rateLimits.requestsPerMinute) {
      return {
        allowed: false,
        reason: 'Per-minute rate limit exceeded',
        retryAfter: limits.minute.reset - now,
        currentLimits: { ...limits }
      };
    }

    if (limits.hour.count >= this.rateLimits.requestsPerHour) {
      return {
        allowed: false,
        reason: 'Per-hour rate limit exceeded',
        retryAfter: limits.hour.reset - now,
        currentLimits: { ...limits }
      };
    }

    if (limits.day.count >= this.rateLimits.requestsPerDay) {
      return {
        allowed: false,
        reason: 'Per-day rate limit exceeded',
        retryAfter: limits.day.reset - now,
        currentLimits: { ...limits }
      };
    }

    if (limits.burst.count >= this.rateLimits.burstAllowance) {
      return {
        allowed: false,
        reason: 'Burst limit exceeded',
        retryAfter: limits.burst.reset - now,
        currentLimits: { ...limits }
      };
    }

    // Check concurrent sessions
    const activeSessions = await this.getActiveSessionCount();
    if (activeSessions >= this.config.maxConcurrentSessions) {
      return {
        allowed: false,
        reason: 'Max concurrent sessions exceeded',
        retryAfter: 30000, // 30 seconds
        currentLimits: { activeSessions, maxAllowed: this.config.maxConcurrentSessions }
      };
    }

    // Increment counters
    limits.minute.count++;
    limits.hour.count++;
    limits.day.count++;
    limits.burst.count++;

    this.metrics.totalRequests++;

    return {
      allowed: true,
      currentLimits: { ...limits }
    };
  }

  /**
   * Record request completion with metrics
   */
  async recordRequestCompletion(
    agentId: string,
    sessionId: string,
    success: boolean,
    responseTime: number,
    metadata?: any
  ): Promise<void> {
    // Update metrics
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    // Update rolling average response time
    const totalResponses = this.metrics.successfulRequests + this.metrics.failedRequests;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (totalResponses - 1) + responseTime) / totalResponses;

    this.metrics.lastActivity = new Date();

    // Check for potential blocking or detection
    await this.analyzeRequestPattern(agentId, sessionId, success, responseTime, metadata);
  }

  /**
   * Analyze request patterns for blocking detection
   */
  private async analyzeRequestPattern(
    agentId: string,
    sessionId: string,
    success: boolean,
    responseTime: number,
    metadata?: any
  ): Promise<void> {
    // Check for blocking indicators
    const blockingIndicators = [
      'Access Denied',
      'Blocked',
      'Rate Limited',
      'Too Many Requests',
      'Captcha',
      'Please verify you are human',
      'Suspicious activity'
    ];

    if (metadata?.responseText) {
      const text = metadata.responseText.toLowerCase();
      const hasBlockingIndicator = blockingIndicators.some(indicator => 
        text.includes(indicator.toLowerCase())
      );

      if (hasBlockingIndicator) {
        await this.handleDetection(agentId, sessionId, 'blocking', {
          responseText: metadata.responseText,
          responseTime
        });
      }
    }

    // Check for unusual response times (potential throttling)
    if (responseTime > 30000 && success) { // 30+ seconds
      await this.handleDetection(agentId, sessionId, 'throttling', {
        responseTime,
        expectedTime: this.metrics.averageResponseTime
      });
    }

    // Check failure rate
    const identifier = sessionId || agentId;
    if (this.requestCounts.has(identifier)) {
      const limits = this.requestCounts.get(identifier)!;
      const recentRequests = limits.minute.count;
      const recentFailures = recentRequests - (success ? 0 : 1);
      const failureRate = recentFailures / Math.max(recentRequests, 1);

      if (failureRate > 0.5 && recentRequests >= 5) {
        await this.handleDetection(agentId, sessionId, 'high_failure_rate', {
          failureRate,
          recentRequests,
          recentFailures
        });
      }
    }
  }

  /**
   * Handle detection/blocking events
   */
  private async handleDetection(
    agentId: string,
    sessionId: string,
    type: string,
    metadata: any
  ): Promise<void> {
    this.metrics.detectionsCount++;

    const alert: ComplianceAlert = {
      type: 'detection',
      severity: this.getDetectionSeverity(type, metadata),
      message: `Detection event: ${type}`,
      agentId,
      sessionId,
      timestamp: new Date(),
      action: this.getDetectionAction(type, metadata),
      metadata
    };

    await this.addAlert(alert);

    // Take action based on severity
    switch (alert.action) {
      case 'pause':
        await this.pauseAgent(agentId, 'Detection event');
        break;
      case 'stop':
        await this.stopAgent(agentId, 'Critical detection event');
        break;
      case 'blacklist':
        await this.blacklistSession(sessionId, 'Repeated violations');
        break;
    }
  }

  /**
   * Validate compliance before starting operation
   */
  async validateCompliance(agentId: string, operation: string): Promise<{
    compliant: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check agent status
      const agent = await this.agentRepo.findOne({
        where: { id: agentId },
        relations: ['account']
      });

      if (!agent) {
        issues.push('Agent not found');
        return { compliant: false, issues, recommendations };
      }

      if (agent.status !== 'active') {
        issues.push(`Agent status is ${agent.status}`);
      }

      // Check rate limits
      const rateLimitCheck = await this.checkRateLimit(agentId);
      if (!rateLimitCheck.allowed) {
        issues.push(`Rate limit exceeded: ${rateLimitCheck.reason}`);
        recommendations.push(`Wait ${Math.ceil((rateLimitCheck.retryAfter || 0) / 1000)} seconds before retrying`);
      }

      // Check ethical guidelines
      if (this.config.ethicalGuidelines.respectPrivacy && operation.includes('private')) {
        issues.push('Operation may violate privacy guidelines');
        recommendations.push('Ensure operation only accesses public data');
      }

      // Check session health
      const activeSessions = await this.sessionRepo.find({
        where: { accountId: agent.accountId, status: 'active' }
      });

      const unhealthySessions = activeSessions.filter(s => s.healthScore < 0.5);
      if (unhealthySessions.length > 0) {
        issues.push(`${unhealthySessions.length} unhealthy sessions detected`);
        recommendations.push('Refresh or replace unhealthy sessions');
      }

      // Check for recent violations
      const recentAlerts = this.alertQueue
        .filter(a => a.agentId === agentId)
        .filter(a => Date.now() - a.timestamp.getTime() < 3600000) // Last hour
        .filter(a => a.severity === 'critical');

      if (recentAlerts.length > 0) {
        issues.push('Recent critical violations detected');
        recommendations.push('Review and resolve violations before continuing');
      }

    } catch (error) {
      this.logger.error('Compliance validation failed', error as Error);
      issues.push('Compliance check failed');
    }

    return {
      compliant: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Get human-like delay recommendation
   */
  getRecommendedDelay(agentId: string, lastRequestTime?: number): number {
    const baseDelay = this.config.minDelayBetweenRequests;
    const randomFactor = 0.5 + Math.random(); // 0.5 - 1.5x multiplier
    
    // Add extra delay if recent violations
    const recentViolations = this.alertQueue
      .filter(a => a.agentId === agentId)
      .filter(a => Date.now() - a.timestamp.getTime() < 300000) // Last 5 minutes
      .length;

    const violationMultiplier = 1 + (recentViolations * 0.5);
    
    return Math.floor(baseDelay * randomFactor * violationMultiplier);
  }

  /**
   * Monitor system health
   */
  private async updateSystemMetrics(): Promise<void> {
    try {
      // Count active agents
      this.metrics.activeAgents = await this.agentRepo.count({
        where: { status: 'active' }
      });

      // Count active sessions
      this.metrics.activeSessions = await this.getActiveSessionCount();

      // Clean old request counts (older than 24 hours)
      const now = Date.now();
      for (const [key, limits] of this.requestCounts.entries()) {
        if (now > limits.day.reset) {
          this.requestCounts.delete(key);
        }
      }

      // Clean old alerts
      this.alertQueue = this.alertQueue
        .filter(a => Date.now() - a.timestamp.getTime() < 86400000) // Keep 24 hours
        .slice(-this.MAX_ALERT_QUEUE_SIZE); // Keep last N alerts

    } catch (error) {
      this.logger.error('Failed to update system metrics', error as Error);
    }
  }

  /**
   * Helper methods
   */
  private async getActiveSessionCount(): Promise<number> {
    return await this.sessionRepo.count({
      where: { status: 'active' }
    });
  }

  private getDetectionSeverity(type: string, metadata: any): ComplianceAlert['severity'] {
    switch (type) {
      case 'blocking':
      case 'captcha':
        return 'high';
      case 'throttling':
        return 'medium';
      case 'high_failure_rate':
        return metadata.failureRate > 0.8 ? 'high' : 'medium';
      default:
        return 'low';
    }
  }

  private getDetectionAction(type: string, metadata: any): ComplianceAlert['action'] {
    switch (type) {
      case 'blocking':
        return 'pause';
      case 'captcha':
        return 'stop';
      case 'high_failure_rate':
        return metadata.failureRate > 0.8 ? 'pause' : 'log';
      default:
        return 'log';
    }
  }

  private async addAlert(alert: ComplianceAlert): Promise<void> {
    this.alertQueue.push(alert);
    
    // Keep queue size manageable
    if (this.alertQueue.length > this.MAX_ALERT_QUEUE_SIZE) {
      this.alertQueue.shift();
    }

    this.logger.warn('Compliance alert', {
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      agentId: alert.agentId,
      action: alert.action
    });

    // Increment violation counter
    if (alert.severity === 'high' || alert.severity === 'critical') {
      this.metrics.complianceViolations++;
    }
  }

  private async pauseAgent(agentId: string, reason: string): Promise<void> {
    try {
      const agent = await this.agentRepo.findOne({ where: { id: agentId } });
      if (agent) {
        agent.status = 'paused';
        await this.agentRepo.save(agent);
        this.logger.warn(`Agent ${agentId} paused: ${reason}`);
      }
    } catch (error) {
      this.logger.error('Failed to pause agent', error as Error);
    }
  }

  private async stopAgent(agentId: string, reason: string): Promise<void> {
    try {
      const agent = await this.agentRepo.findOne({ where: { id: agentId } });
      if (agent) {
        agent.status = 'stopped';
        await this.agentRepo.save(agent);
        this.logger.error(`Agent ${agentId} stopped: ${reason}`);
      }
    } catch (error) {
      this.logger.error('Failed to stop agent', error as Error);
    }
  }

  private async blacklistSession(sessionId: string, reason: string): Promise<void> {
    try {
      const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
      if (session) {
        session.status = 'blacklisted';
        session.healthScore = 0;
        await this.sessionRepo.save(session);
        this.logger.error(`Session ${sessionId} blacklisted: ${reason}`);
      }
    } catch (error) {
      this.logger.error('Failed to blacklist session', error as Error);
    }
  }

  /**
   * Start monitoring services
   */
  private startMonitoring(): void {
    // Update metrics every minute
    setInterval(() => {
      this.updateSystemMetrics();
    }, 60000);

    this.logger.info('Compliance monitoring started', {
      rateLimits: this.rateLimits,
      config: this.config
    });
  }

  /**
   * Public methods for getting status and metrics
   */
  getMetrics(): MonitoringMetrics {
    return { ...this.metrics };
  }

  getRecentAlerts(hours = 24): ComplianceAlert[] {
    const cutoff = Date.now() - (hours * 3600000);
    return this.alertQueue.filter(a => a.timestamp.getTime() > cutoff);
  }

  getRateLimitStatus(agentId: string): any {
    return this.requestCounts.get(agentId) || null;
  }

  getConfig(): { compliance: ComplianceConfig; rateLimits: RateLimitConfig } {
    return {
      compliance: { ...this.config },
      rateLimits: { ...this.rateLimits }
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];

    // Check database connections
    try {
      await this.agentRepo.count();
      await this.sessionRepo.count();
    } catch (error) {
      issues.push('Database connection failed');
    }

    // Check for excessive violations
    const recentViolations = this.alertQueue
      .filter(a => Date.now() - a.timestamp.getTime() < 3600000)
      .filter(a => a.severity === 'critical')
      .length;

    if (recentViolations > 10) {
      issues.push('High number of recent violations');
    }

    // Check system load
    if (this.metrics.activeSessions > this.config.maxConcurrentSessions * 0.9) {
      issues.push('High session usage');
    }

    return {
      healthy: issues.length === 0,
      issues
    };
  }
}