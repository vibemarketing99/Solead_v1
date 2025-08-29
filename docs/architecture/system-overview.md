# Solead System Architecture

## Overview
Solead is a multi-tenant SaaS application for automated lead generation from Threads, leveraging AI-powered browser automation through Stagehand.

## Core Components

### 1. Frontend (React)
- **Location**: `/frontend`
- **Purpose**: User interface for lead management, agent configuration, and analytics
- **Key Features**:
  - Lead inbox with hot/medium categorization
  - Agent management dashboard
  - Session health monitoring
  - Real-time updates via WebSocket

### 2. Backend API (Node.js/TypeScript)
- **Location**: `/backend`
- **Purpose**: Core business logic and API endpoints
- **Key Services**:
  - Session management with encryption
  - Lead scoring engine
  - Agent scheduling
  - Authentication & authorization

### 3. Agent Workers (Stagehand + Playwright)
- **Location**: `/backend/src/agents`
- **Purpose**: Autonomous browser automation for Threads
- **Key Features**:
  - Natural language browser control via Stagehand
  - Human-like browsing patterns
  - Anti-detection measures
  - Parallel execution support

### 4. Queue System (Bull/Redis)
- **Purpose**: Job scheduling and processing
- **Components**:
  - Agent run scheduling
  - Lead processing pipeline
  - Screenshot generation queue
  - Session refresh jobs

### 5. Data Layer
- **PostgreSQL**: Primary database with encrypted session storage
- **Redis**: Caching and queue management
- **S3**: Screenshot storage

## Data Flow

```
User → Frontend → API Gateway → Core Service
                                     ↓
Session Manager ← → Agent Scheduler → Agent Workers
                          ↓               ↓
                   Lead Processor → Database
                          ↓
                   Screenshot Store
```

## Security Architecture

### Session Encryption
- AES-256-GCM for cookie storage
- AWS KMS/GCP KMS for key management
- Automatic session refresh before expiry

### Authentication Flow
1. User login → JWT generation
2. Session cookies encrypted and stored
3. Agent workers use decrypted cookies
4. Automatic refresh when TTL < 6 hours

## Scalability Design

### Horizontal Scaling
- API servers: 3+ replicas with load balancing
- Agent workers: 10-50 instances with auto-scaling
- Database: Primary + read replicas

### Performance Targets
- 100+ concurrent agents
- 10,000+ leads/hour processing
- <500ms inbox load time
- 99.9% uptime SLA

## Technology Stack

### Core Technologies
- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express/Fastify for API
- **Browser Automation**: Stagehand + Playwright
- **Database**: PostgreSQL 15+ with partitioning
- **Cache**: Redis 7+
- **Queue**: Bull with Redis backend

### AI Integration
- **Stagehand**: Natural language browser control
- **OpenAI/Anthropic**: For action interpretation
- **Fallback**: Direct Playwright when AI fails

## Monitoring & Observability

### Key Metrics
- Agent success rate
- Lead discovery rate
- Session health scores
- Queue depth
- API response times

### Logging
- Structured logging with correlation IDs
- Audit logs for compliance
- Error tracking with Sentry

## Development Workflow

### Local Development
1. Docker Compose for services
2. Local Stagehand with headless: false
3. Mock Threads responses for testing

### CI/CD Pipeline
1. GitHub Actions for testing
2. Docker image building
3. Kubernetes deployment
4. Blue-green deployments

## Security Considerations

### Data Protection
- All sensitive data encrypted at rest
- TLS 1.3 for data in transit
- Regular security audits

### Rate Limiting
- API rate limiting per user
- Agent action delays (2-8s)
- Backoff strategies for failures