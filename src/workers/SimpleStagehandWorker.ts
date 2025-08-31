/**
 * Simplified StagehandWorker that matches our actual entity structures
 * Focuses on lead discovery without complex task management
 */

import { Repository } from 'typeorm';
import { Agent } from '../database/entities/Agent.entity';
import { Lead } from '../database/entities/Lead.entity';
import { Task } from '../database/entities/Task.entity';
import { SessionManager } from '../services/SessionManager';
import { Logger } from '../utils/Logger';

const logger = new Logger('SimpleStagehandWorker');
// Define the automation types directly here until automation files are fixed
export interface ExtractedPost {
  id?: string;
  url: string;
  text: string;
  author: {
    handle: string;
    displayName?: string;
    avatarUrl?: string;
    followerCount?: number;
    isVerified?: boolean;
  };
  timestamp?: string;
  likes?: number;
  replies?: number;
  reposts?: number;
  views?: number;
  hashtags?: string[];
  mentions?: string[];
  links?: string[];
  media?: Array<{
    type: 'image' | 'video';
    url: string;
    thumbnail?: string;
  }>;
}

export interface IAutomation {
  searchThreads(keywords: string[]): Promise<ExtractedPost[]>;
  close?(): Promise<void>;
}

export enum WorkerStatus {
  IDLE = 'idle',
  BUSY = 'busy',
  ERROR = 'error',
}

export class WorkerInstance {
  public status: WorkerStatus = WorkerStatus.IDLE;
  public completedTasks: number = 0;
  public failedTasks: number = 0;
  private automation: IAutomation | null = null;
  private lastTaskTime: number = 0;

  constructor(public id: string) {}

  async initialize(automation: IAutomation): Promise<void> {
    this.automation = automation;
    
    // Initialize the automation if it has an initialize method
    if ('initialize' in automation && typeof automation.initialize === 'function') {
      await automation.initialize();
    }
    
    this.status = WorkerStatus.IDLE;
  }

  async execute(keywords: string[]): Promise<ExtractedPost[]> {
    if (this.status !== WorkerStatus.IDLE) {
      throw new Error(`Worker ${this.id} is not idle`);
    }

    this.status = WorkerStatus.BUSY;
    const startTime = Date.now();

    try {
      if (!this.automation) {
        throw new Error('Worker not initialized');
      }

      const posts = await this.automation.searchThreads(keywords);
      
      this.completedTasks++;
      this.lastTaskTime = Date.now() - startTime;
      this.status = WorkerStatus.IDLE;
      
      return posts;
    } catch (error) {
      this.failedTasks++;
      this.status = WorkerStatus.ERROR;
      throw error;
    }
  }

  getStats() {
    const totalTasks = this.completedTasks + this.failedTasks;
    return {
      id: this.id,
      status: this.status,
      completedTasks: this.completedTasks,
      failedTasks: this.failedTasks,
      successRate: totalTasks > 0 ? this.completedTasks / totalTasks : 0,
      lastTaskTime: this.lastTaskTime,
    };
  }

  async shutdown(): Promise<void> {
    if (this.automation && 'close' in this.automation) {
      await (this.automation as any).close();
    }
    this.automation = null;
    this.status = WorkerStatus.IDLE;
  }
}

export class SimpleStagehandWorker {
  private workers: WorkerInstance[] = [];
  private metrics = {
    tasksProcessed: 0,
    tasksSucceeded: 0,
    tasksFailed: 0,
    leadsDiscovered: 0,
    averageTaskTime: 0,
    poolUtilization: 0,
  };

  constructor(
    private taskRepo: Repository<Task>,
    private agentRepo: Repository<Agent>,
    private leadRepo: Repository<Lead>,
    _sessionManager: SessionManager, // Prefix with _ to indicate unused parameter
    private automationFactory: () => IAutomation,
    private poolSize: number = 3
  ) {
    // SessionManager is passed for future use but not currently utilized
  }

  async initialize(): Promise<void> {
    logger.info('[SimpleStagehandWorker] Initializing worker pool', { poolSize: this.poolSize });

    for (let i = 0; i < this.poolSize; i++) {
      const worker = new WorkerInstance(`worker-${i}`);
      const automation = this.automationFactory();
      await worker.initialize(automation);
      this.workers.push(worker);
    }

    logger.info('[SimpleStagehandWorker] Worker pool initialized');
  }

