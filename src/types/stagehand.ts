/**
 * Stagehand-specific type definitions
 */

import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';

// Stagehand Job Configuration
export interface StagehandJob {
  id: string;
  agentId: string;
  sessionId: string;
  accountId: string;
  keywords: string[];
  maxResults: number;
  priority: number;
  attempts: number;
  status: JobStatus;
  error?: string;
  results?: ExtractedPost[];
  metrics?: JobMetrics;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface JobMetrics {
  duration: number;
  tokensUsed: number;
  fallbackCount: number;
  extractionSuccessRate: number;
  actionsPerformed: number;
}

// Stagehand Configuration
export interface StagehandConfig {
  env: 'LOCAL' | 'BROWSERBASE';
  headless: boolean;
  enableCaching: boolean;
  modelName: 'gpt-4o-mini' | 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3-sonnet' | 'claude-3-opus';
  modelClientOptions: {
    apiKey: string;
    maxTokens?: number;
    temperature?: number;
  };
  logger?: (message: any) => void; // Stagehand uses LogLine type internally
  debugMode?: boolean;
  timeout?: number;
}

// Stagehand Extraction Schemas
export const PostExtractionSchema = z.object({
  posts: z.array(z.object({
    author: z.string(),
    authorFollowers: z.number().optional(),
    content: z.string(),
    timestamp: z.string(),
    engagement: z.object({
      likes: z.number(),
      replies: z.number(),
      reposts: z.number(),
      views: z.number().optional(),
    }),
    hasQuestion: z.boolean(),
    hashtags: z.array(z.string()),
    mentions: z.array(z.string()),
    links: z.array(z.string()),
  })),
});

export const SessionValidationSchema = z.object({
  isLoggedIn: z.boolean(),
  username: z.string().optional(),
  sessionHealth: z.enum(['healthy', 'degraded', 'expired']),
});

export const SearchResultsSchema = z.object({
  hasResults: z.boolean(),
  resultCount: z.number(),
  nextPageAvailable: z.boolean(),
});

// Stagehand Action Templates
export interface ActionTemplate {
  name: string;
  action: string;
  expectedResult?: string;
  timeout?: number;
  retryOnFailure?: boolean;
}

export const THREADS_ACTIONS: Record<string, ActionTemplate> = {
  SEARCH: {
    name: 'search',
    action: 'search for "{keywords}" on Threads',
    expectedResult: 'search results loaded',
    timeout: 10000,
    retryOnFailure: true,
  },
  SCROLL: {
    name: 'scroll',
    action: 'slowly scroll down the page reading posts',
    timeout: 5000,
  },
  LOAD_MORE: {
    name: 'loadMore',
    action: 'scroll down to load more posts',
    expectedResult: 'new posts loaded',
    timeout: 8000,
    retryOnFailure: true,
  },
  NAVIGATE_POST: {
    name: 'navigatePost',
    action: 'navigate to {postUrl} and wait for post to load',
    expectedResult: 'post details visible',
    timeout: 10000,
  },
  GO_HOME: {
    name: 'goHome',
    action: 'go to Threads home page',
    expectedResult: 'home feed visible',
    timeout: 10000,
  },
};

// Stagehand Worker Pool
export interface StagehandInstance {
  id: string;
  stagehand: Stagehand;
  isAvailable: boolean;
  lastUsed: Date;
  sessionId?: string;
  jobCount: number;
}

export interface WorkerPoolConfig {
  maxInstances: number;
  instanceTimeout: number;
  recycleAfterJobs: number;
  warmupInstances: number;
}

// Stagehand Error Types
export enum StagehandErrorType {
  MODEL_TIMEOUT = 'MODEL_TIMEOUT',
  EXTRACTION_FAILED = 'EXTRACTION_FAILED',
  ACTION_NOT_POSSIBLE = 'ACTION_NOT_POSSIBLE',
  CONTEXT_LOST = 'CONTEXT_LOST',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  RATE_LIMITED = 'RATE_LIMITED',
  BROWSER_CRASHED = 'BROWSER_CRASHED',
}

export interface StagehandError extends Error {
  type: StagehandErrorType;
  retryable: boolean;
  fallbackAvailable: boolean;
  context?: any;
}

// Import the ExtractedPost type from models
import { ExtractedPost } from './models';

// Re-export ExtractedPost for convenience
export { ExtractedPost } from './models';

// Search result type
export interface SearchResult {
  posts: ExtractedPost[];
  nextPageAvailable: boolean;
  totalFound: number;
}