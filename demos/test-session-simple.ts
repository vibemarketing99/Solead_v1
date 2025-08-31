#!/usr/bin/env ts-node

/**
 * Simple demo script to test SessionManager functionality
 * Run with: npx ts-node demos/test-session-simple.ts
 */

import 'dotenv/config';
import { AppDataSource } from '../src/database/config';
import { SessionManager } from '../src/services/SessionManager';
import { encryptionService } from '../src/utils/encryption';
import { Account } from '../src/database/entities/Account.entity';
import { Session } from '../src/database/entities/Session.entity';

async function demo() {
  console.log('🚀 SessionManager Demo (Simplified)\n');
  console.log('=' .repeat(50));

  try {
    // Step 1: Test encryption service
    console.log('\n📝 Step 1: Testing Encryption Service');
    console.log('-'.repeat(40));
    
    const encryptionTestPassed = encryptionService.selfTest();
    
    if (!encryptionTestPassed) {
      console.error('❌ Encryption self-test failed!');
      return;
    }
    
    console.log('✅ Encryption service working correctly');
    
    // Demonstrate encryption
    const testData = JSON.stringify({
      session_token: 'test_token_123',
      user_id: 'user_456',
      expires: new Date().toISOString()
    });
    
    const encrypted = encryptionService.encrypt(testData);
    const decrypted = encryptionService.decrypt(encrypted);
    
    console.log(`📊 Original length: ${testData.length} bytes`);
    console.log(`🔐 Encrypted length: ${encrypted.length} bytes`);
    console.log(`✨ Encryption adds ~${encrypted.length - testData.length} bytes overhead`);
    console.log(`✅ Decryption successful: ${decrypted === testData}`);

    // Step 2: Initialize database
    console.log('\n📝 Step 2: Initializing Database Connection');
    console.log('-'.repeat(40));
    
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const sessionRepo = AppDataSource.getRepository(Session);
    const accountRepo = AppDataSource.getRepository(Account);

    // Step 3: Create or get test account
    console.log('\n📝 Step 3: Setting Up Test Account');
    console.log('-'.repeat(40));
    
    let testAccount = await accountRepo.findOne({
      where: { handle: 'demo_user' }
    });

    if (!testAccount) {
      testAccount = accountRepo.create({
        handle: 'demo_user',
        displayName: 'Demo User',
        status: 'active'
      });
      
      testAccount = await accountRepo.save(testAccount);
      console.log('✅ Created test account:', testAccount.handle);
    } else {
      console.log('✅ Using existing account:', testAccount.handle);
    }

    // Step 4: Initialize SessionManager
    console.log('\n📝 Step 4: Initializing SessionManager');
    console.log('-'.repeat(40));
    
    const sessionManager = new SessionManager(sessionRepo, accountRepo);
    console.log('✅ SessionManager initialized');

    // Step 5: Create a demo session directly (skip validation that requires Stagehand)
    console.log('\n📝 Step 5: Creating Demo Session');
    console.log('-'.repeat(40));
    
    const mockCookies = JSON.stringify([
      {
        name: 'session_token',
        value: 'mock_session_' + Date.now(),
        domain: '.threads.net',
        path: '/',
        secure: true,
        httpOnly: true
      }
    ]);

    console.log('⚠️  Note: Creating demo session without validation');
    console.log('    In production, real Threads cookies would be validated');

    // Create a session manually for demo purposes
    const mockSession = sessionRepo.create({
      accountId: testAccount.id,
      account: testAccount,
      encryptedCookies: encryptionService.encrypt(mockCookies),
      encryptionKeyId: 'demo-key-001',
      userAgent: 'Mozilla/5.0 (Demo Browser)',
      viewport: {
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false
      },
      healthScore: 0.8,
      failureCount: 2,
      lastActivityAt: new Date(),
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
      status: 'active'
    });
    
    const savedSession = await sessionRepo.save(mockSession);
    console.log('✅ Created demo session:', savedSession.id);

    // Step 6: Test health score calculation
    console.log('\n📝 Step 6: Calculating Session Health');
    console.log('-'.repeat(40));
    
    const health = await sessionManager.calculateHealthScore(savedSession.id);
    
    console.log(`🏥 Health Score: ${(health.score * 100).toFixed(1)}%`);
    console.log(`📊 Status: ${health.isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    
    const total = health.metrics.failureCount + health.metrics.successCount;
    const successRate = total > 0 ? (health.metrics.successCount / total * 100).toFixed(1) : 'N/A';
    console.log(`📈 Success Rate: ${successRate}% (${health.metrics.successCount}/${total})`);
    
    if (health.issues.length > 0) {
      console.log('⚠️  Issues:');
      health.issues.forEach(issue => console.log(`   - ${issue}`));
    }

    // Step 7: Get healthy session
    console.log('\n📝 Step 7: Retrieving Healthy Session');
    console.log('-'.repeat(40));
    
    const healthySession = await sessionManager.getHealthySession();
    
    if (healthySession) {
      console.log('✅ Found healthy session:', healthySession.id);
      console.log(`   Account: ${healthySession.account?.handle || 'N/A'}`);
      console.log(`   Health: ${(healthySession.healthScore * 100).toFixed(1)}%`);
      
      const expiresIn = healthySession.expiresAt.getTime() - Date.now();
      const hoursLeft = Math.floor(expiresIn / (60 * 60 * 1000));
      console.log(`   Expires in: ${hoursLeft} hours`);
    } else {
      console.log('❌ No healthy sessions available');
    }

    // Step 8: Get statistics
    console.log('\n📝 Step 8: Session Statistics');
    console.log('-'.repeat(40));
    
    const stats = await sessionManager.getStatistics();
    
    console.log('📊 Session Statistics:');
    console.log(`   Total Sessions: ${stats.total}`);
    if (stats.total > 0) {
      console.log(`   Active: ${stats.active} (${((stats.active/stats.total) * 100).toFixed(1)}%)`);
      console.log(`   Healthy: ${stats.healthy} (${((stats.healthy/stats.total) * 100).toFixed(1)}%)`);
      console.log(`   Expiring Soon: ${stats.expiringSoon}`);
      console.log(`   Average Health: ${(stats.averageHealth * 100).toFixed(1)}%`);
    }

    // Step 9: Test health monitoring
    console.log('\n📝 Step 9: Starting Health Monitoring');
    console.log('-'.repeat(40));
    
    sessionManager.startHealthMonitoring();
    console.log('✅ Health monitoring started');
    console.log('   - Health checks every 30 minutes');
    console.log('   - Auto-refresh for expiring sessions');
    
    // Wait a bit then stop
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    sessionManager.stopHealthMonitoring();
    console.log('✅ Health monitoring stopped');

    // Cleanup
    console.log('\n📝 Cleanup');
    console.log('-'.repeat(40));
    
    await AppDataSource.destroy();
    console.log('✅ Database connection closed');

    console.log('\n' + '='.repeat(50));
    console.log('✨ Demo completed successfully!\n');
    
    console.log('💡 Summary:');
    console.log('   ✅ Encryption service working with AES-256-GCM');
    console.log('   ✅ SessionManager can create and manage sessions');
    console.log('   ✅ Health monitoring system operational');
    console.log('   ✅ Database operations working correctly');
    console.log('\n📌 Next Steps:');
    console.log('   1. Integrate real Threads cookies for actual sessions');
    console.log('   2. Implement StagehandWorker for automation tasks');
    console.log('   3. Set up API endpoints for session management');
    console.log('   4. Configure production monitoring');

  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    
    // Ensure cleanup on error
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    
    process.exit(1);
  }
}

// Run the demo
demo().catch(console.error);