# PRD — Solead (Technical Implementation Ready)
**Version 1.1 - Internal Technical Specification**

## 0. Technical Overview & Architecture

**System Type:** Multi-tenant SaaS application with autonomous agent workers  
**Core Stack:** Node.js/TypeScript backend, React frontend, PostgreSQL, Redis, S3  
**Agent Runtime:** Puppeteer/Playwright with Stagehand wrapper  
**Deployment:** AWS/GCP with Kubernetes orchestration  

### High-Level Architecture
```
Frontend (React) → API Gateway → Core Service
                                      ↓
Session Manager ← → Agent Scheduler → Agent Workers (Queue)
                           ↓              ↓
                    Lead Processor → Database (PostgreSQL)
                           ↓
                    Screenshot Store (S3)
```

## 1. Problem, Goals, Non-Goals

### Problem
Marketers waste hours manually searching Threads for relevant conversations. Current tools lack Threads support, and timing-critical opportunities expire before discovery.

### Goals
- Multi-account session management with encrypted cookie storage
- Autonomous agents with human-like browsing patterns (anti-detection)
- Real-time lead scoring with transparent, tunable algorithms
- Scalable processing supporting 100+ concurrent agents
- Sub-2s page loads with 1000+ leads in database

### Non-Goals (MVP v1)
- No auto-posting capabilities
- No cross-platform support (Threads only)
- No ML model training (use heuristics)
- No real-time streaming (batch processing only)

## 2. Technical Requirements

### 2.1 Session Management System

#### Cookie Storage Architecture
```typescript
interface ThreadsSession {
  id: string;
  accountId: string;
  encryptedCookies: string; // AES-256-GCM encrypted
  userAgent: string;
  viewport: ViewportConfig;
  lastActivityAt: Date;
  expiresAt: Date;
  healthScore: number; // 0-1
  failureCount: number;
}
```

#### Implementation Requirements
- **Encryption:** AES-256-GCM with rotating keys (AWS KMS/GCP KMS)
- **Cookie refresh:** Proactive refresh when TTL < 6 hours
- **Health monitoring:** Check session validity every 30 minutes
- **Failure recovery:** Exponential backoff with max 3 retries
- **Storage:** PostgreSQL with encrypted-at-rest columns

#### Session Lifecycle
```
INIT → VALIDATING → ACTIVE → EXPIRING → EXPIRED
                        ↓         ↓
                    REFRESHING ← →
```

### 2.2 Agent Worker System

#### Worker Configuration
```typescript
interface AgentConfig {
  id: string;
  accountId: string;
  sessionId: string;
  keywords: string[];
  rules: AdvancedRules;
  schedule: CronExpression;
  concurrency: {
    maxParallelPages: number; // Default: 2
    scrollDelayMs: [number, number]; // [min, max]
    actionDelayMs: [number, number];
    humanization: HumanizationProfile;
  };
}

interface HumanizationProfile {
  scrollPattern: 'linear' | 'exponential' | 'random';
  mouseMovement: boolean;
  readingDelays: boolean;
  randomBreaks: [number, number]; // [minMs, maxMs]
}
```

#### Browser Automation Stack
- **Primary:** Playwright with stealth plugins
- **Fallback:** Puppeteer with puppeteer-extra-stealth
- **Anti-detection:** Random viewport sizes, mouse movements, scroll patterns
- **Resource optimization:** Disable images/videos for text extraction

#### Queue Architecture
```typescript
// Bull Queue configuration
const agentQueue = new Queue('agent-runs', {
  redis: REDIS_CONFIG,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 1000,
  }
});

// Job processing with rate limiting
agentQueue.process('threads-scan', 10, async (job) => {
  // Process with concurrency limit of 10
});
```

### 2.3 Data Extraction Pipeline

#### Extraction Schema
```typescript
interface ExtractedPost {
  url: string;
  postId: string; // Extract from URL
  authorHandle: string;
  authorFollowers?: number;
  content: {
    text: string;
    hashtags: string[];
    mentions: string[];
    links: string[];
  };
  metrics: {
    replies: number;
    likes: number;
    reposts: number;
    timestampRaw: string; // "2h", "5m", etc.
    timestampParsed: Date;
  };
  screenshot: {
    thumbnail: string; // S3 key, 400x300
    full: string; // S3 key, 1080xfull
  };
  extractedAt: Date;
  extractionVersion: string;
}
```

