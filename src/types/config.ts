/**
 * Configuration type definitions
 */

// Application Configuration
export interface AppConfig {
  env: 'development' | 'staging' | 'production';
  port: number;
  apiBaseUrl: string;
  corsOrigins: string[];
  trustProxy: boolean;
}

// Database Configuration
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  poolSize?: number;
  logging?: boolean;
}

// Redis Configuration
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  retryStrategy?: (times: number) => number;
}

// Queue Configuration
export interface QueueConfig {
  redis: RedisConfig;
  defaultJobOptions: {
    attempts: number;
    backoff: {
      type: 'exponential' | 'fixed';
      delay: number;
    };
    removeOnComplete: number;
    removeOnFail: number;
  };
  concurrency: number;
}

// AWS Configuration
export interface AWSConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  s3: {
    bucketName: string;
    cdnUrl?: string;
  };
  kms?: {
    keyId: string;
  };
}

// Encryption Configuration
export interface EncryptionConfig {
  algorithm: 'aes-256-gcm';
  keyRotationDays: number;
  kmsProvider: 'aws' | 'gcp' | 'local';
  localKey?: string;
}

// Worker Configuration
export interface WorkerConfig {
  concurrency: number;
  maxStagehandInstances: number;
  instanceRecycleAfterJobs: number;
  jobRetryAttempts: number;
  jobTimeout: number;
  healthCheckInterval: number;
}

// Rate Limiting Configuration
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests: boolean;
  keyGenerator?: (req: any) => string;
}

// Logging Configuration
export interface LogConfig {
  level: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
  format: 'json' | 'simple' | 'combined';
  transports: LogTransport[];
}

export interface LogTransport {
  type: 'console' | 'file' | 'cloudwatch' | 'datadog';
  level?: string;
  filename?: string;
  maxFiles?: number;
  maxSize?: string;
}

// Monitoring Configuration
export interface MonitoringConfig {
  prometheus: {
    enabled: boolean;
    port: number;
    path: string;
  };
  healthCheck: {
    enabled: boolean;
    path: string;
    interval: number;
  };
  metrics: {
    collectDefaultMetrics: boolean;
    prefix: string;
  };
}

// Complete Configuration
export interface Config {
  app: AppConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  queue: QueueConfig;
  aws: AWSConfig;
  encryption: EncryptionConfig;
  worker: WorkerConfig;
  rateLimit: RateLimitConfig;
  logging: LogConfig;
  monitoring: MonitoringConfig;
  stagehand: {
    env: 'LOCAL' | 'BROWSERBASE';
    headless: boolean;
    modelName: string;
    apiKey: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
}

// Environment Variables
export interface EnvVariables {
  NODE_ENV: string;
  PORT: string;
  DATABASE_HOST: string;
  DATABASE_PORT: string;
  DATABASE_NAME: string;
  DATABASE_USER: string;
  DATABASE_PASSWORD: string;
  REDIS_HOST: string;
  REDIS_PORT: string;
  REDIS_PASSWORD?: string;
  ENCRYPTION_KEY: string;
  KMS_KEY_ID?: string;
  STAGEHAND_ENV: string;
  STAGEHAND_HEADLESS: string;
  STAGEHAND_MODEL: string;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
  S3_BUCKET_NAME: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  WORKER_CONCURRENCY: string;
  MAX_STAGEHAND_INSTANCES: string;
  PROMETHEUS_PORT?: string;
  LOG_LEVEL?: string;
}