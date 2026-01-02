/**
 * Input Validation for Timestamp Matching
 * 
 * Validates inputs before processing to prevent errors downstream
 */

import { ValidationError } from './errors';
import { TranscriptSegment } from '@/utils/youtubeHelpers';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate recipe steps
 */
export function validateSteps(steps: string[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!Array.isArray(steps)) {
    errors.push('Steps must be an array');
    return { valid: false, errors, warnings };
  }
  
  if (steps.length === 0) {
    errors.push('Steps array cannot be empty');
    return { valid: false, errors, warnings };
  }
  
  if (steps.length > 100) {
    warnings.push(`Large number of steps (${steps.length}), processing may be slow`);
  }
  
  steps.forEach((step, index) => {
    if (typeof step !== 'string') {
      errors.push(`Step ${index} must be a string`);
    } else if (step.trim().length === 0) {
      errors.push(`Step ${index} cannot be empty`);
    } else if (step.length > 1000) {
      warnings.push(`Step ${index} is very long (${step.length} chars), may affect matching`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate transcript segments
 */
export function validateSegments(segments: TranscriptSegment[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!Array.isArray(segments)) {
    errors.push('Segments must be an array');
    return { valid: false, errors, warnings };
  }
  
  if (segments.length === 0) {
    errors.push('Segments array cannot be empty');
    return { valid: false, errors, warnings };
  }
  
  if (segments.length > 1000) {
    warnings.push(`Large number of segments (${segments.length}), processing may be slow`);
  }
  
  let lastEndMs = 0;
  
  segments.forEach((segment, index) => {
    if (!segment.text || typeof segment.text !== 'string') {
      errors.push(`Segment ${index} must have a text string`);
    }
    
    if (typeof segment.startMs !== 'number' || segment.startMs < 0) {
      errors.push(`Segment ${index} must have a valid startMs (non-negative number)`);
    }
    
    if (typeof segment.endMs !== 'number' || segment.endMs < 0) {
      errors.push(`Segment ${index} must have a valid endMs (non-negative number)`);
    }
    
    if (segment.startMs >= segment.endMs) {
      errors.push(`Segment ${index} has invalid time range (startMs >= endMs)`);
    }
    
    // Check chronological order
    if (index > 0 && segment.startMs < lastEndMs) {
      warnings.push(`Segment ${index} starts before previous segment ends (possible overlap)`);
    }
    
    lastEndMs = segment.endMs;
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate video metadata
 */
export function validateVideoMetadata(videoLength: number, videoId?: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (typeof videoLength !== 'number') {
    errors.push('Video length must be a number');
    return { valid: false, errors, warnings };
  }
  
  if (videoLength <= 0) {
    errors.push('Video length must be greater than 0');
  }
  
  if (videoLength > 36000) { // 10 hours
    warnings.push(`Very long video (${videoLength}s), processing may be slow`);
  }
  
  if (videoId && typeof videoId !== 'string') {
    errors.push('Video ID must be a string');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate complete input for timestamp matching
 */
export function validateTimestampMatchingInput(
  steps: string[],
  segments: TranscriptSegment[],
  videoLength: number,
  videoId?: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate each component
  const stepsResult = validateSteps(steps);
  const segmentsResult = validateSegments(segments);
  const videoResult = validateVideoMetadata(videoLength, videoId);
  
  // Collect all errors and warnings
  errors.push(...stepsResult.errors);
  errors.push(...segmentsResult.errors);
  errors.push(...videoResult.errors);
  
  warnings.push(...stepsResult.warnings);
  warnings.push(...segmentsResult.warnings);
  warnings.push(...videoResult.warnings);
  
  // Cross-validation
  if (stepsResult.valid && segmentsResult.valid) {
    // Check if we have enough segments for matching
    if (segments.length < steps.length * 0.5) {
      warnings.push(`Fewer segments (${segments.length}) than steps (${steps.length}), matching may be difficult`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Throw validation error if invalid
 */
export function assertValid(
  result: ValidationResult,
  context?: string
): void {
  if (!result.valid) {
    const message = context 
      ? `Validation failed for ${context}: ${result.errors.join('; ')}`
      : `Validation failed: ${result.errors.join('; ')}`;
    
    throw new ValidationError(message, {
      errors: result.errors,
      warnings: result.warnings,
      context,
    });
  }
  
  // Log warnings if any
  if (result.warnings.length > 0) {
    console.warn(`Validation warnings${context ? ` for ${context}` : ''}:`, result.warnings);
  }
}

