#!/usr/bin/env node

/**
 * Lead Capture with Thread Links Demo
 * Shows how each lead is captured with a direct link back to the thread
 */

const fs = require('fs');
const path = require('path');

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║         📸 LEAD CAPTURE WITH THREAD LINKS DEMO              ║
║                                                              ║
║    Capturing Leads with Direct Links to Conversations       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);

// Mock leads with thread URLs
const mockLeads = [
  {
    id: 'lead-001',
    authorHandle: 'startup_founder',
    authorName: 'Alex Chen',
    threadUrl: 'https://threads.net/@startup_founder/post/C123abc456',
    text: 'We desperately need a solution to automate our social media lead generation. Currently spending 20+ hours/week manually searching. Any recommendations for tools that actually work?',
    metrics: {
      replies: 23,
      likes: 156,
      reposts: 12,
      views: 2341
    },
    timestamp: '2 hours ago',
    score: 0.92,
    category: 'HOT',
    keywords: ['automation', 'lead generation', 'tools']
  },
  {
    id: 'lead-002',
    authorHandle: 'marketing_director',
    authorName: 'Sarah Johnson',
    threadUrl: 'https://threads.net/@marketing_director/post/C456def789',
    text: 'Looking for workflow automation experts. Our team is drowning in repetitive tasks. Need someone who can help us streamline our processes ASAP. Budget approved.',
    metrics: {
      replies: 15,
      likes: 89,
      reposts: 5,
      views: 1523
    },
    timestamp: '5 hours ago',
    score: 0.87,
    category: 'WARM',
    keywords: ['workflow', 'automation', 'processes']
  },
  {
    id: 'lead-003',
    authorHandle: 'tech_consultant',
    authorName: 'Mike Rodriguez',
    threadUrl: 'https://threads.net/@tech_consultant/post/C789ghi012',
    text: 'Just lost 3 days of productivity due to manual data entry. There has to be a better way to handle lead qualification and scoring. What are you all using?',
    metrics: {
      replies: 31,
      likes: 203,
      reposts: 18,
      views: 4567
    },
    timestamp: '1 day ago',
    score: 0.95,
    category: 'HOT',
    keywords: ['productivity', 'lead qualification', 'automation']
  }
];

console.log('\n📊 Simulating Lead Discovery Process...\n');
console.log('=' .repeat(60));

// Create captures directory
const capturesDir = path.join(__dirname, 'captures');
const screenshotsDir = path.join(capturesDir, 'lead-screenshots');
const leadsDataDir = path.join(capturesDir, 'leads-data');

