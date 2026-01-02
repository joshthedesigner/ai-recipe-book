/**
 * Matching Strategies
 * 
 * Main entry point for all matching strategies
 */

export { matchStepToSegment, matchStepsExact, type ExactMatchResult } from './exact';
export { matchStepsSemantic, type SemanticMatchResult } from './semantic';
export { matchStepsPosition, type PositionMatchResult } from './position';

