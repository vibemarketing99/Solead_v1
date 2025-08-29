# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Core Development Commands
```bash
# Run the main application with BrowserBase cloud execution
npm start

# Run TypeScript files directly without compilation
npx tsx <filename>.ts

# Build TypeScript to JavaScript
npm run build

# Run specific demo files
npx tsx simple-demo.ts
npx tsx github-trending.ts
npx tsx test-simple.ts
```

### Environment Setup
```bash
# Create .env from example (required before first run)
cp .env.example .env

# Required environment variables:
# - BROWSERBASE_PROJECT_ID: BrowserBase project identifier
# - BROWSERBASE_API_KEY: BrowserBase authentication key  
# - OPENAI_API_KEY: OpenAI API key for AI features
```

## Architecture

### Stagehand AI Browser Automation Framework
This project uses Stagehand, which extends Playwright with AI-powered methods. The architecture consists of:

1. **Stagehand Class**: Main orchestrator providing browser initialization and configuration
   - Supports both `BROWSERBASE` (cloud) and `LOCAL` execution environments
   - Manages browser lifecycle with `init()` and `close()` methods
   - Provides access to `page` (StagehandPage) and `context` (StagehandContext)

2. **AI-Enhanced Page Methods**:
   - `act()`: Execute actions using natural language (e.g., "Click the login button")
   - `extract()`: Extract structured data with optional Zod schemas
   - `observe()`: Plan actions and get selectors before execution
   - `agent()`: Create autonomous agents for multi-step workflows

3. **Configuration Approach**:
   - Environment variables in `.env` for sensitive credentials
   - `env: "BROWSERBASE"` for cloud execution with session replay URLs
   - `env: "LOCAL"` for local Chromium execution during development

### Key Implementation Patterns

#### Schema-Based Extraction (Preferred)
```typescript
import { z } from "zod";

const data = await page.extract({
  instruction: "extract product information",
  schema: z.object({
    title: z.string(),
    price: z.number(),
    features: z.array(z.string())
  })
});
```

#### Variable Substitution in Actions
```typescript
await page.act({
  action: "Fill form with Name: %name%, Email: %email%",
  variables: { name: "John", email: "john@example.com" }
});
```

#### Observe-Then-Act Pattern
```typescript
const results = await page.observe({
  instruction: "Find submit button",
  returnAction: true
});
await page.act(results[0]);
```

### Important Implementation Notes

1. **Array Extraction**: Always wrap arrays in an object when using schemas:
   ```typescript
   // Correct
   schema: z.object({ items: z.array(z.string()) })
   // Incorrect  
   schema: z.array(z.string())
   ```

2. **Action Atomicity**: Keep actions atomic and specific:
   - Good: "Click the sign in button"
   - Avoid: "Sign in to the website and navigate to dashboard"

3. **Error Handling**: The agent feature may have schema validation issues in current version. Use try-catch blocks and fallback to basic methods (act, extract, observe) if agent execution fails.

4. **BrowserBase Sessions**: When using `env: "BROWSERBASE"`, sessions are viewable at:
   ```
   https://browserbase.com/sessions/{sessionID}
   ```

### TypeScript Configuration
- Target: ES2022 with NodeNext module resolution
- Strict mode enabled
- Output directory: `./dist`
- ESM module type (`"type": "module"` in package.json)

### Dependencies
- **@browserbasehq/stagehand**: Core automation framework
- **dotenv**: Environment variable management
- **tsx**: TypeScript execution without compilation
- **typescript**: TypeScript compiler

## Cursorrules Integration
The project includes comprehensive Stagehand-specific cursor rules in `.cursorrules` that detail:
- Proper usage of act(), extract(), and observe() methods
- Schema validation patterns with Zod
- Agent system configuration for different providers (OpenAI, Anthropic)
- Best practices for atomic actions and structured extraction