  private async getAvailableWorker(): Promise<WorkerInstance | null> {
    // First try to find an idle worker
    let worker = this.workers.find(w => w.status === WorkerStatus.IDLE);
    
    // If no idle worker, reset error workers
    if (!worker) {
      const errorWorker = this.workers.find(w => w.status === WorkerStatus.ERROR);
      if (errorWorker) {
        errorWorker.status = WorkerStatus.IDLE;
        worker = errorWorker;
      }
    }
    
    return worker || null;
  }

  async processLeadDiscovery(agentId: string, keywords: string[]): Promise<void> {
    logger.info('[SimpleStagehandWorker] Processing lead discovery', { agentId, keywords });

    // Get agent
    const agent = await this.agentRepo.findOne({ where: { id: agentId } });
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Wait for available worker
    let worker: WorkerInstance | null = null;
    let attempts = 0;
    while (!worker && attempts < 30) {
      worker = await this.getAvailableWorker();
      if (!worker) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
    }

    if (!worker) {
      throw new Error('No available workers after 30 seconds');
    }

    const startTime = Date.now();
    this.metrics.tasksProcessed++;

    try {
      // Execute search
      const posts = await worker.execute(keywords);
      
      // Process posts to leads
      const leads = await this.processPostsToLeads(posts, agent);
      
      this.metrics.tasksSucceeded++;
      this.metrics.leadsDiscovered += leads.length;
      
      // Update average task time
      const taskTime = Date.now() - startTime;
      this.metrics.averageTaskTime = 
        (this.metrics.averageTaskTime * (this.metrics.tasksProcessed - 1) + taskTime) / 
        this.metrics.tasksProcessed;
      
      logger.info('[SimpleStagehandWorker] Task completed', {
        agentId,
        leadsFound: leads.length,
        duration: taskTime,
      });
    } catch (error) {
      this.metrics.tasksFailed++;
      logger.error('[SimpleStagehandWorker] Task failed', error as Error);
      throw error;
    } finally {
      // Update pool utilization
      const busyWorkers = this.workers.filter(w => w.status === WorkerStatus.BUSY).length;
      this.metrics.poolUtilization = busyWorkers / this.poolSize;
    }
  }

  private async processPostsToLeads(posts: ExtractedPost[], agent: Agent): Promise<Lead[]> {
    const leads: Lead[] = [];

    for (const post of posts) {
      // Check if lead already exists
      const existingLead = await this.leadRepo.findOne({
        where: { postUrl: post.url }
      });

      if (existingLead) {
        logger.debug('[SimpleStagehandWorker] Lead already exists', { url: post.url });
        continue;
      }

      // Calculate match score
      const score = this.calculateMatchScore(post, agent.keywords);
      
      // Categorize lead
      const category = this.categorizePostForLead(post);
      
      // Generate reasons
      const reasons = this.generateLeadReasons(post, agent.keywords);

      // Create lead
      const lead = this.leadRepo.create({
        agentId: agent.id,
        agent,
        postUrl: post.url,
        postId: post.id || `post-${Date.now()}-${Math.random()}`,
        authorHandle: post.author.handle,
        authorFollowers: post.author.followerCount,
        content: {
          text: post.text,
          hashtags: post.hashtags || [],
          mentions: post.mentions || [],
          links: post.links || [],
          hasQuestion: post.text.includes('?'),
          sentiment: this.analyzeSentiment(post.text),
        },
        metrics: {
          replies: post.replies || 0,
          likes: post.likes || 0,
          reposts: post.reposts || 0,
          views: post.views,
          timestampRaw: post.timestamp || new Date().toISOString(),
          timestampParsed: new Date(post.timestamp || Date.now()),
          engagementRate: this.calculateEngagementRate(post),
        },
        score,
        category,
        reasons,
        capturedAt: new Date(),
      });

      const savedLead = await this.leadRepo.save(lead);
      leads.push(savedLead);

      // Create a task for the lead (for approval workflow)
      const task = this.taskRepo.create({
        leadId: savedLead.id,
        lead: savedLead,
        status: 'pending',
      });
      await this.taskRepo.save(task);

      logger.debug('[SimpleStagehandWorker] Lead created', {
        id: savedLead.id,
        category,
        score,
      });
    }

    return leads;
  }

