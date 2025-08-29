# Solead API Documentation

## Base URL
```
Development: http://localhost:3000/api/v1
Production: https://api.solead.com/v1
```

## Authentication
All endpoints require JWT authentication unless specified otherwise.

```http
Authorization: Bearer <jwt_token>
```

## Endpoints

### Authentication

#### POST /auth/login
Login with Threads credentials.

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "token": "jwt_token",
  "user": {
    "id": "uuid",
    "username": "string",
    "accounts": []
  }
}
```

#### POST /auth/refresh
Refresh JWT token.

### Accounts

#### GET /accounts
List all connected Threads accounts.

**Response:**
```json
{
  "accounts": [
    {
      "id": "uuid",
      "handle": "@username",
      "displayName": "User Name",
      "status": "active",
      "sessionHealth": 0.95
    }
  ]
}
```

#### POST /accounts
Add a new Threads account.

**Request:**
```json
{
  "cookies": "encrypted_cookie_string",
  "userAgent": "browser_user_agent"
}
```

#### DELETE /accounts/:id
Remove a Threads account.

### Sessions

#### GET /sessions/:accountId
Get session details for an account.

**Response:**
```json
{
  "id": "uuid",
  "accountId": "uuid",
  "healthScore": 0.95,
  "lastActivityAt": "2024-01-01T00:00:00Z",
  "expiresAt": "2024-01-02T00:00:00Z",
  "status": "active"
}
```

#### POST /sessions/:accountId/refresh
Manually refresh a session.

### Agents

#### GET /agents
List all agents.

**Query Parameters:**
- `accountId` - Filter by account
- `isActive` - Filter by status
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Response:**
```json
{
  "agents": [
    {
      "id": "uuid",
      "accountId": "uuid",
      "name": "Tech News Hunter",
      "keywords": ["AI", "startup", "funding"],
      "schedule": "*/30 * * * *",
      "dailyCap": 30,
      "isActive": true,
      "lastRunAt": "2024-01-01T00:00:00Z",
      "stats": {
        "totalLeads": 150,
        "todayLeads": 12
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

#### POST /agents
Create a new agent.

**Request:**
```json
{
  "accountId": "uuid",
  "name": "Agent Name",
  "keywords": ["keyword1", "keyword2"],
  "advancedRules": {
    "minFollowers": 1000,
    "excludeKeywords": ["spam"],
    "languages": ["en"]
  },
  "schedule": "*/30 * * * *",
  "dailyCap": 30
}
```

#### PUT /agents/:id
Update an agent.

#### DELETE /agents/:id
Delete an agent.

#### POST /agents/:id/run
Manually trigger an agent run.

### Leads

#### GET /leads
Get leads with filtering and pagination.

**Query Parameters:**
- `agentId` - Filter by agent
- `category` - Filter by category (hot|medium)
- `status` - Filter by task status
- `search` - Search in content
- `startDate` - Filter by date range
- `endDate` - Filter by date range
- `page` - Page number
- `limit` - Items per page
- `sort` - Sort field (score|capturedAt)
- `order` - Sort order (asc|desc)

**Response:**
```json
{
  "leads": [
    {
      "id": "uuid",
      "agentId": "uuid",
      "postUrl": "https://threads.net/...",
      "authorHandle": "@user",
      "content": {
        "text": "Looking for recommendations...",
        "hashtags": ["tech"],
        "mentions": ["@otheruser"]
      },
      "metrics": {
        "replies": 45,
        "likes": 120,
        "reposts": 10
      },
      "score": 0.85,
      "category": "hot",
      "reasons": ["High engagement", "Question detected"],
      "screenshotUrl": "https://cdn.solead.com/...",
      "capturedAt": "2024-01-01T00:00:00Z",
      "task": {
        "status": "pending",
        "assigneeId": null
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 234
  }
}
```

#### GET /leads/:id
Get a specific lead with full details.

#### POST /leads/:id/approve
Approve a lead (create task).

**Request:**
```json
{
  "assigneeId": "uuid",
  "notes": "Optional notes"
}
```

#### POST /leads/:id/snooze
Snooze a lead.

**Request:**
```json
{
  "until": "2024-01-02T00:00:00Z"
}
```

#### POST /leads/:id/skip
Skip/archive a lead.

### Tasks

#### GET /tasks
Get tasks for approved leads.

**Query Parameters:**
- `status` - Filter by status (pending|done)
- `assigneeId` - Filter by assignee

#### PUT /tasks/:id
Update task status.

**Request:**
```json
{
  "status": "done",
  "completedAt": "2024-01-01T00:00:00Z"
}
```

### Analytics

#### GET /analytics/overview
Get dashboard overview stats.

**Response:**
```json
{
  "period": "7d",
  "metrics": {
    "totalLeads": 1234,
    "hotLeads": 123,
    "approvalRate": 0.15,
    "responseRate": 0.45,
    "activeAgents": 12,
    "healthySession": 8
  },
  "trends": {
    "leads": [/* daily counts */],
    "engagement": [/* daily rates */]
  }
}
```

#### GET /analytics/agents/:id
Get detailed agent performance metrics.

### WebSocket Events

Connect to WebSocket for real-time updates:
```javascript
const ws = new WebSocket('ws://localhost:3000/ws');
```

#### Events

**lead.new**
```json
{
  "type": "lead.new",
  "data": {/* lead object */}
}
```

**agent.status**
```json
{
  "type": "agent.status",
  "data": {
    "agentId": "uuid",
    "status": "running|idle|error"
  }
}
```

**session.health**
```json
{
  "type": "session.health",
  "data": {
    "sessionId": "uuid",
    "healthScore": 0.85
  }
}
```

## Error Responses

All errors follow this format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

### Common Error Codes
- `AUTH_REQUIRED` - Authentication required
- `AUTH_INVALID` - Invalid token
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Request validation failed
- `RATE_LIMITED` - Too many requests
- `SESSION_EXPIRED` - Threads session expired
- `EXTRACTION_FAILED` - Failed to extract data

## Rate Limiting

- Default: 100 requests per minute
- Agent runs: 10 per hour per account
- Lead operations: 1000 per hour

Headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```