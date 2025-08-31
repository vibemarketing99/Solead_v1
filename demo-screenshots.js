#!/usr/bin/env node

/**
 * Simple Screenshot Demo
 * Shows mock screenshots of what the automation would capture
 */

const fs = require('fs');
const path = require('path');

// Create captures directory
const capturesDir = './captures';
const screenshotsDir = path.join(capturesDir, 'screenshots');

if (!fs.existsSync(capturesDir)) {
  fs.mkdirSync(capturesDir, { recursive: true });
}
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

console.log('📸 Screenshot Capture Demo (Simulated)\n');
console.log('='.repeat(50));

// Mock job execution
const jobId = `demo-${Date.now()}`;
const screenshots = [];

console.log('\n📝 Job Information:');
console.log(`   Job ID: ${jobId}`);
console.log(`   Keywords: automation, workflow, productivity`);
console.log(`   Agent: demo-agent`);

console.log('\n🎬 Simulating Job Execution with Screenshots...\n');

// Simulate screenshot captures
const mockScreenshots = [
  {
    name: 'login',
    timestamp: Date.now(),
    description: '🔐 Login Screen',
    content: 'Logging into Threads...'
  },
  {
    name: 'search',
    timestamp: Date.now() + 2000,
    description: '🔍 Search Query',
    content: 'Searching for: automation, workflow'
  },
  {
    name: 'lead-1',
    timestamp: Date.now() + 5000,
    description: '🎯 Lead Found',
    content: '@john_doe: Looking for automation solutions...'
  },
  {
    name: 'lead-2',
    timestamp: Date.now() + 8000,
    description: '🎯 Lead Found',
    content: '@jane_smith: Need help with workflow automation...'
  },
  {
    name: 'complete',
    timestamp: Date.now() + 10000,
    description: '✅ Job Complete',
    content: 'Found 2 leads successfully!'
  }
];

