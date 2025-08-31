/**
 * Mock API Server for Dashboard Demo
 * Works without Redis - simulates queue behavior
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for dashboard
app.use('/dashboard', express.static(path.join(__dirname, '../../public')));

// Mock data storage
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

let mockJobs: any[] = [
  {
    id: '1',
    data: {
      agentId: 'mock-agent-1',
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
      agentId: 'mock-agent-1',
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
      agentId: 'mock-agent-2',
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
  // Update active job progress
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
  
  // Start waiting jobs
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

// API Routes
app.get('/api/health', async (_req, res) => {
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

app.get('/api/queues/stats', async (_req, res) => {
  res.json({
    success: true,
    data: mockQueues,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/queues/:queueName/jobs', async (req, res) => {
  const { queueName } = req.params;
  const { limit = '20' } = req.query;
  
  const filteredJobs = mockJobs
    .filter(job => {
      // For demo, all jobs belong to lead-discovery
      return queueName === 'lead-discovery';
    })
    .slice(0, parseInt(limit as string));
  
  res.json({
    success: true,
    data: filteredJobs,
    count: filteredJobs.length
  });
});

app.get('/api/queues/:queueName/jobs/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const job = mockJobs.find(j => j.id === jobId);
  
  if (!job) {
    return res.status(404).json({
      error: 'Job not found'
    });
  }
  
  res.json({
    success: true,
    data: job
  });
});

app.post('/api/queues/lead-discovery/jobs', async (req, res) => {
  const { agentId, keywords, priority = 'normal' } = req.body;
  
  if (!agentId || !keywords || !Array.isArray(keywords)) {
    return res.status(400).json({
      error: 'Missing required fields: agentId and keywords (array)'
    });
  }
  
  const newJob = {
    id: (mockJobs.length + 1).toString(),
    data: {
      agentId,
      keywords,
      priority
    },
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

app.post('/api/queues/:queueName/pause', async (req, res) => {
  const { queueName } = req.params;
  
  if (mockQueues[queueName]) {
    mockQueues[queueName].metrics.paused = true;
  }
  
  res.json({
    success: true,
    message: `Queue ${queueName} paused`
  });
});

app.post('/api/queues/:queueName/resume', async (req, res) => {
  const { queueName } = req.params;
  
  if (mockQueues[queueName]) {
    mockQueues[queueName].metrics.paused = false;
  }
  
  res.json({
    success: true,
    message: `Queue ${queueName} resumed`
  });
});

app.post('/api/queues/:queueName/clean', async (req, res) => {
  const { queueName } = req.params;
  
  // Remove completed jobs
  const beforeCount = mockJobs.length;
  mockJobs = mockJobs.filter(j => j.state !== 'completed');
  const removed = beforeCount - mockJobs.length;
  
  if (mockQueues[queueName]) {
    mockQueues[queueName].metrics.completed = 0;
  }
  
  res.json({
    success: true,
    message: `Cleaned ${removed} jobs from ${queueName}`
  });
});

app.get('/api/queues/agents/:agentId/leads', async (req, res) => {
  const { agentId } = req.params;
  
  // Mock lead data
  const mockLeads = [
    {
      id: '1',
      authorHandle: 'john_doe',
      category: 'hot',
      score: 0.85,
      content: {
        text: 'Looking for automation solutions for my business workflow...',
        hashtags: ['#automation', '#workflow']
      },
      metrics: {
        replies: 5,
        likes: 12,
        reposts: 2
      },
      postUrl: 'https://threads.net/post/123',
      createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: '2',
      authorHandle: 'jane_smith',
      category: 'medium',
      score: 0.65,
      content: {
        text: 'Has anyone tried using AI for lead generation? Curious about best practices...',
        hashtags: ['#AI', '#leadgen']
      },
      metrics: {
        replies: 3,
        likes: 8,
        reposts: 1
      },
      postUrl: 'https://threads.net/post/124',
      createdAt: new Date(Date.now() - 7200000).toISOString()
    }
  ];
  
  res.json({
    success: true,
    data: mockLeads,
    count: mockLeads.length
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: 'Not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
📺 Mock Dashboard Server Running!
==================================

🌐 Dashboard URL:
   http://localhost:${PORT}/dashboard

📌 Features Available:
   ✅ Real-time queue stats (simulated)
   ✅ Job submission and monitoring
   ✅ Queue pause/resume controls
   ✅ Auto-updating every 3 seconds
   ✅ No Redis required!

🎯 Test Instructions:
   1. Open the dashboard URL above
   2. Try adding a new job with the form
   3. Watch jobs progress automatically
   4. Use pause/resume buttons
   5. Clean completed jobs

Press Ctrl+C to stop the server
`);
});

export { app };