/**
 * Centralized Error Handler
 * 
 * Returns safe, generic error messages to clients
 * Logs detailed errors server-side only
 */

import { NextResponse } from 'next/server';

interface SafeError {
  message: string;
  status: number;
  userMessage: string;
}

/**
 * Convert internal errors to safe user-facing messages
 */
export function handleError(error: unknown): SafeError {
  // Log full error server-side
  console.error('API Error:', error);

  // Determine safe user message
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();

    // Authentication errors
    if (errorMessage.includes('unauthorized') || errorMessage.includes('auth')) {
      return {
        message: 'You do not have permission to perform this action',
        status: 403,
        userMessage: 'You do not have permission to perform this action',
      };
    }

    // Not found errors
    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      return {
        message: 'Resource not found',
        status: 404,
        userMessage: 'The requested resource was not found',
      };
    }

    // Validation errors (safe to show)
    if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      return {
        message: error.message, // Validation errors are safe
        status: 400,
        userMessage: error.message,
      };
    }

    // Rate limit errors (safe to show)
    if (errorMessage.includes('rate limit')) {
      return {
        message: error.message,
        status: 429,
        userMessage: 'Rate limit exceeded. Please try again later.',
      };
    }

    // Database errors - sanitize
    if (errorMessage.includes('database') || errorMessage.includes('sql') || errorMessage.includes('supabase')) {
      return {
        message: 'A database error occurred',
        status: 500,
        userMessage: 'An error occurred while processing your request. Please try again.',
      };
    }

    // Network/API errors
    if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('fetch')) {
      return {
        message: 'A network error occurred',
        status: 500,
        userMessage: 'Unable to connect to the server. Please check your connection and try again.',
      };
    }

    // OpenAI/API errors
    if (errorMessage.includes('openai') || errorMessage.includes('api key')) {
      return {
        message: 'An external service error occurred',
        status: 500,
        userMessage: 'A service error occurred. Please try again in a moment.',
      };
    }

    // Generic error for anything else
    return {
      message: 'An error occurred',
      status: 500,
      userMessage: 'An unexpected error occurred. Please try again.',
    };
  }

  // Unknown error type
  return {
    message: 'An unknown error occurred',
    status: 500,
    userMessage: 'An unexpected error occurred. Please try again.',
  };
}

/**
 * Create safe error response for clients
 */
export function errorResponse(error: unknown): NextResponse {
  const safeError = handleError(error);

  return NextResponse.json(
    {
      success: false,
      error: safeError.userMessage,
    },
    {
      status: safeError.status,
    }
  );
}

/**
 * Create safe error response with additional context
 */
export function errorResponseWithContext(
  error: unknown,
  context?: Record<string, any>
): NextResponse {
  const safeError = handleError(error);

  // Log context server-side
  if (context) {
    console.error('Error context:', context);
  }

  return NextResponse.json(
    {
      success: false,
      error: safeError.userMessage,
      ...(context && Object.keys(context).length > 0 ? { context } : {}),
    },
    {
      status: safeError.status,
    }
  );
}


