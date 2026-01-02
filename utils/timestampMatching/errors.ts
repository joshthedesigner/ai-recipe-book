/**
 * Timestamp Matching Error Types
 * 
 * Custom error classes for timestamp matching pipeline
 */

export class TimestampMatchingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = 'TimestampMatchingError';
  }
}

export class ValidationError extends TimestampMatchingError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}

export class MatchingError extends TimestampMatchingError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'MATCHING_ERROR', context);
    this.name = 'MatchingError';
  }
}

export class ApiError extends TimestampMatchingError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false,
    context?: Record<string, any>
  ) {
    super(message, 'API_ERROR', { ...context, statusCode, retryable });
    this.name = 'ApiError';
  }
}

export class TimeoutError extends TimestampMatchingError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'TIMEOUT_ERROR', context);
    this.name = 'TimeoutError';
  }
}

export class CacheError extends TimestampMatchingError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'CACHE_ERROR', context);
    this.name = 'CacheError';
  }
}

/**
 * Error handler with retry logic
 */
export interface RetryOptions {
  maxRetries: number;
  delayMs: number;
  exponentialBackoff?: boolean;
  retryable?: (error: Error) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxRetries, delayMs, exponentialBackoff = true, retryable } = options;
  
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if error is retryable
      if (retryable && !retryable(lastError)) {
        throw lastError;
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = exponentialBackoff 
        ? delayMs * Math.pow(2, attempt)
        : delayMs;
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: Error): boolean {
  if (error instanceof ApiError) {
    return error.retryable;
  }
  
  if (error instanceof TimeoutError) {
    return true;
  }
  
  // Network errors are retryable
  if (error.message.includes('ECONNRESET') || 
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ENOTFOUND')) {
    return true;
  }
  
  // 5xx errors are retryable
  if (error.message.includes('500') || 
      error.message.includes('502') ||
      error.message.includes('503') ||
      error.message.includes('504')) {
    return true;
  }
  
  return false;
}

