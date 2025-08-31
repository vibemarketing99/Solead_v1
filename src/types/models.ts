/**
 * Data model type definitions
 */

import { ViewportSize } from 'playwright';

// Session Management
export interface Session {
  id: string;
  accountId: string;
  encryptedCookies: string;
  encryptionKeyId: string;
  userAgent: string;
  viewport: ViewportConfig;
  healthScore: number;
  failureCount: number;
  lastActivityAt: Date;
  expiresAt: Date;
  status: SessionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type SessionStatus = 'active' | 'expired' | 'refreshing' | 'failed';

export interface ViewportConfig extends ViewportSize {
  deviceScaleFactor?: number;
  isMobile?: boolean;
  hasTouch?: boolean;
}

// Agent Configuration
export interface Agent {
  id: string;
  accountId: string;
  name: string;
  keywords: string[];
  advancedRules: AdvancedRules;
  schedule: string; // Cron expression
  dailyCap: number;
  concurrency: ConcurrencyConfig;
  isActive: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdvancedRules {
  mustContain?: string[];
  mustNotContain?: string[];
  minEngagement?: number;
  authorMinFollowers?: number;
  language?: string;
  excludeVerified?: boolean;
}

export interface ConcurrencyConfig {
  maxParallelPages: number;
  scrollDelayMs: [number, number];
  actionDelayMs: [number, number];
  humanization: HumanizationProfile;
}

export interface HumanizationProfile {
  scrollPattern: 'linear' | 'exponential' | 'random';
  mouseMovement: boolean;
  readingDelays: boolean;
  randomBreaks: [number, number];
  dwellTime?: [number, number];
}

// Lead Management
export interface Lead {
  id: string;
  agentId: string;
  postUrl: string;
  postId: string;
  authorHandle: string;
  authorFollowers?: number;
  content: PostContent;
  metrics: PostMetrics;
  score: number;
  category: LeadCategory;
  reasons: string[];
  screenshots?: Screenshots;
  capturedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostContent {
  text: string;
  hashtags: string[];
  mentions: string[];
  links: string[];
  hasQuestion: boolean;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface PostMetrics {
  replies: number;
  likes: number;
  reposts: number;
  views?: number;
  timestampRaw: string;
  timestampParsed: Date;
  engagementRate?: number;
}

export type LeadCategory = 'hot' | 'medium' | 'cold';

export interface Screenshots {
  thumbnail: string; // S3 key
  full: string; // S3 key
  capturedAt: Date;
}

// Extracted Post (before processing)
export interface ExtractedPost {
  url: string;
  postId: string;
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
    timestampRaw: string;
    timestampParsed: Date;
  };
  screenshot?: Buffer;
  extractedAt: Date;
  extractionVersion: string;
}

// Task Management
export interface Task {
  id: string;
  leadId: string;
  status: TaskStatus;
  assigneeId?: string;
  snoozedUntil?: Date;
  approvedAt?: Date;
  completedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TaskStatus = 'pending' | 'approved' | 'snoozed' | 'skipped' | 'done';

// Account Management
export interface Account {
  id: string;
  handle: string;
  displayName?: string;
  status: AccountStatus;
  sessionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AccountStatus = 'active' | 'expired' | 'suspended';

// Lead Scoring
export interface ScoringSignals {
  topicMatch: number;
  velocity: number;
  recency: number;
  answerability: number;
  authorQuality: number;
  toxicity: number;
}

export interface LeadScore {
  score: number;
  category: LeadCategory;
  reasons: string[];
  confidence: number;
  signals: ScoringSignals;
}