[capturesDir, screenshotsDir, leadsDataDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Process each lead
mockLeads.forEach((lead, index) => {
  console.log(`\n🔍 Processing Lead ${index + 1}/${mockLeads.length}`);
  console.log('-'.repeat(40));
  
  // Display lead info
  console.log(`👤 @${lead.authorHandle} (${lead.authorName})`);
  console.log(`📝 "${lead.text.substring(0, 80)}..."`);
  console.log(`📊 Engagement: ${lead.metrics.likes} likes, ${lead.metrics.replies} replies`);
  console.log(`🎯 Score: ${lead.score} - ${lead.category} ${lead.category === 'HOT' ? '🔥' : '♨️'}`);
  console.log(`🔗 Thread URL: ${lead.threadUrl}`);
  
  // Create screenshot with thread context
  const screenshotHtml = createLeadScreenshot(lead);
  const screenshotFile = `lead-${lead.id}-screenshot.html`;
  fs.writeFileSync(path.join(screenshotsDir, screenshotFile), screenshotHtml);
  console.log(`📸 Screenshot captured: ${screenshotFile}`);
  
  // Save lead data with URL
  const leadData = {
    ...lead,
    capturedAt: new Date().toISOString(),
    screenshotPath: screenshotFile,
    actionRequired: lead.score > 0.9 ? 'IMMEDIATE' : 'SCHEDULED'
  };
  
  const dataFile = `lead-${lead.id}-data.json`;
  fs.writeFileSync(
    path.join(leadsDataDir, dataFile),
    JSON.stringify(leadData, null, 2)
  );
  console.log(`💾 Lead data saved: ${dataFile}`);
});

// Create lead viewer dashboard
const viewerHtml = createLeadViewer(mockLeads);
fs.writeFileSync(path.join(capturesDir, 'lead-viewer.html'), viewerHtml);

console.log('\n' + '=' .repeat(60));
console.log('\n✨ Lead Capture Complete!\n');

console.log('📊 Summary:');
console.log(`   • Total Leads Captured: ${mockLeads.length}`);
console.log(`   • Hot Leads: ${mockLeads.filter(l => l.category === 'HOT').length}`);
console.log(`   • Warm Leads: ${mockLeads.filter(l => l.category === 'WARM').length}`);
console.log(`   • Screenshots with URLs: ${mockLeads.length}`);
console.log(`   • Data Files Created: ${mockLeads.length}`);

console.log('\n🔗 Key Features Demonstrated:');
console.log('   ✅ Each lead screenshot includes the thread URL');
console.log('   ✅ Direct link back to original conversation');
console.log('   ✅ Full conversation context preserved');
console.log('   ✅ Engagement metrics captured');
console.log('   ✅ Lead scoring and categorization');

console.log('\n📁 Output Files:');
console.log(`   • Lead Viewer: ${path.join(capturesDir, 'lead-viewer.html')}`);
console.log(`   • Screenshots: ${screenshotsDir}`);
console.log(`   • Lead Data: ${leadsDataDir}`);

console.log('\n🚀 Opening Lead Viewer...');

// Open the viewer
const { exec } = require('child_process');
exec(`open "${path.join(capturesDir, 'lead-viewer.html')}"`, (err) => {
  if (!err) {
    console.log('✅ Lead viewer opened in browser!');
    console.log('\n💡 Click on any lead to see the thread URL and full context!');
  }
});

function createLeadScreenshot(lead) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Lead Capture - @${lead.authorHandle}</title>
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background: #000;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .screenshot-container {
      width: 100%;
      max-width: 1400px;
      position: relative;
    }
    .browser-frame {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(255,255,255,0.1);
    }
    .browser-header {
      background: #1a1a1a;
      padding: 12px 15px;
      display: flex;
      align-items: center;
      gap: 15px;
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
      background: #2a2a2a;
      color: #aaa;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-family: monospace;
    }
    .threads-content {
      background: #fff;
      padding: 20px;
      min-height: 600px;
    }
    .threads-header {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 20px;
      border-bottom: 1px solid #e0e0e0;
    }
    .threads-logo {
      font-size: 32px;
      font-weight: bold;
    }
    .post-container {
      padding: 20px;
      border: 3px solid #10b981;
      border-radius: 12px;
      margin: 20px;
      background: linear-gradient(to right, #f0fdf4, #ffffff);
      position: relative;
    }
    .post-author {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 15px;
    }
    .avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea, #764ba2);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 20px;
    }
    .author-info {
      flex: 1;
    }
    .author-name {
      font-weight: bold;
      color: #111;
      font-size: 16px;
    }
    .author-handle {
      color: #666;
      font-size: 14px;
    }
    .timestamp {
      color: #999;
      font-size: 12px;
    }
    .post-content {
      font-size: 15px;
      line-height: 1.6;
      color: #333;
      margin-bottom: 20px;
    }
    .post-metrics {
      display: flex;
      gap: 30px;
      padding-top: 15px;
      border-top: 1px solid #e0e0e0;
      font-size: 14px;
      color: #666;
    }
    .metric {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .lead-marker {
      position: absolute;
      top: -15px;
      right: 20px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: bold;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .thread-url {
      position: absolute;
      bottom: -40px;
      left: 20px;
      right: 20px;
      background: #1e293b;
      color: #94a3b8;
      padding: 10px 15px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .thread-url a {
      color: #60a5fa;
      text-decoration: none;
      flex: 1;
    }
    .thread-url a:hover {
      text-decoration: underline;
    }
    .highlight-keywords {
      background: #fef3c7;
      padding: 2px 4px;
      border-radius: 3px;
      font-weight: 500;
    }
    .capture-info {
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-size: 12px;
      max-width: 300px;
    }
    .capture-info h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
    }
    .capture-info div {
      margin: 5px 0;
    }
    .score-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-weight: bold;
      background: ${lead.category === 'HOT' ? '#dc2626' : '#f59e0b'};
      color: white;
    }
  </style>
</head>
<body>
  <div class="screenshot-container">
    <div class="capture-info">
      <h3>📸 Lead Captured</h3>
      <div>Job ID: demo-${Date.now()}</div>
      <div>Time: ${new Date().toLocaleTimeString()}</div>
      <div>Score: <span class="score-badge">${lead.score} ${lead.category}</span></div>
      <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #444;">
        <strong>Thread URL Captured:</strong><br>
        <span style="font-size: 10px; word-break: break-all;">${lead.threadUrl}</span>
      </div>
    </div>
    
    <div class="browser-frame">
      <div class="browser-header">
        <div class="browser-controls">
          <div class="control red"></div>
          <div class="control yellow"></div>
          <div class="control green"></div>
        </div>
        <div class="url-bar">${lead.threadUrl}</div>
      </div>
      
      <div class="threads-content">
        <div class="threads-header">
          <div class="threads-logo">Threads</div>
          <div style="flex: 1;"></div>
          <div style="color: #666; font-size: 14px;">For You | Following | Search</div>
        </div>
        
        <div class="post-container">
          <div class="lead-marker">
            🎯 LEAD CAPTURED - Score: ${lead.score}
          </div>
          
          <div class="post-author">
            <div class="avatar">${lead.authorName.charAt(0)}</div>
            <div class="author-info">
              <div class="author-name">${lead.authorName}</div>
              <div class="author-handle">@${lead.authorHandle}</div>
            </div>
            <div class="timestamp">${lead.timestamp}</div>
          </div>
          
          <div class="post-content">
            ${lead.text.replace(
              /(automation|lead generation|workflow|productivity|tools)/gi,
              '<span class="highlight-keywords">$1</span>'
            )}
          </div>
          
          <div class="post-metrics">
            <div class="metric">❤️ ${lead.metrics.likes}</div>
            <div class="metric">💬 ${lead.metrics.replies}</div>
            <div class="metric">🔁 ${lead.metrics.reposts}</div>
            <div class="metric">👁️ ${lead.metrics.views.toLocaleString()}</div>
          </div>
          
          <div class="thread-url">
            <span>🔗</span>
            <a href="${lead.threadUrl}" target="_blank">${lead.threadUrl}</a>
            <button style="background: #3b82f6; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer;">
              Open Thread
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

function createLeadViewer(leads) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Lead Capture Viewer - With Thread Links</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      margin: 0;
      padding: 20px;
      min-height: 100vh;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    h1 {
      color: white;
      text-align: center;
      font-size: 36px;
      margin-bottom: 10px;
    }
    .subtitle {
      color: rgba(255,255,255,0.9);
      text-align: center;
      font-size: 18px;
      margin-bottom: 30px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .stat-value {
      font-size: 36px;
      font-weight: bold;
      color: #333;
    }
    .stat-label {
      font-size: 14px;
      color: #666;
      margin-top: 5px;
    }
    .leads-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 20px;
    }
    .lead-card {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      cursor: pointer;
    }
    .lead-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.15);
    }
    .lead-header {
      padding: 20px;
      background: linear-gradient(135deg, #f0f0f0, #e0e0e0);
      border-bottom: 1px solid #ddd;
    }
    .lead-score {
      float: right;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      color: white;
    }
    .score-hot { background: #dc2626; }
    .score-warm { background: #f59e0b; }
    .lead-author {
      font-weight: bold;
      color: #333;
      font-size: 16px;
    }
    .lead-handle {
      color: #666;
      font-size: 14px;
    }
    .lead-content {
      padding: 20px;
    }
    .lead-text {
      color: #444;
      line-height: 1.5;
      margin-bottom: 15px;
      font-size: 14px;
    }
    .lead-metrics {
      display: flex;
      gap: 15px;
      margin-bottom: 15px;
      font-size: 13px;
      color: #666;
    }
    .lead-url {
      background: #f0f0f0;
      padding: 10px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 11px;
      color: #333;
      word-break: break-all;
      margin-bottom: 15px;
    }
    .lead-url a {
      color: #3b82f6;
      text-decoration: none;
    }
    .lead-url a:hover {
      text-decoration: underline;
    }
    .lead-actions {
      display: flex;
      gap: 10px;
    }
    .btn {
      flex: 1;
      padding: 8px 12px;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .btn-primary {
      background: #667eea;
      color: white;
    }
    .btn-primary:hover {
      background: #5a67d8;
    }
    .btn-secondary {
      background: white;
      color: #667eea;
      border: 1px solid #667eea;
    }
    .btn-secondary:hover {
      background: #f0f0f0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎯 Lead Capture Viewer</h1>
    <div class="subtitle">All captured leads with direct links to original threads</div>
    
    <div class="stats">
      <div class="stat-card">
        <div class="stat-value">${leads.length}</div>
        <div class="stat-label">Total Leads</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${leads.filter(l => l.category === 'HOT').length}</div>
        <div class="stat-label">Hot Leads 🔥</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${leads.filter(l => l.category === 'WARM').length}</div>
        <div class="stat-label">Warm Leads ♨️</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${leads.length}</div>
        <div class="stat-label">Thread URLs Captured</div>
      </div>
    </div>
    
    <div class="leads-grid">
      ${leads.map(lead => `
        <div class="lead-card" onclick="window.open('lead-screenshots/lead-${lead.id}-screenshot.html', '_blank')">
          <div class="lead-header">
            <span class="lead-score score-${lead.category.toLowerCase()}">${lead.score} ${lead.category}</span>
            <div class="lead-author">${lead.authorName}</div>
            <div class="lead-handle">@${lead.authorHandle}</div>
          </div>
          <div class="lead-content">
            <div class="lead-text">${lead.text}</div>
            <div class="lead-metrics">
              <span>❤️ ${lead.metrics.likes}</span>
              <span>💬 ${lead.metrics.replies}</span>
              <span>🔁 ${lead.metrics.reposts}</span>
              <span>👁️ ${lead.metrics.views.toLocaleString()}</span>
            </div>
            <div class="lead-url">
              🔗 <a href="${lead.threadUrl}" target="_blank">${lead.threadUrl}</a>
            </div>
            <div class="lead-actions">
              <button class="btn btn-primary" onclick="event.stopPropagation(); window.open('${lead.threadUrl}', '_blank')">
                Open Thread
              </button>
              <button class="btn btn-secondary" onclick="event.stopPropagation(); window.open('lead-screenshots/lead-${lead.id}-screenshot.html', '_blank')">
                View Screenshot
              </button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>
  `;
}