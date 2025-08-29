# Solead Project Structure

## ✅ Organized Directory Layout

```
solead/
│
├── 📁 docs/                     # All documentation
│   ├── 📄 solead_PRD.md        # Product requirements
│   ├── 📁 architecture/        # System design
│   │   └── system-overview.md
│   ├── 📁 api/                 # API documentation
│   │   └── endpoints.md
│   └── 📁 development/         # Dev guides
│       ├── setup-guide.md
│       └── CLAUDE.md
│
├── 📁 frontend/                 # React application
│   ├── 📁 src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API integration
│   │   ├── hooks/             # Custom React hooks
│   │   └── utils/             # Helper functions
│   └── 📁 public/             # Static assets
│
├── 📁 backend/                  # Node.js API & Workers
│   ├── 📁 src/
│   │   ├── agents/            # Stagehand automation agents
│   │   ├── api/               # REST API routes
│   │   ├── database/          # Models & queries
│   │   ├── queue/             # Job processing
│   │   ├── services/          # Business logic
│   │   └── utils/             # Utilities
│   ├── 📁 config/             # Configuration files
│   ├── 📁 migrations/         # Database migrations
│   └── 📁 tests/              # Test suites
│
├── 📁 plugins/                  # External integrations
│   └── 📁 stagehand/          # Browser automation
│       ├── 📁 config/         # Stagehand configuration
│       │   └── stagehand.cursorrules
│       └── 📁 examples/       # Example scripts
│           ├── index.ts
│           ├── simple-demo.ts
│           ├── github-trending.ts
│           └── test-simple.ts
│
├── 📁 shared/                   # Shared code
│   ├── 📁 types/              # TypeScript types
│   ├── 📁 constants/          # Shared constants
│   └── 📁 utils/              # Shared utilities
│
├── 📄 README.md                 # Project overview
├── 📄 PROJECT_STRUCTURE.md      # This file
├── 📄 package.json              # Root dependencies
├── 📄 tsconfig.json             # TypeScript config
├── 📄 .env                      # Environment variables
└── 📄 .env.example              # Environment template
```

## 🎯 Directory Purpose

### `/docs`
Complete project documentation including PRD, architecture decisions, API specs, and development guides.

### `/frontend`
React-based user interface for lead management, agent configuration, and analytics dashboard.

### `/backend`
Core API server and background workers including:
- Stagehand-powered automation agents
- Lead scoring and processing
- Session management
- Queue processing

### `/plugins/stagehand`
Browser automation layer with Stagehand integration:
- Example implementations
- Configuration files
- Reusable automation patterns

### `/shared`
Code shared between frontend and backend:
- TypeScript interfaces and types
- Common constants and enums
- Utility functions

## 🚀 Next Steps

With this organized structure, you can now:

1. **Start Backend Development**
   - Set up database models in `/backend/src/database`
   - Implement API routes in `/backend/src/api`
   - Create Stagehand agents in `/backend/src/agents`

2. **Build Frontend**
   - Create React components in `/frontend/src/components`
   - Implement pages in `/frontend/src/pages`
   - Connect to API via `/frontend/src/services`

3. **Develop Agents**
   - Use examples in `/plugins/stagehand/examples` as templates
   - Build custom agents in `/backend/src/agents`
   - Test automation patterns

4. **Set Up Infrastructure**
   - Configure databases
   - Set up Redis for queues
   - Implement monitoring

## 📝 Development Workflow

1. **Feature Development**
   ```bash
   # Create feature branch
   git checkout -b feature/agent-improvements
   
   # Work in appropriate directory
   cd backend/src/agents
   # ... make changes
   
   # Test your changes
   npm test
   
   # Commit with clear messages
   git commit -m "feat: improve agent extraction accuracy"
   ```

2. **Documentation Updates**
   - Update relevant docs in `/docs` when adding features
   - Keep API documentation in sync
   - Update README for significant changes

3. **Testing Strategy**
   - Unit tests alongside source files
   - Integration tests in `/backend/tests`
   - E2E tests using Stagehand

## 🔧 Configuration Files

- **Environment**: `.env` files for secrets
- **TypeScript**: `tsconfig.json` for compilation
- **Package Management**: Separate `package.json` for frontend/backend
- **Stagehand**: Configuration in `/plugins/stagehand/config`

This organized structure ensures:
- ✅ Clear separation of concerns
- ✅ Easy navigation
- ✅ Scalable architecture
- ✅ Maintainable codebase
- ✅ Efficient development workflow