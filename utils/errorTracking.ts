/**
 * Server-Side Error Tracking
 * 
 * Tracks errors that occur in API routes and server components
 * Client-side errors are tracked via PostHog in error boundaries
 */

interface ErrorContext {
  userId?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  [key: string]: any;
}

/**
 * Track server-side error
 * Currently logs to console, but can be extended to send to monitoring service
 * 
 * To integrate with external service (Sentry, etc):
 * 1. Initialize service in this file
 * 2. Call service.captureException(error, context) in this function
 */
export function trackServerError(
  error: Error | unknown,
  context?: ErrorContext
): void {
  const timestamp = new Date().toISOString();
  const errorDetails = {
    timestamp,
    message: error instanceof Error ? error.message : 'Unknown error',
    name: error instanceof Error ? error.name : 'Error',
    stack: error instanceof Error ? error.stack : undefined,
    context: context || {},
  };

  // Log to console with structured format
  console.error('🚨 SERVER ERROR', JSON.stringify(errorDetails, null, 2));

  // TODO: Send to external monitoring service (Sentry, Datadog, etc.)
  // Example with Sentry:
  // if (typeof Sentry !== 'undefined') {
  //   Sentry.captureException(error, {
  //     tags: {
  //       type: 'server',
  //       route: context?.route,
  //     },
  //     extra: context,
  //   });
  // }
}

/**
 * Track API route error with request context
 */
export function trackAPIError(
  error: Error | unknown,
  route: string,
  method: string,
  userId?: string,
  additionalContext?: Record<string, any>
): void {
  trackServerError(error, {
    route,
    method,
    userId,
    type: 'api_error',
    ...additionalContext,
  });
}

/**
 * Track critical errors (database failures, service outages)
 */
export function trackCriticalError(
  error: Error | unknown,
  component: string,
  additionalContext?: Record<string, any>
): void {
  trackServerError(error, {
    severity: 'critical',
    component,
    ...additionalContext,
  });
  
  // Could trigger alerts here (email, Slack, PagerDuty)
  // alertTeam(`Critical error in ${component}: ${error instanceof Error ? error.message : 'Unknown'}`);
}

