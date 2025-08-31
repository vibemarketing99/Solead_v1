import winston from 'winston';
import path from 'path';

/**
 * Logger utility class providing structured logging with different levels
 * Supports console and file output with proper formatting
 */
export class Logger {
  private logger: winston.Logger;
  private context: string;

  constructor(context: string) {
    this.context = context;

    // Define log format
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, context, ...metadata }) => {
        let msg = `${timestamp} [${level.toUpperCase()}] [${context}]: ${message}`;
        
        if (Object.keys(metadata).length > 0) {
          msg += ` ${JSON.stringify(metadata)}`;
        }
        
        return msg;
      })
    );

    // Console format with colors
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, context, ...metadata }) => {
        let msg = `${timestamp} [${context}] ${message}`;
        
        if (Object.keys(metadata).length > 0 && process.env.NODE_ENV === 'development') {
          msg += ` ${JSON.stringify(metadata, null, 2)}`;
        }
        
        return msg;
      })
    );

    // Create transports
    const transports: winston.transport[] = [
      // Console transport
      new winston.transports.Console({
        format: consoleFormat,
        level: process.env.LOG_LEVEL || 'info'
      })
    ];

    // Add file transports in production
    if (process.env.NODE_ENV === 'production') {
      // Error log file
      transports.push(
        new winston.transports.File({
          filename: path.join('logs', 'error.log'),
          level: 'error',
          format: logFormat,
          maxsize: 10485760, // 10MB
          maxFiles: 5
        })
      );

      // Combined log file
      transports.push(
        new winston.transports.File({
          filename: path.join('logs', 'combined.log'),
          format: logFormat,
          maxsize: 10485760, // 10MB
          maxFiles: 10
        })
      );

      // Automation-specific log for Stagehand operations
      if (context.includes('Stagehand') || context.includes('Automation')) {
        transports.push(
          new winston.transports.File({
            filename: path.join('logs', 'automation.log'),
            format: logFormat,
            maxsize: 10485760, // 10MB
            maxFiles: 5
          })
        );
      }
    }

    // Create logger instance
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      defaultMeta: { context: this.context },
      transports,
      exitOnError: false
    });

    // Handle uncaught exceptions and rejections in production
    if (process.env.NODE_ENV === 'production') {
      this.logger.exceptions.handle(
        new winston.transports.File({ 
          filename: path.join('logs', 'exceptions.log') 
        })
      );

      this.logger.rejections.handle(
        new winston.transports.File({ 
          filename: path.join('logs', 'rejections.log') 
        })
      );
    }
  }

  /**
   * Log info level message
   */
  info(message: string, metadata?: any): void {
    this.logger.info(message, metadata);
  }

  /**
   * Log warning level message
   */
  warn(message: string, metadata?: any): void {
    this.logger.warn(message, metadata);
  }

  /**
   * Log error level message
   */
  error(message: string, error?: any, metadata?: any): void {
    if (error instanceof Error) {
      this.logger.error(message, {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        ...metadata
      });
    } else {
      this.logger.error(message, { error, ...metadata });
    }
  }

  /**
   * Log debug level message
   */
  debug(message: string, metadata?: any): void {
    this.logger.debug(message, metadata);
  }

  /**
   * Log verbose level message
   */
  verbose(message: string, metadata?: any): void {
    this.logger.verbose(message, metadata);
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, duration: number, metadata?: any): void {
    this.logger.info(`Performance: ${operation}`, {
      duration: `${duration}ms`,
      ...metadata
    });
  }

  /**
   * Start a timer for performance measurement
   */
  startTimer(): () => void {
    const start = Date.now();
    return () => Date.now() - start;
  }

  /**
   * Log Stagehand-specific operations
   */
  stagehand(action: string, details: any): void {
    this.logger.info(`Stagehand Action: ${action}`, {
      stagehandDetails: details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log agent operations
   */
  agent(agentId: string, action: string, details?: any): void {
    this.logger.info(`Agent Operation`, {
      agentId,
      action,
      details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log lead discovery events
   */
  lead(leadId: string, event: string, score?: number, metadata?: any): void {
    this.logger.info(`Lead Event: ${event}`, {
      leadId,
      score,
      ...metadata,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log session management events
   */
  session(sessionId: string, event: string, health?: number, metadata?: any): void {
    this.logger.info(`Session Event: ${event}`, {
      sessionId,
      health,
      ...metadata,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: string): Logger {
    return new Logger(`${this.context}:${additionalContext}`);
  }

  /**
   * Structured logging for metrics
   */
  metric(name: string, value: number, unit: string = 'count', tags?: Record<string, string>): void {
    this.logger.info('Metric', {
      metric: {
        name,
        value,
        unit,
        tags,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log API requests
   */
  apiRequest(method: string, path: string, statusCode: number, duration: number, metadata?: any): void {
    const level = statusCode >= 400 ? 'error' : 'info';
    
    this.logger.log(level, 'API Request', {
      request: {
        method,
        path,
        statusCode,
        duration: `${duration}ms`,
        ...metadata
      }
    });
  }

  /**
   * Log queue job events
   */
  job(jobId: string, event: string, metadata?: any): void {
    this.logger.info(`Job Event: ${event}`, {
      jobId,
      ...metadata,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Audit log for security-sensitive operations
   */
  audit(userId: string, action: string, resource: string, result: 'success' | 'failure', metadata?: any): void {
    this.logger.info('Audit Event', {
      audit: {
        userId,
        action,
        resource,
        result,
        ...metadata,
        timestamp: new Date().toISOString()
      }
    });
  }
}