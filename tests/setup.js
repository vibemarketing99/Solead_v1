"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: '.env.test' });
jest.setTimeout(30000);
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};
afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
});
global.testUtils = {
    delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
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
        status: 'active',
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
            scrollDelayMs: [2000, 5000],
            actionDelayMs: [1000, 3000],
            humanization: {
                scrollPattern: 'random',
                mouseMovement: true,
                readingDelays: true,
                randomBreaks: [5000, 15000],
            },
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    }),
};
//# sourceMappingURL=setup.js.map