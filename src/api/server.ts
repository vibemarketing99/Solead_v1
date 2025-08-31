/**
 * API Server
 * Main Express server with queue management endpoints
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { AppDataSource } from '../database/config';
import { QueueManager } from '../queue/QueueManager';
import queueRoutes from './routes/queue.routes';
import threadsRoutes from './routes/threads.routes';
import { Logger } from '../utils/Logger';
import path from 'path';

const logger = new Logger('APIServer');

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for dashboard
app.use('/dashboard', express.static(path.join(__dirname, '../../public')));

// API Routes
app.use('/api/queues', queueRoutes);
app.use('/api/threads', threadsRoutes);

// Health check endpoint
app.get('/api/health', async (_req, res) => {
  try {
    const queueManager = QueueManager.getInstance();
    const dbConnected = AppDataSource.isInitialized;
    const queueReady = queueManager.isReady();
    
    const health: any = {
      status: dbConnected && queueReady ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbConnected ? 'connected' : 'disconnected',
        queue: queueReady ? 'ready' : 'not ready'
      }
    };
    
    if (queueReady) {
      const stats = await queueManager.getQueueStats();
      health.services['queueStats'] = Object.fromEntries(stats);
    }
    
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  } catch (error) {
    logger.error('Health check failed', error as Error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed'
    });
  }
});

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: 'Not found'
  });
});

/**
 * Start the server
 */
async function startServer() {
  try {
    // Initialize database
    logger.info('Initializing database...');
    await AppDataSource.initialize();
    logger.info('Database connected');
    
    // Initialize queue manager
    logger.info('Initializing queue manager...');
    const queueManager = QueueManager.getInstance();
    await queueManager.initialize();
    logger.info('Queue manager ready');
    
    // Start server
    app.listen(PORT, () => {
      logger.info(`API Server running on http://localhost:${PORT}`);
      logger.info(`Dashboard available at http://localhost:${PORT}/dashboard`);
      logger.info(`API endpoints available at http://localhost:${PORT}/api`);
      console.log('\n📌 Available Endpoints:');
      console.log('   GET  /api/health - Health check');
      console.log('   GET  /api/queues/stats - Queue statistics');
      console.log('   GET  /api/queues/:name/jobs - List jobs');
      console.log('   GET  /api/queues/:name/jobs/:id - Get job details');
      console.log('   POST /api/queues/lead-discovery/jobs - Add discovery job');
      console.log('   POST /api/queues/:name/pause - Pause queue');
      console.log('   POST /api/queues/:name/resume - Resume queue');
      console.log('   POST /api/queues/:name/clean - Clean old jobs');
      console.log('   GET  /api/queues/agents/:id/leads - Get agent leads');
    });
    
    // Graceful shutdown
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  logger.info('Shutting down server...');
  
  try {
    const queueManager = QueueManager.getInstance();
    if (queueManager.isReady()) {
      await queueManager.shutdown();
      logger.info('Queue manager shut down');
    }
    
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      logger.info('Database connection closed');
    }
    
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', error as Error);
    process.exit(1);
  }
}

// Start server if this is the main module
if (require.main === module) {
  startServer();
}

export { app, startServer };