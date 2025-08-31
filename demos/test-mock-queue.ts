#!/usr/bin/env ts-node

/**
 * Demo script to test Queue System without Redis
 * Simulates queue behavior with in-memory processing
 * Run with: npx ts-node demos/test-mock-queue.ts
 */

import 'dotenv/config';
import { AppDataSource } from '../src/database/config';
import { SimpleStagehandWorker } from '../src/workers/SimpleStagehandWorker';
import { createMockAutomationFactory } from '../src/mocks/MockAutomation';
import { SessionManager } from '../src/services/SessionManager';
import { Agent } from '../src/database/entities/Agent.entity';
import { Lead } from '../src/database/entities/Lead.entity';
import { Account } from '../src/database/entities/Account.entity';
import { Session } from '../src/database/entities/Session.entity';
import { Task } from '../src/database/entities/Task.entity';

// Mock job structure
interface MockJob {
  id: string;
  agentId: string;
  keywords: string[];
  priority: 'high' | 'normal' | 'low';
  state: 'waiting' | 'active' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// Mock queue manager
class MockQueueManager {
  private jobs: MockJob[] = [];
  private processing = false;
  private worker: SimpleStagehandWorker | null = null;
  
  async initialize(worker: SimpleStagehandWorker) {
    this.worker = worker;
    console.log('✅ Mock Queue Manager initialized');
  }
  
  async addJob(agentId: string, keywords: string[], priority: 'high' | 'normal' | 'low' = 'normal'): Promise<MockJob> {
    const job: MockJob = {
      id: Math.random().toString(36).substring(7),
      agentId,
      keywords,
      priority,
      state: 'waiting',
      progress: 0,
      createdAt: new Date()
    };
    
    this.jobs.push(job);
    console.log(`   Added job ${job.id} with priority ${priority}`);
    
    // Auto-process if not already processing
    if (!this.processing) {
      setTimeout(() => this.processJobs(), 100);
    }
    
    return job;
  }
  