#### Stagehand as Core Automation Layer

**Why Stagehand:**
- Natural language actions ("click on the reply button" vs complex selectors)
- Built-in AI-powered element detection
- Resilient to DOM changes
- Human-like interaction patterns built-in

**Stagehand Architecture Integration:**
```typescript
import { Stagehand } from '@browserbasehq/stagehand';

class ThreadsAutomationAgent {
  private stagehand: Stagehand;
  
  async initialize(sessionCookies: string[]) {
    this.stagehand = new Stagehand({
      env: 'LOCAL', // or 'BROWSERBASE' for cloud
      headless: process.env.NODE_ENV === 'production',
      enableCaching: true,
      logger: (message) => this.auditLog(message),
      // Custom config for Threads-specific behavior
      modelName: 'gpt-4o-mini', // Or 'claude-3-sonnet'
      modelClientOptions: {
        apiKey: process.env.OPENAI_API_KEY
      }
    });
    
    await this.stagehand.init();
    await this.stagehand.context.addCookies(sessionCookies);
  }
  
  async searchAndExtract(keywords: string[]) {
    // Navigate using natural language
    await this.stagehand.act({
      action: `search for "${keywords.join(' ')}" on Threads`
    });
    
    // Wait for results to load
    await this.stagehand.act({
      action: "wait for search results to appear"
    });
    
    // Extract structured data
    const posts = await this.stagehand.extract({
      instruction: "Extract all visible posts from the search results",
      schema: z.object({
        posts: z.array(z.object({
          author: z.string(),
          content: z.string(),
          timestamp: z.string(),
          engagement: z.object({
            likes: z.number(),
            replies: z.number(),
            reposts: z.number()
          }),
          hasQuestion: z.boolean()
        }))
      })
    });
    
    return posts;
  }
  
  async navigateToPost(postUrl: string) {
    await this.stagehand.act({
      action: `navigate to ${postUrl} and wait for post to load`
    });
    
    // Take screenshot using Stagehand's page context
    const screenshot = await this.stagehand.page.screenshot({
      fullPage: true,
      type: 'webp',
      quality: 70
    });
    
    return screenshot;
  }
}
```

#### Stagehand-Specific Workflows

**1. Session Validation:**
```typescript
async validateSession(): Promise<boolean> {
  try {
    await this.stagehand.act({
      action: "go to Threads home page"
    });
    
    const isLoggedIn = await this.stagehand.extract({
      instruction: "Check if user is logged in",
      schema: z.object({
        isLoggedIn: z.boolean(),
        username: z.string().optional()
      })
    });
    
    return isLoggedIn.isLoggedIn;
  } catch (error) {
    return false;
  }
}
```

**2. Human-like Browsing Pattern:**
```typescript
async browseWithHumanPattern() {
  // Stagehand handles human-like delays internally
  // But we can add custom patterns
  
  await this.stagehand.act({
    action: "slowly scroll down the page reading posts"
  });
  
  // Random dwelling time on interesting content
  const interestingPost = await this.stagehand.extract({
    instruction: "Find the most engaging post visible",
    schema: z.object({
      selector: z.string()
    })
  });
  
  if (interestingPost) {
    await this.stagehand.act({
      action: `hover over the post and read it for a few seconds`
    });
  }
}
```

**3. Fallback to Playwright when Stagehand fails:**
```typescript
async extractWithFallback(instruction: string, schema: any) {
  try {
    // Primary: Use Stagehand's AI-powered extraction
    return await this.stagehand.extract({
      instruction,
      schema,
      timeout: 10000
    });
  } catch (stagehandError) {
    // Fallback: Direct Playwright selectors
    console.warn('Stagehand extraction failed, using Playwright', stagehandError);
    
    const page = this.stagehand.page;
    return await this.extractWithPlaywright(page, schema);
  }
}
```

#### Stagehand Observability

**Stagehand-specific Monitoring:**
```typescript
interface StagehandMetrics {
  // Action success rates
  actionSuccessRate: number;
  actionAverageLatency: number;
  
  // Extraction metrics
  extractionSuccessRate: number;
  extractionSchemaValidationRate: number;
  
  // AI token usage (for cost monitoring)
  tokensUsedPerAction: number;
  totalTokensPerDay: number;
  
  // Fallback frequency
  playwrightFallbackRate: number;
}

class StagehandMonitor {
  async logAction(action: string, success: boolean, latency: number) {
    await this.metrics.record({
      type: 'stagehand_action',
      action,
      success,
      latency,
      timestamp: new Date()
    });
  }
}
```

