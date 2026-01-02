/**
 * Quality Metrics and Reporting
 * 
 * Generates comprehensive quality reports for timestamp matching
 */

import { TimestampMatch } from './chronological';
import { ConsensusResult } from './consensus';
import { getConfig } from './config';
import { logger } from './logger';

export interface QualityReport {
  overallScore: number; // 0-1
  matchRate: number; // % of steps with timestamps
  averageConfidence: number; // Average confidence of matches
  chronologicalViolations: number;
  lowConfidenceMatches: number; // Matches with confidence < 0.5
  strategyDistribution: Record<string, number>;
  agreementRate?: number;
  recommendations: string[];
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

/**
 * Generate quality report for timestamp matching results
 */
export function generateQualityReport(
  matches: TimestampMatch[],
  totalSteps: number,
  chronologicalViolations: number,
  consensusResult?: ConsensusResult
): QualityReport {
  const config = getConfig();
  
  // Calculate match rate
  const matchRate = matches.length / totalSteps;
  
  // Calculate average confidence
  const averageConfidence = matches.length > 0
    ? matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length
    : 0;
  
  // Count low confidence matches
  const lowConfidenceMatches = matches.filter(m => m.confidence < 0.5).length;
  
  // Strategy distribution
  const strategyDistribution: Record<string, number> = {};
  for (const match of matches) {
    const strategy = match.strategy || 'unknown';
    strategyDistribution[strategy] = (strategyDistribution[strategy] || 0) + 1;
  }
  
  // Merge with consensus distribution if available
  if (consensusResult) {
    for (const [strategy, count] of Object.entries(consensusResult.strategyDistribution)) {
      strategyDistribution[strategy] = (strategyDistribution[strategy] || 0) + count;
    }
  }
  
  // Calculate overall score (weighted combination)
  const matchRateScore = matchRate; // 40% weight
  const confidenceScore = averageConfidence; // 40% weight
  const violationPenalty = Math.max(0, 1 - (chronologicalViolations / totalSteps)); // 20% weight
  
  const overallScore = (
    matchRateScore * 0.4 +
    confidenceScore * 0.4 +
    violationPenalty * 0.2
  );
  
  // Determine quality level
  let quality: 'excellent' | 'good' | 'fair' | 'poor';
  if (matchRate >= config.excellentMatchRate && averageConfidence >= config.excellentConfidence) {
    quality = 'excellent';
  } else if (matchRate >= config.goodMatchRate && averageConfidence >= config.goodConfidence) {
    quality = 'good';
  } else if (matchRate >= 0.5 || averageConfidence >= 0.4) {
    quality = 'fair';
  } else {
    quality = 'poor';
  }
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (matchRate < 0.7) {
    recommendations.push(`Low match rate (${(matchRate * 100).toFixed(0)}%). Consider enabling AI matching for better coverage.`);
  }
  
  if (averageConfidence < 0.6) {
    recommendations.push(`Low average confidence (${averageConfidence.toFixed(2)}). Matches may be inaccurate.`);
  }
  
  if (chronologicalViolations > 0) {
    recommendations.push(`${chronologicalViolations} chronological violations detected. Timestamps were adjusted.`);
  }
  
  if (lowConfidenceMatches > 0) {
    recommendations.push(`${lowConfidenceMatches} matches have low confidence (<0.5). Review these timestamps.`);
  }
  
  if (strategyDistribution.position && strategyDistribution.position > totalSteps * 0.3) {
    recommendations.push(`High use of position fallback (${strategyDistribution.position}). Consider improving matching strategies.`);
  }
  
  if (quality === 'excellent') {
    recommendations.push('Excellent quality! All metrics are within target ranges.');
  }
  
  const report: QualityReport = {
    overallScore,
    matchRate,
    averageConfidence,
    chronologicalViolations,
    lowConfidenceMatches,
    strategyDistribution,
    agreementRate: consensusResult?.agreementRate,
    recommendations,
    quality,
  };
  
  logger.qualityMetrics(
    matchRate,
    averageConfidence,
    strategyDistribution,
    {
      overallScore: overallScore.toFixed(2),
      quality,
      violations: chronologicalViolations,
    }
  );
  
  return report;
}

/**
 * Format quality report as human-readable string
 */
export function formatQualityReport(report: QualityReport): string {
  const lines: string[] = [];
  
  lines.push('📊 Timestamp Matching Quality Report');
  lines.push('='.repeat(50));
  lines.push('');
  lines.push(`Overall Score: ${(report.overallScore * 100).toFixed(1)}%`);
  lines.push(`Quality: ${report.quality.toUpperCase()}`);
  lines.push('');
  lines.push('Metrics:');
  lines.push(`  Match Rate: ${(report.matchRate * 100).toFixed(1)}%`);
  lines.push(`  Average Confidence: ${report.averageConfidence.toFixed(2)}`);
  lines.push(`  Chronological Violations: ${report.chronologicalViolations}`);
  lines.push(`  Low Confidence Matches: ${report.lowConfidenceMatches}`);
  if (report.agreementRate !== undefined) {
    lines.push(`  Strategy Agreement: ${(report.agreementRate * 100).toFixed(1)}%`);
  }
  lines.push('');
  lines.push('Strategy Distribution:');
  for (const [strategy, count] of Object.entries(report.strategyDistribution)) {
    lines.push(`  ${strategy}: ${count}`);
  }
  lines.push('');
  lines.push('Recommendations:');
  for (const rec of report.recommendations) {
    lines.push(`  • ${rec}`);
  }
  
  return lines.join('\n');
}


