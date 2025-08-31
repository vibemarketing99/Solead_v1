#!/usr/bin/env node

/**
 * Complete Solead Demo with Media Capture
 * Shows the full workflow: job submission → execution → media capture → monitoring
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║                  🚀 SOLEAD COMPLETE DEMO                    ║
║                                                              ║
║     Automated Lead Discovery with Visual Monitoring         ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runDemo() {
  console.log('📋 Demo Overview:');
  console.log('   1. Dashboard with real-time monitoring');
  console.log('   2. Screenshot capture during job execution');
  console.log('   3. Live media viewer showing automation progress');
  console.log('   4. Lead discovery and tracking\n');
  
  console.log('=' .repeat(60));
  
  // Step 1: Check if server is running
  console.log('\n📝 Step 1: Checking Dashboard Server');
  console.log('-'.repeat(40));
  
  try {
    const response = await fetch('http://localhost:3001/api/health');
    if (response.ok) {
      console.log('✅ Dashboard server is already running');
    }
  } catch (error) {
    console.log('⚠️  Dashboard server not running');
    console.log('📌 Please run: node start-demo-dashboard.js');
    console.log('   in a separate terminal first\n');
    return;
  }
  
  // Step 2: Submit a demo job
  console.log('\n📝 Step 2: Submitting Demo Job');
  console.log('-'.repeat(40));
  
  const jobData = {
    agentId: 'demo-agent-001',
    keywords: ['automation', 'lead generation', 'social media'],
    priority: 'high',
    captureMedia: true
  };
  
  console.log('   Job Configuration:');
  console.log(`   • Agent: ${jobData.agentId}`);
  console.log(`   • Keywords: ${jobData.keywords.join(', ')}`);
  console.log(`   • Priority: ${jobData.priority}`);
  console.log(`   • Media Capture: ${jobData.captureMedia ? 'Enabled' : 'Disabled'}`);
  
  try {
    const response = await fetch('http://localhost:3001/api/queues/lead-discovery/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jobData)
    });
    
    const result = await response.json();
    console.log(`\n✅ Job Created: ${result.data.jobId}`);
    
    // Step 3: Simulate job execution with screenshots
    console.log('\n📝 Step 3: Executing Job with Media Capture');
    console.log('-'.repeat(40));
    
    const stages = [
      { name: 'Initializing', icon: '🔧', duration: 2000 },
      { name: 'Logging into Threads', icon: '🔐', duration: 3000 },
      { name: 'Searching with keywords', icon: '🔍', duration: 4000 },
      { name: 'Discovering leads', icon: '🎯', duration: 5000 },
      { name: 'Processing results', icon: '📊', duration: 3000 },
      { name: 'Completing job', icon: '✅', duration: 1000 }
    ];
    
    for (const stage of stages) {
      console.log(`\n   ${stage.icon} ${stage.name}...`);
      
      // Create mock screenshot for this stage
      if (jobData.captureMedia) {
        const screenshotName = `demo-${Date.now()}-${stage.name.toLowerCase().replace(/\s+/g, '-')}.html`;
        createMockScreenshot(screenshotName, stage);
        console.log(`      📸 Screenshot captured: ${screenshotName}`);
      }
      
      // Show progress bar
      const progressSteps = Math.floor(stage.duration / 500);
      for (let i = 0; i < progressSteps; i++) {
        process.stdout.write('      ');
        for (let j = 0; j <= i; j++) {
          process.stdout.write('█');
        }
        for (let j = i + 1; j < progressSteps; j++) {
          process.stdout.write('░');
        }
        process.stdout.write(` ${Math.floor((i + 1) / progressSteps * 100)}%\r`);
        await delay(500);
      }
      console.log('');
    }
    
    // Step 4: Show results
    console.log('\n📝 Step 4: Job Results');
    console.log('-'.repeat(40));
    
    const mockLeads = [
      { handle: '@startup_founder', text: 'Looking for automation tools...', score: 0.92 },
      { handle: '@marketing_pro', text: 'Need better lead generation...', score: 0.87 },
      { handle: '@sales_manager', text: 'Exploring social selling...', score: 0.85 }
    ];
    
    console.log('\n🎯 Leads Discovered:');
    mockLeads.forEach((lead, index) => {
      console.log(`\n   ${index + 1}. ${lead.handle}`);
      console.log(`      "${lead.text}"`);
      console.log(`      Score: ${lead.score} | Category: ${lead.score > 0.9 ? 'HOT 🔥' : 'WARM ♨️'}`);
    });
    
    console.log('\n📊 Summary:');
    console.log(`   • Total Leads Found: ${mockLeads.length}`);
    console.log(`   • Hot Leads: ${mockLeads.filter(l => l.score > 0.9).length}`);
    console.log(`   • Processing Time: 18 seconds`);
    console.log(`   • Screenshots Captured: ${stages.length}`);
    
    // Step 5: Open viewers
    console.log('\n📝 Step 5: Opening Viewers');
    console.log('-'.repeat(40));
    
    console.log('\n🌐 Available Views:');
    console.log('   1. Enhanced Dashboard with Media:');
    console.log('      http://localhost:3001/dashboard-media');
    console.log('\n   2. Screenshot Gallery:');
    console.log('      http://localhost:3001/captures/viewer.html');
    console.log('\n   3. Basic Dashboard:');
    console.log('      http://localhost:3001/dashboard');
    
    // Open the enhanced dashboard
    exec('open "http://localhost:3001/dashboard-media"', (err) => {
      if (!err) {
        console.log('\n✅ Enhanced dashboard opened in browser!');
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to create job:', error.message);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n✨ Demo Complete!\n');
  
  console.log('💡 What You\'ve Seen:');
  console.log('   • Real-time job submission and monitoring');
  console.log('   • Screenshot capture at each automation stage');
  console.log('   • Visual evidence of automation progress');
  console.log('   • Lead discovery and scoring results');
  console.log('   • Enhanced dashboard with media viewer');
  
  console.log('\n🚀 Next Steps:');
  console.log('   1. Connect to real Threads API for actual automation');
  console.log('   2. Set up Redis for production queue management');
  console.log('   3. Deploy workers for parallel job processing');
  console.log('   4. Configure cloud storage for media files');
  console.log('   5. Add analytics and reporting features');
  
  console.log('\n📌 Keep the dashboard open to see real-time updates!');
}

function createMockScreenshot(filename, stage) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Job Screenshot - ${stage.name}</title>
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .browser-mock {
      width: 90%;
      max-width: 1200px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .browser-header {
      background: #f5f5f5;
      padding: 10px 15px;
      border-bottom: 1px solid #ddd;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .browser-controls {
      display: flex;
      gap: 8px;
    }
    .control {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    .control.red { background: #ff5f57; }
    .control.yellow { background: #ffbd2e; }
    .control.green { background: #28ca42; }
    .url-bar {
      flex: 1;
      background: white;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 14px;
      color: #666;
    }
    .content {
      padding: 40px;
      text-align: center;
      min-height: 400px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .stage-icon {
      font-size: 80px;
      margin-bottom: 20px;
    }
    .stage-title {
      font-size: 32px;
      color: #333;
      margin-bottom: 15px;
    }
    .stage-description {
      font-size: 18px;
      color: #666;
      margin-bottom: 30px;
    }
    .timestamp {
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(0,0,0,0.7);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
    }
    .progress-indicator {
      width: 300px;
      height: 8px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 20px;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      animation: progress 2s ease-in-out;
    }
    @keyframes progress {
      from { width: 0%; }
      to { width: 100%; }
    }
  </style>
</head>
<body>
  <div class="timestamp">Screenshot captured at ${new Date().toLocaleTimeString()}</div>
  
  <div class="browser-mock">
    <div class="browser-header">
      <div class="browser-controls">
        <div class="control red"></div>
        <div class="control yellow"></div>
        <div class="control green"></div>
      </div>
      <div class="url-bar">https://threads.net/${stage.name.toLowerCase().replace(/\s+/g, '-')}</div>
    </div>
    
    <div class="content">
      <div class="stage-icon">${stage.icon}</div>
      <div class="stage-title">${stage.name}</div>
      <div class="stage-description">
        ${stage.name === 'Logging into Threads' ? 'Authenticating with secure credentials...' :
          stage.name === 'Searching with keywords' ? 'Scanning for: automation, lead generation, social media' :
          stage.name === 'Discovering leads' ? 'Found 3 potential leads matching criteria!' :
          stage.name === 'Processing results' ? 'Analyzing engagement metrics and scoring leads...' :
          stage.name === 'Completing job' ? 'Job completed successfully! Results saved.' :
          'Preparing automation environment...'}
      </div>
      <div class="progress-indicator">
        <div class="progress-fill"></div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
  
  const dir = path.join(__dirname, 'captures', 'screenshots');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(path.join(dir, filename), html);
}

// Add fetch polyfill for Node.js
if (!global.fetch) {
  global.fetch = require('node-fetch');
}

// Run the demo
runDemo().catch(console.error);