#### Stagehand Configuration for Background Work

**Queue Worker with Stagehand:**
```typescript
class StagehandWorker {
  private pool: Stagehand[] = [];
  private maxConcurrent = 5;
  
  async processJob(job: AgentJob) {
    const stagehand = await this.getAvailableInstance();
    
    try {
      // Set up context for this specific job
      await stagehand.context.addCookies(job.sessionCookies);
      
      // Execute the agent's search
      await stagehand.act({
        action: `search Threads for ${job.keywords.join(', ')}`
      });
      
      // Extract in batches to avoid memory issues
      const batchSize = 10;
      const results = [];
      
      for (let i = 0; i < job.maxResults; i += batchSize) {
        const batch = await stagehand.extract({
          instruction: `Extract the next ${batchSize} posts`,
          schema: PostSchema
        });
        results.push(...batch.posts);
        
        // Scroll to load more
        await stagehand.act({
          action: "scroll down to load more posts"
        });
      }
      
      return results;
    } finally {
      this.releaseInstance(stagehand);
    }
  }
}
```

#### Cost Optimization for Stagehand

Since Stagehand uses LLM calls for actions and extractions:
```typescript
class StagehandCostOptimizer {
  // Cache common actions to reduce API calls
  private actionCache = new Map<string, any>();
  
  // Batch extractions when possible
  async batchExtract(instructions: string[]) {
    return await this.stagehand.extract({
      instruction: instructions.join('; '),
      schema: z.array(PostSchema)
    });
  }
  
  // Use cheaper models for simple tasks
  async configureForTask(complexity: 'simple' | 'complex') {
    if (complexity === 'simple') {
      this.stagehand.modelName = 'gpt-3.5-turbo';
    } else {
      this.stagehand.modelName = 'gpt-4o-mini';
    }
  }
}
```

#### Stagehand-Specific Error Handling

```typescript
enum StagehandErrorType {
  MODEL_TIMEOUT = 'MODEL_TIMEOUT',
  EXTRACTION_FAILED = 'EXTRACTION_FAILED',
  ACTION_NOT_POSSIBLE = 'ACTION_NOT_POSSIBLE',
  CONTEXT_LOST = 'CONTEXT_LOST'
}

class StagehandErrorHandler {
  async handle(error: any, context: AgentContext) {
    if (error.message?.includes('timeout')) {
      // Reduce complexity of next action
      await this.simplifyNextAction(context);
    } else if (error.message?.includes('extract')) {
      // Fall back to Playwright
      return await this.usePlaywrightFallback(context);
    } else if (error.message?.includes('context')) {
      // Reinitialize Stagehand
      await this.reinitializeStagehand(context);
    }
  }
}
```

This comprehensive Stagehand integration ensures the PRD properly leverages Stagehand's AI-powered browser automation capabilities for more resilient and maintainable Threads automation.

### 2.4 Lead Scoring Engine

#### Scoring Pipeline
```typescript
interface ScoringSignals {
  topicMatch: number;      // 0-1, TF-IDF based
  velocity: number;        // replies per hour
  recency: number;         // exponential decay
  answerability: number;   // question detection
  authorQuality: number;   // follower/engagement ratio
  toxicity: number;        // negative signal
}

class LeadScorer {
  private weights = {
    topicMatch: 0.35,
    velocity: 0.20,
    recency: 0.15,
    answerability: 0.15,
    authorQuality: 0.10,
    toxicity: -0.15
  };
  
  score(signals: ScoringSignals): LeadScore {
    const raw = this.calculateWeightedScore(signals);
    const normalized = this.normalize(raw);
    
    return {
      score: normalized,
      category: this.categorize(normalized, signals),
      reasons: this.generateReasons(signals),
      confidence: this.calculateConfidence(signals)
    };
  }
}
```

