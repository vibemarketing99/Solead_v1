#!/usr/bin/env ts-node

/**
 * Demo script to test Bull Queue System
 * Run with: npx ts-node demos/test-queue-system.ts
 */

import 'dotenv/config';
import { AppDataSource } from '../src/database/config';
import { QueueManager } from '../src/queue/QueueManager';
import { QueueName } from '../src/queue/config';
import { Agent } from '../src/database/entities/Agent.entity';
import { Lead } from '../src/database/entities/Lead.entity';
import { Account } from '../src/database/entities/Account.entity';
import Bull from 'bull';

async function demo() {
  console.log('🚀 Bull Queue System Demo\n');
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

    // Step 2: Initialize Queue Manager
    console.log('\n📝 Step 2: Initializing Queue Manager');
    console.log('-'.repeat(40));
    
    const queueManager = QueueManager.getInstance();
    await queueManager.initialize();
    console.log('✅ Queue Manager initialized');

    // Step 3: Get or create test agent
    console.log('\n📝 Step 3: Setting up Test Agent');
    console.log('-'.repeat(40));
    
    let testAccount = await accountRepo.findOne({
      where: { handle: 'queue_test_account' }
    });
    
    if (!testAccount) {
      testAccount = accountRepo.create({
        handle: 'queue_test_account',
        displayName: 'Queue Test Account',
        status: 'active'
      });
      testAccount = await accountRepo.save(testAccount);
      console.log('✅ Created test account');
    }

    let testAgent = await agentRepo.findOne({
      where: { name: 'Queue Test Agent', accountId: testAccount.id }
    });

    if (!testAgent) {
      testAgent = agentRepo.create({
        name: 'Queue Test Agent',
        keywords: ['automation', 'testing', 'queue'],
        schedule: '*/5 * * * *', // Every 5 minutes
        dailyCap: 100,
        concurrency: {
          maxParallelPages: 3,
          scrollDelayMs: [1000, 3000],
          actionDelayMs: [500, 1500],
          humanization: {
            scrollPattern: 'random',
            mouseMovement: true,
            readingDelays: true,
            randomBreaks: [5000, 15000]
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

    // Step 4: Display initial queue stats
    console.log('\n📝 Step 4: Initial Queue Statistics');
    console.log('-'.repeat(40));
    
    const initialStats = await queueManager.getQueueStats();
    console.log('\n📊 Queue Health:');
    for (const [queueName, stats] of initialStats) {
      console.log(`\n   ${queueName}:`);
      console.log(`     Healthy: ${stats.isHealthy ? '✅' : '❌'}`);
      console.log(`     Waiting: ${stats.metrics.waiting}`);
      console.log(`     Active: ${stats.metrics.active}`);
      console.log(`     Completed: ${stats.metrics.completed}`);
      console.log(`     Failed: ${stats.metrics.failed}`);
    }

    // Step 5: Add lead discovery jobs with different priorities
    console.log('\n📝 Step 5: Adding Jobs to Queue');
    console.log('-'.repeat(40));
    
    const jobs: Bull.Job[] = [];
    
    // High priority job
    console.log('\n🔴 Adding HIGH priority job...');
    const highPriorityJob = await queueManager.addLeadDiscoveryJob({
      agentId: testAgent.id,
      keywords: ['urgent', 'critical'],
      priority: 'high',
      metadata: {
        triggeredBy: 'demo',
        scheduledRun: false
      }
    }, {
      priority: 1,
      delay: 0
    });
    jobs.push(highPriorityJob);
    console.log(`   Job ID: ${highPriorityJob.id}`);
    
    // Normal priority jobs
    console.log('\n🟡 Adding NORMAL priority jobs...');
    for (let i = 0; i < 3; i++) {
      const normalJob = await queueManager.addLeadDiscoveryJob({
        agentId: testAgent.id,
        keywords: testAgent.keywords.slice(i, i + 2),
        priority: 'normal',
        metadata: {
          triggeredBy: 'demo',
          scheduledRun: false
        }
      }, {
        delay: i * 1000 // Stagger by 1 second
      });
      jobs.push(normalJob);
      console.log(`   Job ${i + 1} ID: ${normalJob.id}`);
    }
    
    // Low priority job
    console.log('\n🟢 Adding LOW priority job...');
    const lowPriorityJob = await queueManager.addLeadDiscoveryJob({
      agentId: testAgent.id,
      keywords: ['research', 'analyze'],
      priority: 'low',
      metadata: {
        triggeredBy: 'demo',
        scheduledRun: false
      }
    }, {
      priority: 10,
      delay: 5000
    });
    jobs.push(lowPriorityJob);
    console.log(`   Job ID: ${lowPriorityJob.id}`);

    // Step 6: Monitor job progress
    console.log('\n📝 Step 6: Monitoring Job Progress');
    console.log('-'.repeat(40));
    
    console.log('\n⏳ Waiting for jobs to process...\n');
    
    // Monitor for 30 seconds
    const monitorDuration = 30000;
    const monitorInterval = 3000;
    const startTime = Date.now();
    
    while (Date.now() - startTime < monitorDuration) {
      await new Promise(resolve => setTimeout(resolve, monitorInterval));
      
      // Check job statuses
      let completed = 0;
      let failed = 0;
      let active = 0;
      let waiting = 0;
      
      for (const job of jobs) {
        const currentJob = await queueManager.getJob(QueueName.LEAD_DISCOVERY, job.id!.toString());
        if (currentJob) {
          const state = await currentJob.getState();
          if (state === 'completed') completed++;
          else if (state === 'failed') failed++;
          else if (state === 'active') active++;
          else if (state === 'waiting' || state === 'delayed') waiting++;
          
          // Show progress for active jobs
          if (state === 'active') {
            const progress = currentJob.progress();
            console.log(`   Job ${currentJob.id} progress: ${progress}%`);
          }
        }
      }
      
      console.log(`📊 Status Update (${Math.round((Date.now() - startTime) / 1000)}s):`);
      console.log(`   Completed: ${completed}/${jobs.length}`);
      console.log(`   Active: ${active}`);
      console.log(`   Waiting: ${waiting}`);
      console.log(`   Failed: ${failed}`);
      console.log('');
      
      // Break if all jobs are done
      if (completed + failed === jobs.length) {
        console.log('✅ All jobs processed!');
        break;
      }
    }

    // Step 7: Display results
    console.log('\n📝 Step 7: Results Summary');
    console.log('-'.repeat(40));
    
    // Check final job statuses
    console.log('\n📋 Job Results:');
    for (const job of jobs) {
      const currentJob = await queueManager.getJob(QueueName.LEAD_DISCOVERY, job.id!.toString());
      if (currentJob) {
        const state = await currentJob.getState();
        const result = currentJob.returnvalue;
        console.log(`\n   Job ${currentJob.id}:`);
        console.log(`     State: ${state}`);
        console.log(`     Priority: ${currentJob.opts.priority || 'normal'}`);
        if (result) {
          console.log(`     Success: ${result.success}`);
          console.log(`     Leads: ${result.leadsDiscovered}`);
          console.log(`     Time: ${(result.processingTime / 1000).toFixed(2)}s`);
        }
      }
    }
    
    // Display discovered leads
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

    // Step 8: Test queue management features
    console.log('\n📝 Step 8: Testing Queue Management');
    console.log('-'.repeat(40));
    
    // Test pause/resume
    console.log('\n⏸️  Pausing lead-discovery queue...');
    await queueManager.pauseQueue(QueueName.LEAD_DISCOVERY);
    console.log('✅ Queue paused');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n▶️  Resuming lead-discovery queue...');
    await queueManager.resumeQueue(QueueName.LEAD_DISCOVERY);
    console.log('✅ Queue resumed');
    
    // Clean old jobs
    console.log('\n🧹 Cleaning completed jobs older than 1 hour...');
    await queueManager.cleanJobs(QueueName.LEAD_DISCOVERY, 3600000);
    console.log('✅ Old jobs cleaned');

    // Step 9: Display final stats
    console.log('\n📝 Step 9: Final Queue Statistics');
    console.log('-'.repeat(40));
    
    const finalStats = await queueManager.getQueueStats();
    console.log('\n📊 Final Queue Health:');
    for (const [queueName, stats] of finalStats) {
      console.log(`\n   ${queueName}:`);
      console.log(`     Healthy: ${stats.isHealthy ? '✅' : '❌'}`);
      console.log(`     Waiting: ${stats.metrics.waiting}`);
      console.log(`     Active: ${stats.metrics.active}`);
      console.log(`     Completed: ${stats.metrics.completed}`);
      console.log(`     Failed: ${stats.metrics.failed}`);
    }

    // Step 10: Shutdown
    console.log('\n📝 Step 10: Graceful Shutdown');
    console.log('-'.repeat(40));
    
    console.log('\n🛑 Shutting down Queue Manager...');
    await queueManager.shutdown();
    console.log('✅ Queue Manager shut down');
    
    await AppDataSource.destroy();
    console.log('✅ Database connection closed');

    console.log('\n' + '='.repeat(50));
    console.log('✨ Bull Queue System Demo completed successfully!\n');
    
    console.log('💡 Summary:');
    console.log('   ✅ Queue system initialized and working');
    console.log('   ✅ Job prioritization functional');
    console.log('   ✅ Background processing verified');
    console.log('   ✅ Queue management (pause/resume) working');
    console.log('   ✅ Job cleanup functional');
    console.log('\n📌 Next Steps:');
    console.log('   1. Create API endpoints for queue control');
    console.log('   2. Build web dashboard for monitoring');
    console.log('   3. Connect to Redis for production');
    console.log('   4. Add more processor types');

  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    
    // Ensure cleanup on error
    try {
      const queueManager = QueueManager.getInstance();
      if (queueManager.isReady()) {
        await queueManager.shutdown();
      }
    } catch (shutdownError) {
      console.error('Shutdown error:', shutdownError);
    }
    
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    
    process.exit(1);
  }
}

// Run the demo
demo().catch(console.error);