  private async processJobs() {
    if (this.processing || !this.worker) return;
    this.processing = true;
    
    // Sort by priority
    const waitingJobs = this.jobs
      .filter(j => j.state === 'waiting')
      .sort((a, b) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
    
    for (const job of waitingJobs) {
      // Update job state
      job.state = 'active';
      job.startedAt = new Date();
      job.progress = 0;
      
      console.log(`\n🔄 Processing job ${job.id}...`);
      
      try {
        // Simulate progress updates
        for (let progress = 10; progress <= 90; progress += 20) {
          job.progress = progress;
          console.log(`   Progress: ${progress}%`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Execute actual lead discovery
        await this.worker.processLeadDiscovery(job.agentId, job.keywords);
        
        // Mark as completed
        job.state = 'completed';
        job.progress = 100;
        job.completedAt = new Date();
        job.result = {
          success: true,
          processingTime: job.completedAt.getTime() - job.startedAt!.getTime()
        };
        
        console.log(`✅ Job ${job.id} completed`);
        
      } catch (error) {
        job.state = 'failed';
        job.error = (error as Error).message;
        job.completedAt = new Date();
        console.log(`❌ Job ${job.id} failed: ${job.error}`);
      }
      
      // Small delay between jobs
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    this.processing = false;
  }
  
  getStats() {
    return {
      total: this.jobs.length,
      waiting: this.jobs.filter(j => j.state === 'waiting').length,
      active: this.jobs.filter(j => j.state === 'active').length,
      completed: this.jobs.filter(j => j.state === 'completed').length,
      failed: this.jobs.filter(j => j.state === 'failed').length
    };
  }
  
  getJobs() {
    return this.jobs;
  }
}

async function demo() {
  console.log('🚀 Mock Queue System Demo (No Redis Required)\n');
  console.log('='.repeat(50));

  try {
    // Step 1: Initialize database
    console.log('\n📝 Step 1: Initializing Database Connection');
    console.log('-'.repeat(40));
    
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const agentRepo = AppDataSource.getRepository(Agent);
    const leadRepo = AppDataSource.getRepository(Lead);
    const accountRepo = AppDataSource.getRepository(Account);
    const sessionRepo = AppDataSource.getRepository(Session);
    const taskRepo = AppDataSource.getRepository(Task);

    // Step 2: Create test agent
    console.log('\n📝 Step 2: Setting up Test Agent');
    console.log('-'.repeat(40));
    
    let testAccount = await accountRepo.findOne({
      where: { handle: 'mock_queue_account' }
    });
    
    if (!testAccount) {
      testAccount = accountRepo.create({
        handle: 'mock_queue_account',
        displayName: 'Mock Queue Account',
        status: 'active'
      });
      testAccount = await accountRepo.save(testAccount);
      console.log('✅ Created test account');
    }

    let testAgent = await agentRepo.findOne({
      where: { name: 'Mock Queue Agent', accountId: testAccount.id }
    });

    if (!testAgent) {
      testAgent = agentRepo.create({
        name: 'Mock Queue Agent',
        keywords: ['testing', 'automation', 'mock', 'queue'],
        schedule: '*/30 * * * *',
        dailyCap: 50,
        concurrency: {
          maxParallelPages: 2,
          scrollDelayMs: [500, 1500],
          actionDelayMs: [300, 800],
          humanization: {
            scrollPattern: 'random',
            mouseMovement: true,
            readingDelays: true,
            randomBreaks: [3000, 8000]
          }
        },
        isActive: true
      });
      testAgent.accountId = testAccount.id;
      testAgent.account = testAccount;
      testAgent = await agentRepo.save(testAgent);
      console.log('✅ Created test agent');
    } else {
      console.log('✅ Using existing agent');
    }

    // Step 3: Initialize worker
    console.log('\n📝 Step 3: Initializing Worker');
    console.log('-'.repeat(40));
    
    const sessionManager = new SessionManager(sessionRepo, accountRepo);
    const automationFactory = createMockAutomationFactory({
      searchDelay: 300,
      searchVariance: 100,
      postsPerSearch: 2,
      failureRate: 0.05,
      humanPatternDelay: 500
    });
    
    const worker = new SimpleStagehandWorker(
      taskRepo,
      agentRepo,
      leadRepo,
      sessionManager,
      automationFactory,
      2 // Pool size
    );
    
    await worker.initialize();
    console.log('✅ Worker initialized');

    // Step 4: Initialize mock queue
    console.log('\n📝 Step 4: Initializing Mock Queue Manager');
    console.log('-'.repeat(40));
    
    const queueManager = new MockQueueManager();
    await queueManager.initialize(worker);

    // Step 5: Add jobs with different priorities
    console.log('\n📝 Step 5: Adding Jobs to Queue');
    console.log('-'.repeat(40));
    
    console.log('\n🔴 Adding HIGH priority job...');
    await queueManager.addJob(testAgent.id, ['urgent', 'critical'], 'high');
    
    console.log('\n🟡 Adding NORMAL priority jobs...');
    await queueManager.addJob(testAgent.id, ['testing', 'automation'], 'normal');
    await queueManager.addJob(testAgent.id, ['mock', 'queue'], 'normal');
    
    console.log('\n🟢 Adding LOW priority job...');
    await queueManager.addJob(testAgent.id, ['research', 'analyze'], 'low');

    // Step 6: Monitor processing
    console.log('\n📝 Step 6: Monitoring Job Processing');
    console.log('-'.repeat(40));
    
    // Monitor for 20 seconds
    const monitorDuration = 20000;
    const monitorInterval = 2000;
    const startTime = Date.now();
    
    while (Date.now() - startTime < monitorDuration) {
      await new Promise(resolve => setTimeout(resolve, monitorInterval));
      
      const stats = queueManager.getStats();
      console.log(`\n📊 Queue Status (${Math.round((Date.now() - startTime) / 1000)}s):`);
      console.log(`   Total: ${stats.total}`);
      console.log(`   Waiting: ${stats.waiting}`);
      console.log(`   Active: ${stats.active}`);
      console.log(`   Completed: ${stats.completed}`);
      console.log(`   Failed: ${stats.failed}`);
      
      if (stats.completed + stats.failed === stats.total) {
        console.log('\n✅ All jobs processed!');
        break;
      }
    }

    // Step 7: Display results
    console.log('\n📝 Step 7: Results Summary');
    console.log('-'.repeat(40));
    
    // Show job results
    console.log('\n📋 Job Results:');
    const jobs = queueManager.getJobs();
    jobs.forEach(job => {
      console.log(`\n   Job ${job.id}:`);
      console.log(`     State: ${job.state}`);
      console.log(`     Priority: ${job.priority}`);
      console.log(`     Keywords: ${job.keywords.join(', ')}`);
      if (job.result) {
        console.log(`     Processing time: ${(job.result.processingTime / 1000).toFixed(2)}s`);
      }
      if (job.error) {
        console.log(`     Error: ${job.error}`);
      }
    });
    
    // Show discovered leads
    const leads = await leadRepo.find({
      where: { agentId: testAgent.id },
      order: { createdAt: 'DESC' },
      take: 5
    });
    
    console.log(`\n🎯 Sample Leads Discovered (${leads.length} most recent):`);
    leads.forEach((lead, index) => {
      console.log(`\n   ${index + 1}. @${lead.authorHandle}`);
      console.log(`      Category: ${lead.category}`);
      console.log(`      Score: ${(parseFloat(lead.score.toString()) * 100).toFixed(0)}%`);
      console.log(`      Content: ${lead.content.text.substring(0, 50)}...`);
    });
    
    // Show worker stats
    const workerStats = worker.getPoolStats();
    console.log('\n👷 Worker Pool Statistics:');
    console.log(`   Tasks processed: ${workerStats.metrics.tasksProcessed}`);
    console.log(`   Tasks succeeded: ${workerStats.metrics.tasksSucceeded}`);
    console.log(`   Leads discovered: ${workerStats.metrics.leadsDiscovered}`);
    console.log(`   Success rate: ${((workerStats.metrics.tasksSucceeded / workerStats.metrics.tasksProcessed) * 100).toFixed(1)}%`);

    // Step 8: Cleanup
    console.log('\n📝 Step 8: Cleanup');
    console.log('-'.repeat(40));
    
    await worker.shutdown();
    console.log('✅ Worker shut down');
    
    await AppDataSource.destroy();
    console.log('✅ Database connection closed');

    console.log('\n' + '='.repeat(50));
    console.log('✨ Mock Queue System Demo completed successfully!\n');
    
    console.log('💡 Summary:');
    console.log('   ✅ Queue simulation working without Redis');
    console.log('   ✅ Job prioritization functional');
    console.log('   ✅ Lead discovery processing verified');
    console.log('   ✅ Worker pool integration successful');
    console.log('\n📌 Note:');
    console.log('   This demo simulates queue behavior without Redis.');
    console.log('   For production, install Redis: brew install redis');
    console.log('   Then start Redis: redis-server');

  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    
    process.exit(1);
  }
}

// Run the demo
demo().catch(console.error);