#### Topic Matching Algorithm
```typescript
class TopicMatcher {
  private vectorizer: TfIdfVectorizer;
  
  match(text: string, keywords: string[]): number {
    // 1. Exact keyword matching (40% weight)
    const exactScore = this.exactMatch(text, keywords);
    
    // 2. Stemmed matching (30% weight)
    const stemScore = this.stemmedMatch(text, keywords);
    
    // 3. Semantic similarity (30% weight)
    const semanticScore = this.cosineSimilarity(
      this.vectorizer.transform(text),
      this.vectorizer.transform(keywords.join(' '))
    );
    
    return exactScore * 0.4 + stemScore * 0.3 + semanticScore * 0.3;
  }
}
```

### 2.5 Database Schema

#### Core Tables
```sql
-- Accounts table
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  status VARCHAR(50) NOT NULL, -- 'active', 'expired', 'suspended'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table with encryption
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  encrypted_cookies TEXT NOT NULL, -- AES-256-GCM
  encryption_key_id VARCHAR(255) NOT NULL, -- KMS key reference
  user_agent TEXT NOT NULL,
  viewport JSONB NOT NULL,
  health_score DECIMAL(3,2) DEFAULT 1.0,
  failure_count INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_sessions_expires (expires_at),
  INDEX idx_sessions_health (account_id, health_score)
);

-- Agents table
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  keywords TEXT[] NOT NULL,
  advanced_rules JSONB,
  schedule VARCHAR(100), -- cron expression
  daily_cap INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_agents_schedule (is_active, next_run_at)
);

-- Leads table with partitioning
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  post_url TEXT UNIQUE NOT NULL,
  post_id VARCHAR(255) NOT NULL,
  author_handle VARCHAR(255) NOT NULL,
  content JSONB NOT NULL,
  metrics JSONB NOT NULL,
  score DECIMAL(3,2) NOT NULL,
  category VARCHAR(20) NOT NULL, -- 'hot', 'medium'
  reasons TEXT[] NOT NULL,
  screenshot_thumbnail TEXT,
  screenshot_full TEXT,
  captured_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_leads_score (agent_id, category, score DESC),
  INDEX idx_leads_captured (captured_at DESC)
) PARTITION BY RANGE (captured_at);

-- Create monthly partitions
CREATE TABLE leads_2024_01 PARTITION OF leads
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
-- etc...

-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL, -- 'pending', 'approved', 'snoozed', 'skipped', 'done'
  assignee_id UUID,
  snoozed_until TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_tasks_status (status, snoozed_until)
);
```

### 2.6 Performance Requirements

#### Response Time SLAs
- **Inbox load (50 leads):** < 500ms
- **Lead approval action:** < 200ms
- **Agent creation:** < 1s
- **Screenshot load:** < 2s (CDN cached)
- **Search/filter:** < 300ms

#### Throughput Targets
- **Concurrent agents:** 100+
- **Leads processed/hour:** 10,000+
- **Screenshot uploads/hour:** 10,000+
- **Database connections:** 100 pooled
- **Redis operations/sec:** 1,000+

#### Caching Strategy
```typescript
// Redis cache layers
const cacheConfig = {
  leads: {
    ttl: 300, // 5 minutes
    pattern: 'leads:agent:{agentId}:page:{page}'
  },
  sessions: {
    ttl: 1800, // 30 minutes
    pattern: 'session:{sessionId}'
  },
  scores: {
    ttl: 3600, // 1 hour
    pattern: 'score:post:{postId}'
  }
};
```

### 2.7 Security & Compliance

#### Encryption Standards
- **At-rest:** AES-256-GCM for all sensitive data
- **In-transit:** TLS 1.3 minimum
- **Key rotation:** Monthly for session keys
- **Secrets management:** AWS Secrets Manager / GCP Secret Manager

#### Audit Logging
```typescript
interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  changes: object;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

// Required audit events
const AUDIT_EVENTS = [
  'session.created',
  'session.accessed',
  'agent.created',
  'agent.modified',
  'lead.approved',
  'lead.exported',
  'account.deleted'
];
```

### 2.8 Monitoring & Observability

#### Key Metrics
```typescript
// Prometheus metrics
const metrics = {
  // Business metrics
  leads_discovered_total: new Counter(),
  leads_approved_rate: new Gauge(),
  agent_run_duration: new Histogram(),
  
  // Technical metrics
  session_health_score: new Gauge(),
  extraction_success_rate: new Gauge(),
  queue_depth: new Gauge(),
  database_connection_pool: new Gauge(),
  
  // Error tracking
  extraction_failures_total: new Counter(),
  session_refresh_failures: new Counter(),
  rate_limit_hits: new Counter()
};
```

