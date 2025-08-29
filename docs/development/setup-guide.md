# Solead Development Setup Guide

## Prerequisites

- Node.js 20+ and npm
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (recommended)
- BrowserBase account (for cloud execution)
- OpenAI/Anthropic API keys

## Environment Setup

### 1. Clone and Install

```bash
# Install dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Environment Variables

Create `.env` files in the root and backend directories:

#### Root `.env`
```env
# Stagehand/BrowserBase
BROWSERBASE_PROJECT_ID=your-project-id
BROWSERBASE_API_KEY=your-api-key
OPENAI_API_KEY=your-openai-key

# Environment
NODE_ENV=development
```

#### Backend `.env`
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/solead
REDIS_URL=redis://localhost:6379

# Encryption
ENCRYPTION_KEY=your-32-char-key
KMS_KEY_ID=your-kms-key-id

# AWS/Storage
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET=solead-screenshots

# API
JWT_SECRET=your-jwt-secret
API_PORT=3000
```

#### Frontend `.env`
```env
REACT_APP_API_URL=http://localhost:3000
REACT_APP_WS_URL=ws://localhost:3000
```

## Database Setup

### 1. PostgreSQL Setup

```bash
# Create database
createdb solead

# Run migrations
cd backend
npm run db:migrate

# Seed test data (optional)
npm run db:seed
```

### 2. Redis Setup

```bash
# Start Redis
redis-server

# Or with Docker
docker run -d -p 6379:6379 redis:7-alpine
```

## Running the Application

### Development Mode

#### Option 1: Run All Services
```bash
# From root directory
npm run dev:all
```

#### Option 2: Run Services Individually

Terminal 1 - Backend API:
```bash
cd backend
npm run dev
```

Terminal 2 - Agent Workers:
```bash
cd backend
npm run workers:dev
```

Terminal 3 - Frontend:
```bash
cd frontend
npm start
```

### Docker Compose (Recommended)

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Testing

### Running Tests

```bash
# Backend tests
cd backend
npm test              # Run all tests
npm run test:unit    # Unit tests only
npm run test:integration  # Integration tests
npm run test:e2e     # End-to-end tests

# Frontend tests
cd frontend
npm test             # Run tests in watch mode
npm run test:coverage  # With coverage report
```

### Testing Stagehand Integration

```bash
# Test Stagehand examples
cd plugins/stagehand/examples
npx tsx simple-demo.ts

# Test with local browser (no BrowserBase)
STAGEHAND_ENV=LOCAL npx tsx test-simple.ts
```

## Common Development Tasks

### 1. Creating a New Agent

```typescript
// backend/src/agents/custom-agent.ts
import { ThreadsAutomationAgent } from './base-agent';

export class CustomAgent extends ThreadsAutomationAgent {
  async execute() {
    // Your agent logic
  }
}
```

### 2. Adding API Endpoints

```typescript
// backend/src/api/routes/your-route.ts
import { Router } from 'express';

const router = Router();

router.get('/your-endpoint', async (req, res) => {
  // Your logic
});

export default router;
```

### 3. Database Migrations

```bash
# Create new migration
npm run db:migration:create -- --name add_new_table

# Run migrations
npm run db:migrate

# Rollback
npm run db:rollback
```

## Debugging

### 1. Stagehand Browser Debugging

```typescript
// Set headless: false to see browser
const stagehand = new Stagehand({
  env: 'LOCAL',
  headless: false,  // Shows browser window
  debugDom: true,   // Enables DOM debugging
});
```

### 2. API Debugging

```bash
# Enable debug logging
DEBUG=solead:* npm run dev
```

### 3. Database Queries

```bash
# Enable query logging
DATABASE_LOG=true npm run dev
```

## Troubleshooting

### Common Issues

#### 1. Session Cookie Errors
- Check encryption keys are set
- Verify KMS permissions
- Ensure cookies are fresh

#### 2. Stagehand Extraction Failures
- Verify OpenAI API key has credits
- Check for DOM changes on Threads
- Review extraction schemas

#### 3. Rate Limiting
- Increase delays in agent config
- Use exponential backoff
- Monitor rate limit headers

#### 4. Database Connection Issues
- Check connection pool settings
- Verify PostgreSQL is running
- Review connection string

## Performance Optimization

### Local Development
1. Use Redis for caching
2. Enable query result caching
3. Use local Stagehand (avoid API calls)

### Testing Performance
```bash
# Run load tests
npm run test:load

# Profile backend
npm run profile
```

## Resources

- [Stagehand Documentation](https://github.com/browserbase/stagehand)
- [Playwright Documentation](https://playwright.dev)
- [Bull Queue Documentation](https://github.com/OptimalBits/bull)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review logs in `logs/` directory
3. Check GitHub issues
4. Contact the development team