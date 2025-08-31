# Threads API Integration

## Overview

This document describes the real Threads API integration implemented for the Solead platform using Stagehand for browser automation.

## Architecture

```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   API Endpoints     │────▶│ ThreadsAutomation│────▶│   Stagehand     │
│  /api/threads/*     │     │      Agent       │     │  (Browser AI)   │
└─────────────────────┘     └──────────────────┘     └─────────────────┘
         │                           │                         │
         ▼                           ▼                         ▼
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Session Manager    │     │   Lead Scoring   │     │  Threads.net    │
│  (Encrypted Store)  │     │   Algorithm      │     │   (Browser)     │
└─────────────────────┘     └──────────────────┘     └─────────────────┘
         │                           │
         ▼                           ▼
┌─────────────────────┐     ┌──────────────────┐
│     Database        │     │   Redis Queue    │
│   (PostgreSQL)      │     │  (Bull/BullMQ)   │
└─────────────────────┘     └──────────────────┘
```

## Components

### 1. ThreadsAutomationAgent (`src/agents/ThreadsAutomationAgent.ts`)

The core automation agent that uses Stagehand to interact with Threads:

- **Browser Control**: Uses Stagehand's AI-powered browser automation
- **Natural Language Actions**: Interacts with Threads using human-like commands
- **Session Management**: Handles login, cookie persistence, and session restoration
- **Content Extraction**: Uses AI to extract post data with structured schemas
- **Human Behavior**: Implements human-like browsing patterns to avoid detection

Key Methods:
```typescript
- initialize(): Initialize browser and Stagehand
- login(username, password): Authenticate with Threads
- searchPosts(keywords): Search and extract posts
- extractPost(url): Get detailed post information
- performHumanBehavior(): Simulate human browsing
- getCurrentSession(): Get cookies for persistence
```

### 2. API Endpoints (`src/api/routes/threads.routes.ts`)

RESTful endpoints for Threads operations:

- `POST /api/threads/sessions/initialize` - Create new Threads session
- `POST /api/threads/search` - Search for posts with keywords
- `POST /api/threads/agents/:id/discover` - Create automated discovery job
- `GET /api/threads/agents/:id/leads` - Retrieve discovered leads
- `GET /api/threads/sessions/:id/health` - Check session health

### 3. Lead Discovery Processor (`src/queue/processors/threadsLeadProcessor.ts`)

Queue processor for automated lead discovery:

- Processes jobs from Redis queue
- Uses ThreadsAutomationAgent for searches
- Implements lead scoring algorithm (per PRD)
- Captures screenshots of high-value leads
- Updates session health based on success

### 4. Session Management (`src/services/SessionManager.ts`)

Secure session handling with encryption:

- AES-256-GCM encryption for cookies
- Health monitoring and scoring
- Automatic session refresh
- Session pool management

## Lead Scoring Algorithm

Based on PRD Section 2.4, the scoring uses these weights:

```javascript
- Topic Match: 35% - Keywords found in post content
- Velocity: 20% - Engagement rate (likes, replies, reposts)
- Recency: 15% - Time since post (1 week decay)
- Answerability: 15% - Questions or help requests
- Author Quality: 10% - Verified status, follower count
- Toxicity: -15% - Negative signals (spam, hate)
```

Categories:
- **Hot**: Score > 0.7 (immediate action)
- **Medium**: Score 0.4-0.7 (qualified lead)
- **Cold**: Score < 0.4 (low priority)

## Human-like Automation

The agent implements several human-like behaviors:

1. **Random Delays**: 2-8 seconds between actions
2. **Typing Patterns**: Variable speed, 50-150ms between keystrokes
3. **Scroll Behavior**: Natural scrolling patterns
4. **Mouse Movement**: Realistic cursor movements
5. **Break Patterns**: Random breaks during sessions
6. **Click Accuracy**: 95% accuracy on targets

## Security Features

1. **Encrypted Storage**: All cookies encrypted with AES-256-GCM
2. **Session Isolation**: Each account has separate session
3. **Health Monitoring**: Automatic detection of compromised sessions
4. **Rate Limiting**: Human-like pacing to avoid detection
5. **Credential Security**: No plaintext storage of passwords

## Testing

Run tests with:
```bash
# Test Threads integration
npm run test:threads

# Test Stagehand capabilities
npm run test:stagehand

# Run API server
npm run dev:backend

# Test with dashboard
node start-demo-dashboard.js
```

## Environment Variables

Required configuration in `.env`:
```env
# Stagehand/BrowserBase
BROWSERBASE_PROJECT_ID=your-project-id
BROWSERBASE_API_KEY=your-api-key
OPENAI_API_KEY=your-openai-key

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/solead_db

# Redis
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-32-byte-encryption-key
```

## Usage Example

```typescript
// Initialize session
const response = await fetch('/api/threads/sessions/initialize', {
  method: 'POST',
  body: JSON.stringify({
    accountId: 'account-1',
    username: 'user@example.com',
    password: 'password'
  })
});

// Search for leads
const searchResponse = await fetch('/api/threads/search', {
  method: 'POST',
  body: JSON.stringify({
    sessionId: 'session-id',
    keywords: ['automation', 'AI', 'productivity'],
    limit: 20
  })
});

// Create discovery job
const jobResponse = await fetch('/api/threads/agents/agent-1/discover', {
  method: 'POST',
  body: JSON.stringify({
    keywords: ['automation', 'workflow'],
    priority: 'high',
    config: {
      maxResults: 50,
      humanization: { enabled: true }
    }
  })
});
```

## Performance Metrics

Target performance (from PRD):
- Concurrent agents: 100+
- Leads processed/hour: 10,000+
- Session health check: Every 30 minutes
- Session refresh: When TTL < 6 hours
- Lead categorization: Real-time

## Next Steps

1. **Production Deployment**
   - Set up BrowserBase cloud infrastructure
   - Configure production Redis cluster
   - Implement horizontal scaling

2. **Enhanced Features**
   - Multi-language support
   - Advanced lead nurturing workflows
   - Custom scoring algorithms
   - Engagement automation

3. **Monitoring**
   - Prometheus metrics integration
   - Grafana dashboards
   - Alert system for session health

## Troubleshooting

Common issues and solutions:

1. **Login Fails**: Check Threads credentials and 2FA settings
2. **Session Expires**: Reduce health check interval
3. **Rate Limiting**: Increase delays between actions
4. **Extraction Errors**: Update Stagehand schemas for UI changes
5. **Queue Backlog**: Scale worker processes horizontally