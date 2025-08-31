#!/usr/bin/env node

/**
 * Navigation Test Guide
 * Shows all available pages with the unified navigation header
 */

const { exec } = require('child_process');

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║            🧭 SOLEAD NAVIGATION TEST GUIDE                  ║
║                                                              ║
║      All Pages Now Have Unified Navigation Header!          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);

console.log('\n📍 AVAILABLE PAGES WITH NAVIGATION:\n');
console.log('═'.repeat(60));

const pages = [
  {
    name: '📊 Main Dashboard',
    url: 'http://localhost:3001/dashboard-unified',
    description: 'Overview with stats, recent activity, and quick actions',
    features: ['Real-time stats', 'Activity feed', 'System status', 'Quick action buttons']
  },
  {
    name: '🎯 Leads Viewer',
    url: 'http://localhost:3001/leads',
    description: 'Enhanced lead management with Grid/List toggle',
    features: ['Grid/List view toggle', 'Screenshot previews', 'Video buttons', 'Reply placeholders']
  },
  {
    name: '⚡ Jobs Monitor',
    url: 'http://localhost:3001/dashboard-media',
    description: 'Job execution with live media capture',
    features: ['Job queue status', 'Live screenshots', 'Progress tracking', 'Add new jobs']
  },
  {
    name: '📸 Media Gallery',
    url: 'http://localhost:3001/captures/viewer.html',
    description: 'Screenshot gallery from all captured jobs',
    features: ['Timeline view', 'Full-size screenshots', 'Job context', 'Export options']
  },
  {
    name: '📈 Analytics',
    url: 'http://localhost:3001/captures/lead-viewer.html',
    description: 'Lead analytics and detailed insights',
    features: ['Lead scoring', 'Engagement metrics', 'Thread URLs', 'Conversion tracking']
  }
];

console.log('\n🔗 NAVIGATION FEATURES:');
console.log('   • Unified header across all pages');
console.log('   • Active page highlighting');
console.log('   • Live badges (lead count, job count)');
console.log('   • System status indicator');
console.log('   • Quick navigation between all views');

pages.forEach((page, index) => {
  console.log(`\n${index + 1}. ${page.name}`);
  console.log('   ' + '─'.repeat(40));
  console.log(`   URL: ${page.url}`);
  console.log(`   ${page.description}`);
  console.log('\n   Key Features:');
  page.features.forEach(feature => {
    console.log(`   • ${feature}`);
  });
});

console.log('\n' + '═'.repeat(60));
console.log('\n🧪 TESTING THE NAVIGATION:\n');

console.log('1. Click any navigation link to switch between pages');
console.log('2. Notice the active page indicator (blue underline)');
console.log('3. Watch the live badges update (leads/jobs counts)');
console.log('4. Check the system status indicator (green pulse)');
console.log('5. Test responsiveness by resizing the window');

console.log('\n💡 TRY THIS WORKFLOW:');
console.log('   1. Start at Dashboard → View overall stats');
console.log('   2. Click "Leads" → See all discovered leads');
console.log('   3. Toggle Grid/List view → Different viewing modes');
console.log('   4. Click "Jobs" → Monitor active automations');
console.log('   5. Click "Media" → Browse captured screenshots');
console.log('   6. Click "Analytics" → Deep dive into lead data');

console.log('\n🎯 NAVIGATION HEADER INCLUDES:');
console.log('   • Logo (🚀 Solead) - Always visible');
console.log('   • 6 Main sections with icons');
console.log('   • Live count badges for Leads and Jobs');
console.log('   • System status indicator');
console.log('   • View toggle (on Leads page)');

console.log('\n' + '═'.repeat(60));
console.log('\n✅ All pages are now connected!\n');

console.log('📌 Opening the unified dashboard now...\n');

// Open the main dashboard
exec('open "http://localhost:3001/dashboard-unified"', (err) => {
  if (!err) {
    console.log('✨ Dashboard opened! Use the navigation header to explore all pages.');
    console.log('\n🚀 Happy testing!');
  }
});