// Create mock screenshot files
mockScreenshots.forEach((screenshot, index) => {
  const filename = `job-${jobId}-${screenshot.name}.html`;
  const filepath = path.join(screenshotsDir, filename);
  
  // Create HTML file that looks like a screenshot
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Screenshot: ${screenshot.description}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      margin: 0;
      padding: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .browser-frame {
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
      min-height: 400px;
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
    .status {
      font-size: 48px;
      margin-bottom: 20px;
    }
    .description {
      font-size: 24px;
      color: #333;
      margin-bottom: 30px;
    }
    .details {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      font-family: monospace;
      color: #666;
    }
    .lead-card {
      background: white;
      border: 2px solid #667eea;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="timestamp">Screenshot ${index + 1}/5 - ${new Date(screenshot.timestamp).toLocaleTimeString()}</div>
  
  <div class="browser-frame">
    <div class="browser-header">
      <div class="browser-controls">
        <div class="control red"></div>
        <div class="control yellow"></div>
        <div class="control green"></div>
      </div>
      <div class="url-bar">https://threads.net/search</div>
    </div>
    
    <div class="content">
      <div class="status">${screenshot.description.split(' ')[0]}</div>
      <div class="description">${screenshot.description}</div>
      <div class="details">
        <strong>Job ID:</strong> ${jobId}<br>
        <strong>Timestamp:</strong> ${new Date(screenshot.timestamp).toISOString()}<br>
        <strong>Action:</strong> ${screenshot.content}
      </div>
      
      ${screenshot.name.includes('lead') ? `
        <div class="lead-card">
          <h3>Lead Captured!</h3>
          <p>${screenshot.content}</p>
          <p style="color: #667eea;">Score: 0.85 | Category: Hot</p>
        </div>
      ` : ''}
    </div>
  </div>
</body>
</html>
  `;
  
  fs.writeFileSync(filepath, html);
  screenshots.push(filename);
  
  console.log(`   ${screenshot.description} - Screenshot saved`);
  
  // Simulate delay
  const delay = index < mockScreenshots.length - 1 ? 1000 : 0;
  if (delay) {
    const start = Date.now();
    while (Date.now() - start < delay) {
      // Wait
    }
  }
});

// Create viewer HTML
const viewerHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Job Screenshots Viewer - ${jobId}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 {
      color: #333;
      border-bottom: 3px solid #667eea;
      padding-bottom: 15px;
    }
    .info-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 15px;
    }
    .info-item {
      padding: 10px;
      background: #f8f9fa;
      border-radius: 6px;
    }
    .info-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .info-value {
      font-size: 18px;
      font-weight: bold;
      color: #333;
      margin-top: 5px;
    }
    .screenshots-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 25px;
      margin-top: 30px;
    }
    .screenshot-card {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    .screenshot-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.15);
    }
    .screenshot-preview {
      height: 250px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 60px;
      cursor: pointer;
    }
    .screenshot-info {
      padding: 15px;
    }
    .screenshot-title {
      font-weight: bold;
      color: #333;
      margin-bottom: 5px;
    }
    .screenshot-time {
      color: #666;
      font-size: 14px;
    }
    .view-btn {
      display: inline-block;
      margin-top: 10px;
      padding: 8px 16px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-size: 14px;
      transition: background 0.3s ease;
    }
    .view-btn:hover {
      background: #5a67d8;
    }
    .timeline {
      background: white;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .timeline-item {
      display: flex;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }
    .timeline-icon {
      font-size: 24px;
      margin-right: 15px;
    }
    .timeline-content {
      flex: 1;
    }
    .timeline-time {
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <h1>📸 Job Screenshot Viewer</h1>
  
  <div class="info-card">
    <h2>Job Execution Summary</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Job ID</div>
        <div class="info-value">${jobId}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Total Screenshots</div>
        <div class="info-value">${screenshots.length}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Keywords</div>
        <div class="info-value">automation, workflow</div>
      </div>
      <div class="info-item">
        <div class="info-label">Leads Found</div>
        <div class="info-value">2</div>
      </div>
    </div>
  </div>
  
  <div class="timeline">
    <h2>Execution Timeline</h2>
    ${mockScreenshots.map(s => `
      <div class="timeline-item">
        <div class="timeline-icon">${s.description.split(' ')[0]}</div>
        <div class="timeline-content">
          <div><strong>${s.description}</strong></div>
          <div class="timeline-time">${new Date(s.timestamp).toLocaleTimeString()}</div>
        </div>
      </div>
    `).join('')}
  </div>
  
  <h2>Screenshot Gallery</h2>
  <div class="screenshots-grid">
    ${screenshots.map((screenshot, index) => {
      const mock = mockScreenshots[index];
      return `
        <div class="screenshot-card">
          <div class="screenshot-preview" onclick="window.open('screenshots/${screenshot}', '_blank')">
            ${mock.description.split(' ')[0]}
          </div>
          <div class="screenshot-info">
            <div class="screenshot-title">${mock.description}</div>
            <div class="screenshot-time">Captured at ${new Date(mock.timestamp).toLocaleTimeString()}</div>
            <a href="screenshots/${screenshot}" target="_blank" class="view-btn">View Full Screenshot</a>
          </div>
        </div>
      `;
    }).join('')}
  </div>
  
  <div style="margin-top: 40px; padding: 20px; background: #e8f4f8; border-radius: 8px;">
    <h3>💡 How This Works</h3>
    <p>Each screenshot represents a key moment in the job execution:</p>
    <ul>
      <li><strong>Login:</strong> Agent authenticates with Threads</li>
      <li><strong>Search:</strong> Queries are executed with your keywords</li>
      <li><strong>Lead Discovery:</strong> Potential leads are identified and captured</li>
      <li><strong>Completion:</strong> Final summary of the job</li>
    </ul>
    <p>In production, these would be actual browser screenshots showing real Threads pages!</p>
  </div>
</body>
</html>
`;

fs.writeFileSync(path.join(capturesDir, 'viewer.html'), viewerHTML);

console.log('\n' + '='.repeat(50));
console.log('✨ Screenshot Capture Demo Complete!\n');

console.log('📊 Results:');
console.log(`   • ${screenshots.length} screenshots captured`);
console.log(`   • Saved to: ${path.resolve(screenshotsDir)}`);
console.log(`   • Viewer created: ${path.resolve(capturesDir, 'viewer.html')}`);

console.log('\n🌐 To view the screenshots:');
console.log(`   1. Open: ${path.resolve(capturesDir, 'viewer.html')}`);
console.log('   2. Click on any screenshot to view full size');
console.log('   3. Each screenshot shows what the agent would see');

console.log('\n💡 What This Demonstrates:');
console.log('   • Screenshots capture key moments during job execution');
console.log('   • Visual evidence of automation progress');
console.log('   • Easy monitoring of what the agent is doing');
console.log('   • In production, these would be real browser screenshots');

// Open the viewer automatically
const opener = process.platform === 'darwin' ? 'open' : 
               process.platform === 'win32' ? 'start' : 'xdg-open';

const { exec } = require('child_process');
exec(`${opener} ${path.resolve(capturesDir, 'viewer.html')}`, (err) => {
  if (!err) {
    console.log('\n✅ Viewer opened in your browser!');
  }
});