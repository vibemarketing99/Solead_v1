# Solead - AI-Powered Lead Generation for Threads

Solead is an intelligent lead generation platform that automatically discovers and qualifies potential customers from Threads conversations using AI-powered browser automation.

## 🎯 Key Features

- **Automated Discovery**: AI agents continuously scan Threads for relevant conversations
- **Smart Scoring**: Intelligent lead scoring based on engagement, relevance, and timing
- **Multi-Account Support**: Manage multiple Threads accounts with secure session handling
- **Human-Like Browsing**: Anti-detection measures with natural interaction patterns
- **Real-Time Inbox**: Hot and medium lead categorization with instant notifications
- **Visual Context**: Automatic screenshot capture for every lead

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   API       │────▶│  Database   │
│   (React)   │     │  (Node.js)  │     │ (PostgreSQL)│
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Agents    │
                    │ (Stagehand) │
                    └─────────────┘
```

## 📁 Project Structure

```
solead/
├── frontend/          # React application
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API services
│   │   └── utils/       # Utilities
│   └── public/
├── backend/           # Node.js API & workers
│   ├── src/
│   │   ├── agents/      # Stagehand automation agents
│   │   ├── api/         # REST API endpoints
│   │   ├── database/    # Database models & migrations
│   │   ├── queue/       # Job queue processing
│   │   └── services/    # Business logic
│   └── config/
├── plugins/           # External integrations
│   └── stagehand/      # Browser automation
├── shared/            # Shared types & utilities
├── docs/              # Documentation
│   ├── architecture/   # System design docs
│   ├── api/           # API documentation
│   └── development/   # Setup guides
└── scripts/           # Utility scripts
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker (optional)
- BrowserBase account
- OpenAI API key

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-org/solead.git
cd solead
```

2. **Install dependencies**
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. **Set up the database**
```bash
createdb solead
cd backend
npm run db:migrate
```

5. **Start the application**
```bash
# Development mode
npm run dev:all

# Or use Docker
docker-compose up
```

6. **Access the application**
- Frontend: http://localhost:3001
- API: http://localhost:3000
- API Docs: http://localhost:3000/docs

## 🔧 Configuration

### Environment Variables

Create `.env` files based on the examples:

```env
# Core Stagehand/AI Configuration
BROWSERBASE_PROJECT_ID=your-project-id
BROWSERBASE_API_KEY=your-api-key
OPENAI_API_KEY=your-openai-key

# Database
DATABASE_URL=postgresql://localhost:5432/solead
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key
```

## 🤖 Agent Configuration

Agents are configured with keywords and rules to find relevant leads:

```javascript
{
  "name": "Tech Support Hunter",
  "keywords": ["help", "recommendation", "struggling with"],
  "advancedRules": {
    "minFollowers": 100,
    "excludeKeywords": ["selling", "promo"],
    "languages": ["en"]
  },
  "schedule": "*/30 * * * *",  // Every 30 minutes
  "dailyCap": 30
}
```

## 📊 Lead Scoring Algorithm

Leads are scored based on multiple signals:

- **Topic Relevance** (35%): Keyword matching and semantic similarity
- **Engagement Velocity** (20%): Reply rate and interaction speed
- **Recency** (15%): How fresh the conversation is
- **Answerability** (15%): Presence of questions or requests
- **Author Quality** (10%): Follower count and engagement ratio

## 🔒 Security

- **Session Encryption**: AES-256-GCM encryption for all cookies
- **Key Management**: AWS KMS/GCP KMS integration
- **Audit Logging**: Complete audit trail for compliance
- **Rate Limiting**: Intelligent throttling to avoid detection
- **Data Privacy**: No storage of personal messages

## 🧪 Testing

```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests with Stagehand
npm run test:e2e

# Load testing
npm run test:load
```

## 📈 Performance

- Support for 100+ concurrent agents
- Process 10,000+ leads per hour
- Sub-500ms inbox load times
- 99.9% uptime SLA

## 🛠️ Development

### Running Locally

```bash
# Backend development server
cd backend && npm run dev

# Frontend development server
cd frontend && npm start

# Agent workers
cd backend && npm run workers:dev
```

### Debugging Stagehand

```javascript
// Enable visual debugging
const stagehand = new Stagehand({
  env: 'LOCAL',
  headless: false,  // See browser window
  debugDom: true    // DOM debugging
});
```

## 📚 Documentation

- [System Architecture](docs/architecture/system-overview.md)
- [API Documentation](docs/api/endpoints.md)
- [Development Setup](docs/development/setup-guide.md)
- [Stagehand Integration](plugins/stagehand/README.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is proprietary and confidential.

## 🆘 Support

For issues and questions:
- Check [documentation](docs/)
- Review [troubleshooting guide](docs/development/setup-guide.md#troubleshooting)
- Open a GitHub issue

---

Built with ❤️ using [Stagehand](https://github.com/browserbase/stagehand) for AI-powered browser automation