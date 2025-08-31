#!/usr/bin/env ts-node

/**
 * Screenshot Capture Demo
 * Shows how automation captures screenshots during job execution
 */

import 'dotenv/config';
import { PlaywrightMockAutomation } from '../src/automation/PlaywrightMockAutomation';
import { MediaCaptureService } from '../src/services/MediaCapture';
import { Logger } from '../src/utils/Logger';
import path from 'path';
import fs from 'fs';

const logger = new Logger('ScreenshotDemo');

async function demo() {
  console.log('📸 Screenshot Capture Demo\n');
  console.log('='.repeat(50));
  
  const automation = new PlaywrightMockAutomation({
    headless: false, // Show browser window
    captureMedia: true
  });
  
  const mediaCapture = new MediaCaptureService('./captures');
  
  try {
    // Step 1: Initialize browser
    console.log('\n📝 Step 1: Initializing Browser');
    console.log('-'.repeat(40));
    
    await automation.initialize();
    console.log('✅ Browser initialized (check the window!)');
    
    // Step 2: Simulate job execution with screenshots
    console.log('\n📝 Step 2: Starting Job with Media Capture');
    console.log('-'.repeat(40));
    
    const jobId = `demo-${Date.now()}`;
    const agentId = 'demo-agent';
    const keywords = ['automation', 'workflow', 'productivity'];
    
    console.log(`   Job ID: ${jobId}`);
    console.log(`   Keywords: ${keywords.join(', ')}`);
    console.log(`   Capture Mode: Screenshots every 5 seconds`);
    
    // Start capture
    await automation.startCapture(jobId, agentId, keywords);
    console.log('✅ Media capture started');
    
    // Step 3: Simulate login
    console.log('\n📝 Step 3: Simulating Login');
    console.log('-'.repeat(40));
    
    await automation.login('demo_user', 'demo_pass');
    console.log('✅ Login screenshot captured');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 4: Search for posts
    console.log('\n📝 Step 4: Searching for Posts');
    console.log('-'.repeat(40));
    
    const posts = await automation.searchPosts(keywords);
    console.log(`✅ Found ${posts.length} posts`);
    console.log('✅ Search and lead screenshots captured');
    
    // Display found posts
    console.log('\n🎯 Posts Found:');
    posts.forEach((post, index) => {
      console.log(`\n   ${index + 1}. @${post.authorHandle}`);
      console.log(`      Text: ${post.text.substring(0, 60)}...`);
      console.log(`      Engagement: ${post.metrics.likes} likes, ${post.metrics.replies} replies`);
    });
    
    // Wait a bit to capture more screenshots
    console.log('\n⏳ Capturing additional screenshots...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 5: Stop capture and get results
    console.log('\n📝 Step 5: Stopping Capture');
    console.log('-'.repeat(40));
    
    const captureResult = await automation.stopCapture();
    
    if (captureResult) {
      console.log('\n📊 Capture Results:');
      console.log(`   Total Screenshots: ${captureResult.screenshots.length}`);
      console.log(`   Duration: ${(captureResult.metadata.duration / 1000).toFixed(2)} seconds`);
      console.log(`   Leads Found: ${captureResult.metadata.leadsFound}`);
      
      console.log('\n📁 Screenshot Files:');
      captureResult.screenshots.forEach((screenshot, index) => {
        const filename = path.basename(screenshot);
        const size = fs.existsSync(screenshot) ? 
          (fs.statSync(screenshot).size / 1024).toFixed(2) : '0';
        console.log(`   ${index + 1}. ${filename} (${size} KB)`);
      });
      
      // Show capture directory
      const captureDir = path.resolve('./captures/screenshots');
      console.log(`\n📂 Screenshots saved to:`);
      console.log(`   ${captureDir}`);
      
      // Create HTML viewer
      await createHTMLViewer(captureResult);
      console.log('\n🌐 HTML Viewer created: captures/viewer.html');
    }
    
    // Step 6: Cleanup
    console.log('\n📝 Step 6: Cleanup');
    console.log('-'.repeat(40));
    
    await automation.cleanup();
    console.log('✅ Browser closed');
    
    console.log('\n' + '='.repeat(50));
    console.log('✨ Screenshot Capture Demo Completed!\n');
    
    console.log('💡 What Happened:');
    console.log('   1. Browser opened and navigated to mock Threads');
    console.log('   2. Screenshots captured at key moments:');
    console.log('      - Login screen');
    console.log('      - Search results');
    console.log('      - Lead discovery moments');
    console.log('      - Job completion');
    console.log('   3. All screenshots saved with timestamps');
    console.log('   4. HTML viewer created for easy browsing');
    
    console.log('\n📌 Next Steps:');
    console.log('   1. Open captures/viewer.html to see all screenshots');
    console.log('   2. Check captures/screenshots/ directory');
    console.log('   3. Screenshots show what the agent "sees"');
    console.log('   4. In production, these would be stored per job');
    
  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    await automation.cleanup();
    process.exit(1);
  }
}

/**
 * Create HTML viewer for screenshots
 */
async function createHTMLViewer(captureResult: any) {
  const screenshots = captureResult.screenshots.map(s => path.basename(s));
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Job Screenshots - ${captureResult.jobId}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 {
      color: #333;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }
    .metadata {
      background: white;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .metadata div {
      margin: 5px 0;
    }
    .screenshots {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }
    .screenshot {
      background: white;
      padding: 10px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .screenshot img {
      width: 100%;
      height: auto;
      border-radius: 4px;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .screenshot img:hover {
      transform: scale(1.05);
    }
    .screenshot .caption {
      margin-top: 10px;
      font-size: 0.9em;
      color: #666;
      text-align: center;
    }
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      z-index: 1000;
    }
    .modal img {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      max-width: 90%;
      max-height: 90%;
    }
    .modal.show {
      display: block;
    }
  </style>
</head>
<body>
  <h1>📸 Job Screenshot Viewer</h1>
  
  <div class="metadata">
    <h2>Job Information</h2>
    <div><strong>Job ID:</strong> ${captureResult.jobId}</div>
    <div><strong>Keywords:</strong> ${captureResult.metadata.keywords.join(', ')}</div>
    <div><strong>Start Time:</strong> ${new Date(captureResult.metadata.startTime).toLocaleString()}</div>
    <div><strong>Duration:</strong> ${(captureResult.metadata.duration / 1000).toFixed(2)} seconds</div>
    <div><strong>Total Screenshots:</strong> ${captureResult.screenshots.length}</div>
    <div><strong>Leads Found:</strong> ${captureResult.metadata.leadsFound}</div>
  </div>
  
  <h2>Screenshots Timeline</h2>
  <div class="screenshots">
    ${screenshots.map((screenshot, index) => `
      <div class="screenshot">
        <img src="screenshots/${screenshot}" 
             alt="Screenshot ${index + 1}" 
             onclick="showModal('screenshots/${screenshot}')">
        <div class="caption">
          Screenshot ${index + 1}<br>
          ${screenshot.includes('login') ? '🔐 Login' : ''}
          ${screenshot.includes('search') ? '🔍 Search' : ''}
          ${screenshot.includes('lead') ? '🎯 Lead Found' : ''}
          ${screenshot.includes('complete') ? '✅ Complete' : ''}
        </div>
      </div>
    `).join('')}
  </div>
  
  <div id="modal" class="modal" onclick="hideModal()">
    <img id="modalImg" src="" alt="Full size screenshot">
  </div>
  
  <script>
    function showModal(src) {
      document.getElementById('modalImg').src = src;
      document.getElementById('modal').classList.add('show');
    }
    
    function hideModal() {
      document.getElementById('modal').classList.remove('show');
    }
  </script>
</body>
</html>
  `;
  
  fs.writeFileSync('./captures/viewer.html', html);
}

// Run the demo
demo().catch(console.error);