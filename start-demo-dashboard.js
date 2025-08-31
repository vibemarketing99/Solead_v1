#!/usr/bin/env node

/**
 * Simple Dashboard Demo Server (No TypeScript, No Redis)
 * Pure JavaScript for immediate demo
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files (CSS, components, etc.)
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/components', express.static(path.join(__dirname, 'public', 'components')));

// Serve dashboard
app.use('/dashboard', express.static(path.join(__dirname, 'public')));

// Serve root path - redirect to unified dashboard
app.get('/', (req, res) => {
  res.redirect('/dashboard-unified');
});

// Serve jobs dashboard with media
app.get('/dashboard-media', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard-media.html'));
});

// Serve leads page with grid/list toggle
app.get('/leads', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'leads.html'));
});

// Serve unified dashboard with navigation
app.get('/dashboard-unified', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard-unified.html'));
});

// Serve analytics page
app.get('/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'analytics.html'));
});

// Serve captures directory for media files and viewer
app.use('/captures', express.static(path.join(__dirname, 'public', 'captures')));

// Mock data
let mockQueues = {
  'lead-discovery': {
    isHealthy: true,
    metrics: {
      waiting: 2,
      active: 1,
      completed: 5,
      failed: 0,
      delayed: 0,
      paused: false
    }
  },
  'lead-engagement': {
    isHealthy: true,
    metrics: {
      waiting: 0,
      active: 0,
      completed: 3,
      failed: 0,
      delayed: 1,
      paused: false
    }
  },
  'session-refresh': {
    isHealthy: true,
    metrics: {
      waiting: 0,
      active: 0,
      completed: 10,
      failed: 0,
      delayed: 0,
      paused: false
    }
  },
  'report-generation': {
    isHealthy: true,
    metrics: {
      waiting: 0,
      active: 0,
      completed: 2,
      failed: 0,
      delayed: 0,
      paused: false
    }
  }
};

let mockJobs = [
  {
    id: '1',
    data: {
      agentId: 'demo-agent',
      keywords: ['automation', 'testing'],
      priority: 'normal'
    },
    state: 'completed',
    progress: 100,
    attemptsMade: 1,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    processedOn: new Date(Date.now() - 3000000).toISOString(),
    finishedOn: new Date(Date.now() - 2900000).toISOString(),
    result: {
      success: true,
      leadsDiscovered: 3,
      processingTime: 5000
    }
  },
  {
    id: '2',
    data: {
      agentId: 'demo-agent',
      keywords: ['lead', 'generation'],
      priority: 'high'
    },
    state: 'active',
    progress: 45,
    attemptsMade: 1,
    createdAt: new Date(Date.now() - 60000).toISOString(),
    processedOn: new Date(Date.now() - 30000).toISOString(),
    finishedOn: null
  },
  {
    id: '3',
    data: {
      agentId: 'demo-agent',
      keywords: ['social', 'media'],
      priority: 'normal'
    },
    state: 'waiting',
    progress: 0,
    attemptsMade: 0,
    createdAt: new Date(Date.now() - 10000).toISOString(),
    processedOn: null,
    finishedOn: null
  }
];

// Simulate job processing
setInterval(() => {
  mockJobs.forEach(job => {
    if (job.state === 'active' && job.progress < 100) {
      job.progress = Math.min(100, job.progress + 10);
      if (job.progress === 100) {
        job.state = 'completed';
        job.finishedOn = new Date().toISOString();
        job.result = {
          success: true,
          leadsDiscovered: Math.floor(Math.random() * 5) + 1,
          processingTime: 3000 + Math.random() * 2000
        };
        mockQueues['lead-discovery'].metrics.active--;
        mockQueues['lead-discovery'].metrics.completed++;
      }
    }
  });
  
  const waitingJob = mockJobs.find(j => j.state === 'waiting');
  const activeJobs = mockJobs.filter(j => j.state === 'active');
  if (waitingJob && activeJobs.length < 2) {
    waitingJob.state = 'active';
    waitingJob.processedOn = new Date().toISOString();
    waitingJob.progress = 10;
    mockQueues['lead-discovery'].metrics.waiting--;
    mockQueues['lead-discovery'].metrics.active++;
  }
}, 2000);

// Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      queue: 'ready (mock)',
      queueStats: mockQueues
    }
  });
});

app.get('/api/queues/stats', (req, res) => {
  res.json({
    success: true,
    data: mockQueues,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/queues/:queueName/jobs', (req, res) => {
  const filteredJobs = mockJobs.slice(0, 10);
  res.json({
    success: true,
    data: filteredJobs,
    count: filteredJobs.length
  });
});

app.get('/api/queues/:queueName/jobs/:jobId', (req, res) => {
  const job = mockJobs.find(j => j.id === req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json({ success: true, data: job });
});

app.post('/api/queues/lead-discovery/jobs', (req, res) => {
  const { agentId, keywords, priority = 'normal' } = req.body;
  
  if (!agentId || !keywords) {
    return res.status(400).json({ 
      error: 'Missing required fields' 
    });
  }
  
  const newJob = {
    id: (mockJobs.length + 1).toString(),
    data: { agentId, keywords, priority },
    state: 'waiting',
    progress: 0,
    attemptsMade: 0,
    createdAt: new Date().toISOString(),
    processedOn: null,
    finishedOn: null
  };
  
  mockJobs.unshift(newJob);
  mockQueues['lead-discovery'].metrics.waiting++;
  
  res.status(201).json({
    success: true,
    data: {
      jobId: newJob.id,
      agentId,
      keywords,
      priority,
      state: 'waiting'
    }
  });
});

app.post('/api/queues/:queueName/pause', (req, res) => {
  const queueName = req.params.queueName;
  if (mockQueues[queueName]) {
    mockQueues[queueName].metrics.paused = true;
  }
  res.json({ success: true, message: `Queue ${queueName} paused` });
});

app.post('/api/queues/:queueName/resume', (req, res) => {
  const queueName = req.params.queueName;
  if (mockQueues[queueName]) {
    mockQueues[queueName].metrics.paused = false;
  }
  res.json({ success: true, message: `Queue ${queueName} resumed` });
});

app.post('/api/queues/:queueName/clean', (req, res) => {
  const beforeCount = mockJobs.length;
  mockJobs = mockJobs.filter(j => j.state !== 'completed');
  const removed = beforeCount - mockJobs.length;
  mockQueues[req.params.queueName].metrics.completed = 0;
  res.json({ success: true, message: `Cleaned ${removed} jobs` });
});

// API endpoint for media capture
app.get('/api/jobs/:jobId/media', (req, res) => {
  const jobId = req.params.jobId;
  
  // Mock media data for the job
  const mockMediaData = {
    jobId,
    screenshots: [
      {
        filename: `job-${jobId}-login.html`,
        timestamp: new Date(Date.now() - 10000).toISOString(),
        event: 'login',
        path: `/captures/screenshots/job-${jobId}-login.html`
      },
      {
        filename: `job-${jobId}-search.html`,
        timestamp: new Date(Date.now() - 8000).toISOString(),
        event: 'search',
        path: `/captures/screenshots/job-${jobId}-search.html`
      },
      {
        filename: `job-${jobId}-lead-1.html`,
        timestamp: new Date(Date.now() - 5000).toISOString(),
        event: 'lead_found',
        path: `/captures/screenshots/job-${jobId}-lead-1.html`
      },
      {
        filename: `job-${jobId}-complete.html`,
        timestamp: new Date(Date.now() - 1000).toISOString(),
        event: 'complete',
        path: `/captures/screenshots/job-${jobId}-complete.html`
      }
    ],
    totalScreenshots: 4,
    captureMode: 'screenshot',
    status: 'active'
  };
  
  res.json({ success: true, data: mockMediaData });
});

app.get('/api/queues/agents/:agentId/leads', (req, res) => {
  const mockLeads = [
    {
      id: '1',
      authorHandle: 'john_doe',
      category: 'hot',
      score: 0.85,
      content: {
        text: 'Looking for automation solutions...',
        hashtags: ['#automation']
      },
      metrics: { replies: 5, likes: 12, reposts: 2 },
      postUrl: 'https://threads.net/post/123',
      createdAt: new Date().toISOString()
    }
  ];
  res.json({ success: true, data: mockLeads, count: mockLeads.length });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 Dashboard Demo Server Running!
=================================

🌐 Dashboard is now available at:
   http://localhost:${PORT}/dashboard

✅ The dashboard will open automatically in your browser

📌 Features Available:
   • Real-time queue statistics
   • Job submission and monitoring
   • Queue pause/resume controls
   • Auto-refresh every 3 seconds
   • No Redis or TypeScript compilation needed!

🎯 Try These Actions:
   1. Add a new job using the form
   2. Watch jobs progress automatically
   3. Pause/resume queues
   4. Clean completed jobs

Press Ctrl+C to stop the server
`);
});