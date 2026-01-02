/**
 * Structured Logging for Timestamp Matching
 * 
 * Provides structured logging with context for debugging and monitoring
 */

export interface LogContext {
  videoId?: string;
  stepCount?: number;
  segmentCount?: number;
  strategy?: string;
  matchRate?: number;
  confidence?: number;
  processingTimeMs?: number;
  [key: string]: any;
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

class TimestampMatchingLogger {
  private enabled: boolean;
  private minLevel: LogLevel;

  constructor() {
    this.enabled = process.env.NODE_ENV !== 'test';
    this.minLevel = (process.env.TIMESTAMP_LOG_LEVEL as LogLevel) || LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.enabled) return false;
    
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentIndex = levels.indexOf(level);
    const minIndex = levels.indexOf(this.minLevel);
    
    return currentIndex >= minIndex;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [TIMESTAMP_MATCHING] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage(LogLevel.DEBUG, message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage(LogLevel.INFO, message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message, context));
    }
  }

  error(message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorContext = {
        ...context,
        error: error?.message,
        stack: error?.stack,
      };
      console.error(this.formatMessage(LogLevel.ERROR, message, errorContext));
    }
  }

  /**
   * Log matching pipeline stage
   */
  stage(stage: string, context?: LogContext): void {
    this.info(`Stage: ${stage}`, context);
  }

  /**
   * Log matching result
   */
  matchResult(stepIndex: number, timestamp: number, confidence: number, strategy: string, context?: LogContext): void {
    this.debug(`Match: Step ${stepIndex} → ${timestamp}s (confidence: ${confidence.toFixed(2)}, strategy: ${strategy})`, context);
  }

  /**
   * Log quality metrics
   */
  qualityMetrics(matchRate: number, avgConfidence: number, strategyDistribution: Record<string, number>, context?: LogContext): void {
    this.info('Quality Metrics', {
      ...context,
      matchRatePercent: `${(matchRate * 100).toFixed(1)}%`,
      avgConfidence: avgConfidence.toFixed(2),
      strategies: strategyDistribution,
    } as LogContext);
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, durationMs: number, context?: LogContext): void {
    this.info(`Performance: ${operation} took ${durationMs}ms`, context);
  }
}

export const logger = new TimestampMatchingLogger();

