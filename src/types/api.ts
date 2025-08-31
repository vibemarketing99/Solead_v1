/**
 * API type definitions
 */

import { Request } from 'express';
import { Lead, Agent } from './models';

// Request/Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: ResponseMetadata;
}

export interface ResponseMetadata {
  timestamp: Date;
  version: string;
  requestId: string;
  duration?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Request Interfaces
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  sessionId?: string;
}

// API Endpoints
export interface CreateSessionRequest {
  accountHandle: string;
  cookies: string[];
  userAgent?: string;
  viewport?: {
    width: number;
    height: number;
  };
}

export interface CreateAgentRequest {
  accountId: string;
  name: string;
  keywords: string[];
  advancedRules?: {
    mustContain?: string[];
    mustNotContain?: string[];
    minEngagement?: number;
    authorMinFollowers?: number;
  };
  schedule?: string;
  dailyCap?: number;
}

export interface UpdateAgentRequest extends Partial<CreateAgentRequest> {
  isActive?: boolean;
}

export interface LeadFilters {
  agentId?: string;
  category?: 'hot' | 'medium' | 'cold';
  minScore?: number;
  maxScore?: number;
  startDate?: Date;
  endDate?: Date;
  keywords?: string[];
  status?: string;
}

export interface ApproveLeadRequest {
  leadId: string;
  notes?: string;
  assigneeId?: string;
}

export interface ExportLeadsRequest {
  format: 'csv' | 'json';
  filters?: LeadFilters;
  fields?: string[];
}

// WebSocket Events
export interface WebSocketEvent {
  type: WebSocketEventType;
  payload: any;
  timestamp: Date;
}

export type WebSocketEventType = 
  | 'lead.discovered'
  | 'lead.approved'
  | 'agent.started'
  | 'agent.completed'
  | 'session.expired'
  | 'session.refreshed'
  | 'error';

export interface LeadDiscoveredEvent {
  lead: Lead;
  agent: Agent;
}

export interface AgentStatusEvent {
  agentId: string;
  status: 'started' | 'running' | 'completed' | 'failed';
  progress?: {
    discovered: number;
    processed: number;
    errors: number;
  };
}

// Error Types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  statusCode: number;
}

export const API_ERRORS = {
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    message: 'Authentication required',
    statusCode: 401,
  },
  FORBIDDEN: {
    code: 'FORBIDDEN',
    message: 'Insufficient permissions',
    statusCode: 403,
  },
  NOT_FOUND: {
    code: 'NOT_FOUND',
    message: 'Resource not found',
    statusCode: 404,
  },
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid request data',
    statusCode: 400,
  },
  RATE_LIMITED: {
    code: 'RATE_LIMITED',
    message: 'Too many requests',
    statusCode: 429,
  },
  INTERNAL_ERROR: {
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
    statusCode: 500,
  },
} as const;