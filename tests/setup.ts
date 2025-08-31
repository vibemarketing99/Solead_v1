/**
 * Jest test setup
 */

import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test timeouts
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

// Global test utilities
global.testUtils = {
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  mockStagehand: () => ({
    init: jest.fn(),
    act: jest.fn(),
    extract: jest.fn(),
    page: {
      screenshot: jest.fn(),
      goto: jest.fn(),
      waitForSelector: jest.fn(),
    },
    context: {
      addCookies: jest.fn(),
      clearCookies: jest.fn(),
    },
    close: jest.fn(),
  }),
  
  mockRedisClient: () => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
  }),
  
  createMockSession: () => ({
    id: 'test-session-id',
    accountId: 'test-account-id',
    encryptedCookies: 'encrypted-cookie-data',
    encryptionKeyId: 'test-key-id',
    userAgent: 'Mozilla/5.0 Test',
    viewport: { width: 1920, height: 1080 },
    healthScore: 1.0,
    failureCount: 0,
    lastActivityAt: new Date(),
    expiresAt: new Date(Date.now() + 86400000),
    status: 'active' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  
  createMockAgent: () => ({
    id: 'test-agent-id',
    accountId: 'test-account-id',
    name: 'Test Agent',
    keywords: ['test', 'keyword'],
    advancedRules: {},
    schedule: '*/30 * * * *',
    dailyCap: 30,
    concurrency: {
      maxParallelPages: 2,
      scrollDelayMs: [2000, 5000] as [number, number],
      actionDelayMs: [1000, 3000] as [number, number],
      humanization: {
        scrollPattern: 'random' as const,
        mouseMovement: true,
        readingDelays: true,
        randomBreaks: [5000, 15000] as [number, number],
      },
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
};

// Type definitions for global test utilities
declare global {
  var testUtils: {
    delay: (ms: number) => Promise<void>;
    mockStagehand: () => any;
    mockRedisClient: () => any;
    createMockSession: () => any;
    createMockAgent: () => any;
  };
}