  private calculateMatchScore(post: ExtractedPost, keywords: string[]): number {
    const text = post.text.toLowerCase();
    let score = 0;
    
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score += 0.2;
      }
    }
    
    // Engagement bonus
    if (post.likes && post.likes > 10) score += 0.1;
    if (post.replies && post.replies > 5) score += 0.1;
    
    // Question bonus
    if (text.includes('?')) score += 0.1;
    
    return Math.min(score, 1);
  }

  private categorizePostForLead(post: ExtractedPost): 'hot' | 'medium' | 'cold' {
    const text = post.text.toLowerCase();
    
    // Hot: Direct problems, urgent needs
    if (text.includes('problem') || text.includes('issue') || 
        text.includes('broken') || text.includes('help') ||
        text.includes('urgent') || text.includes('asap')) {
      return 'hot';
    }
    
    // Medium: Questions, interests
    if (text.includes('?') || text.includes('how') || 
        text.includes('what') || text.includes('why') ||
        text.includes('interested') || text.includes('looking for')) {
      return 'medium';
    }
    
    // Cold: General mentions
    return 'cold';
  }

  private generateLeadReasons(post: ExtractedPost, keywords: string[]): string[] {
    const reasons: string[] = [];
    const text = post.text.toLowerCase();
    
    // Check keyword matches
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        reasons.push(`Mentions "${keyword}"`);
      }
    }
    
    // Check for questions
    if (text.includes('?')) {
      reasons.push('Contains question');
    }
    
    // Check engagement
    if (post.likes && post.likes > 10) {
      reasons.push('High engagement');
    }
    
    // Check for problems
    if (text.includes('problem') || text.includes('issue')) {
      reasons.push('Mentions problem');
    }
    
    return reasons.length > 0 ? reasons : ['General mention'];
  }

  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positive = ['love', 'great', 'awesome', 'amazing', 'good', 'excellent'];
    const negative = ['hate', 'bad', 'terrible', 'awful', 'poor', 'worst'];
    
    const lowerText = text.toLowerCase();
    let score = 0;
    
    for (const word of positive) {
      if (lowerText.includes(word)) score++;
    }
    
    for (const word of negative) {
      if (lowerText.includes(word)) score--;
    }
    
    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
  }

  private calculateEngagementRate(post: ExtractedPost): number {
    const { likes = 0, replies = 0, reposts = 0, views = 1 } = post;
    const engagements = likes + replies + reposts;
    return views > 0 ? engagements / views : 0;
  }

  async scalePool(newSize: number): Promise<void> {
    logger.info('[SimpleStagehandWorker] Scaling pool', { from: this.poolSize, to: newSize });

    if (newSize > this.poolSize) {
      // Scale up
      for (let i = this.poolSize; i < newSize; i++) {
        const worker = new WorkerInstance(`worker-${i}`);
        const automation = this.automationFactory();
        await worker.initialize(automation);
        this.workers.push(worker);
      }
    } else if (newSize < this.poolSize) {
      // Scale down
      const toRemove = this.poolSize - newSize;
      for (let i = 0; i < toRemove; i++) {
        const worker = this.workers.pop();
        if (worker) {
          await worker.shutdown();
        }
      }
    }

    this.poolSize = newSize;
  }

  getPoolStats() {
    const workerStats = this.workers.map(w => w.getStats());
    const availableWorkers = this.workers.filter(w => w.status === WorkerStatus.IDLE).length;
    const busyWorkers = this.workers.filter(w => w.status === WorkerStatus.BUSY).length;
    const errorWorkers = this.workers.filter(w => w.status === WorkerStatus.ERROR).length;

    return {
      poolSize: this.poolSize,
      availableWorkers,
      busyWorkers,
      errorWorkers,
      workers: workerStats,
      metrics: this.metrics,
    };
  }

  async shutdown(): Promise<void> {
    logger.info('[SimpleStagehandWorker] Shutting down worker pool');

    for (const worker of this.workers) {
      await worker.shutdown();
    }

    this.workers = [];
    this.poolSize = 0;
  }
}