#### Alert Thresholds
- **Session health < 0.5:** Page immediately
- **Extraction success < 80%:** Alert
- **Queue depth > 1000:** Alert
- **Database connections > 80:** Warning
- **Any 5xx errors > 10/min:** Alert

### 2.9 Infrastructure Specifications

#### Compute Requirements
```yaml
# Kubernetes deployment
api-service:
  replicas: 3
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 4Gi

agent-workers:
  replicas: 10-50 (HPA)
  resources:
    requests:
      cpu: 1000m
      memory: 2Gi
    limits:
      cpu: 2000m
      memory: 4Gi

database:
  class: db.r6g.xlarge
  storage: 500GB SSD
  replicas: 1 primary + 2 read replicas

redis:
  class: cache.r6g.large
  replication: enabled
  persistence: AOF
```

#### Storage Estimates
- **Screenshots:** ~100KB average × 10,000/day = 1GB/day
- **Database growth:** ~2KB/lead × 10,000/day = 20MB/day
- **Log retention:** 30 days rolling
- **Backup strategy:** Daily snapshots, 30-day retention

### 2.10 Development & Testing Requirements

#### Test Coverage Targets
- **Unit tests:** 80% minimum
- **Integration tests:** Critical paths 100%
- **E2E tests:** Happy paths + edge cases
- **Load tests:** 2x expected capacity

#### Test Scenarios
```typescript
describe('Agent Worker', () => {
  test('handles session expiration gracefully');
  test('respects rate limits with backoff');
  test('extracts posts with missing fields');
  test('recovers from browser crashes');
  test('maintains human-like behavior patterns');
});

describe('Lead Scoring', () => {
  test('scores consistently across runs');
  test('handles edge cases (0 engagement, no text)');
  test('applies toxicity filtering correctly');
  test('generates accurate reason chips');
});
```

## 3. Technical Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)
- Database schema deployment
- Redis cluster setup
- Session encryption system
- Basic API scaffolding
- CI/CD pipeline

### Phase 2: Agent System (Week 3-4)
- Browser automation framework
- Queue implementation
- Session management
- Basic extraction logic
- Anti-detection measures

### Phase 3: Scoring & Processing (Week 5-6)
- Scoring algorithm implementation
- Lead deduplication
- Screenshot pipeline
- Caching layer
- Performance optimization

### Phase 4: API & Frontend (Week 7-8)
- REST API completion
- WebSocket for real-time updates
- React frontend
- Authentication/authorization
- Admin dashboard

### Phase 5: Hardening (Week 9-10)
- Load testing
- Security audit
- Monitoring setup
- Documentation
- Deployment automation

## 4. Technical Risks & Mitigations

### Risk: Threads Detection & Blocking
**Mitigation:**
- Implement residential proxy rotation
- Add random delays (2-8s between actions)
- Vary browser fingerprints per session
- Monitor detection signals (captchas, rate limits)
- Fallback to manual session refresh

### Risk: Session Cookie Expiration at Scale
**Mitigation:**
- Proactive refresh when TTL < 6 hours
- Queue priority for expiring sessions
- Batch refresh during low-activity periods
- Alert on >10% session failure rate

### Risk: Database Performance Degradation
**Mitigation:**
- Partition leads table by month
- Implement read replicas for queries
- Aggressive caching strategy
- Archive old leads to cold storage
- Query optimization with explain analyze

### Risk: Screenshot Storage Costs
**Mitigation:**
- Compress images (WebP format, 70% quality)
- S3 lifecycle policies (move to Glacier after 30 days)
- CDN caching for frequently accessed
- Lazy loading in UI
- Optional screenshot disabling per agent

## 5. Success Criteria (Technical)

### Launch Readiness Checklist
- [ ] 99.9% API uptime over 7 days
- [ ] < 2s page load with 1000 leads
- [ ] 100 concurrent agents without degradation
- [ ] Zero session data leaks in security audit
- [ ] Successful extraction rate > 95%
- [ ] All critical paths covered by tests
- [ ] Monitoring dashboard fully operational
- [ ] Runbook for common issues completed
- [ ] Load test at 2x capacity passed
- [ ] Database backup/restore verified

---

*This technical specification provides the implementation blueprint while maintaining flexibility for engineering decisions during development.*