/**
 * Consensus System
 * 
 * Combines results from multiple matching strategies
 * Uses voting and confidence to determine best matches
 */

import { ExactMatchResult } from './matching/exact';
import { SemanticMatchResult } from './matching/semantic';
import { PositionMatchResult } from './matching/position';
import { TimestampMatch } from './chronological';
import { logger } from './logger';
import { getConfig } from './config';

export interface ConsensusMatch extends TimestampMatch {
  strategies: string[];
  agreement: number; // 0-1, how many strategies agree
  allMatches: Array<{
    strategy: string;
    timestamp: number;
    confidence: number;
  }>;
}

export interface ConsensusResult {
  matches: ConsensusMatch[];
  strategyDistribution: Record<string, number>;
  agreementRate: number; // Average agreement across all matches
}

/**
 * Combine matches from multiple strategies using consensus
 */
export function buildConsensus(
  exactMatches: ExactMatchResult[],
  semanticMatches: SemanticMatchResult[],
  positionMatches: PositionMatchResult[]
): ConsensusResult {
  const config = getConfig();
  const consensus: Map<number, ConsensusMatch> = new Map();
  const strategyCounts: Record<string, number> = {
    exact: 0,
    semantic: 0,
    position: 0,
    consensus: 0,
  };
  
  logger.stage('consensus building', {
    exactMatches: exactMatches.length,
    semanticMatches: semanticMatches.length,
    positionMatches: positionMatches.length,
  });
  
  // Collect all matches by step index
  const allMatchesByStep = new Map<number, Array<{
    strategy: string;
    timestamp: number;
    confidence: number;
    source: ExactMatchResult | SemanticMatchResult | PositionMatchResult;
  }>>();
  
  // Add exact matches
  for (const match of exactMatches) {
    if (!allMatchesByStep.has(match.stepIndex)) {
      allMatchesByStep.set(match.stepIndex, []);
    }
    allMatchesByStep.get(match.stepIndex)!.push({
      strategy: 'exact',
      timestamp: match.timestamp,
      confidence: match.confidence,
      source: match,
    });
    strategyCounts.exact++;
  }
  
  // Add semantic matches
  for (const match of semanticMatches) {
    if (!allMatchesByStep.has(match.stepIndex)) {
      allMatchesByStep.set(match.stepIndex, []);
    }
    allMatchesByStep.get(match.stepIndex)!.push({
      strategy: 'semantic',
      timestamp: match.timestamp,
      confidence: match.confidence,
      source: match,
    });
    strategyCounts.semantic++;
  }
  
  // Add position matches (only for unmatched steps)
  for (const match of positionMatches) {
    if (!allMatchesByStep.has(match.stepIndex)) {
      allMatchesByStep.set(match.stepIndex, []);
      allMatchesByStep.get(match.stepIndex)!.push({
        strategy: 'position',
        timestamp: match.timestamp,
        confidence: match.confidence,
        source: match,
      });
      strategyCounts.position++;
    }
  }
  
  // Build consensus for each step
  for (const [stepIndex, matches] of allMatchesByStep.entries()) {
    if (matches.length === 0) continue;
    
    // If only one match, use it
    if (matches.length === 1) {
      const match = matches[0];
      consensus.set(stepIndex, {
        stepIndex,
        timestamp: match.timestamp,
        confidence: match.confidence,
        strategy: match.strategy,
        strategies: [match.strategy],
        agreement: 1.0,
        allMatches: matches.map(m => ({
          strategy: m.strategy,
          timestamp: m.timestamp,
          confidence: m.confidence,
        })),
        reasoning: `Single ${match.strategy} match`,
      });
      continue;
    }
    
    // Multiple matches - use consensus
    const strategies = [...new Set(matches.map(m => m.strategy))];
    
    // Check if timestamps are close (within 5 seconds = agreement)
    const timestamps = matches.map(m => m.timestamp);
    const minTimestamp = Math.min(...timestamps);
    const maxTimestamp = Math.max(...timestamps);
    const timestampSpread = maxTimestamp - minTimestamp;
    const timestampAgreement = timestampSpread <= 5 ? 1.0 : Math.max(0, 1 - (timestampSpread - 5) / 20);
    
    // Weighted average timestamp (weighted by confidence)
    let totalWeight = 0;
    let weightedTimestamp = 0;
    let maxConfidence = 0;
    let bestStrategy = '';
    
    for (const match of matches) {
      const weight = match.confidence;
      weightedTimestamp += match.timestamp * weight;
      totalWeight += weight;
      
      if (match.confidence > maxConfidence) {
        maxConfidence = match.confidence;
        bestStrategy = match.strategy;
      }
    }
    
    const consensusTimestamp = Math.round(weightedTimestamp / totalWeight);
    
    // Agreement score: how many strategies agree (within 5 seconds)
    const agreeingMatches = matches.filter(m => 
      Math.abs(m.timestamp - consensusTimestamp) <= 5
    );
    const agreement = agreeingMatches.length / matches.length;
    
    // Boost confidence if multiple strategies agree
    let consensusConfidence = maxConfidence;
    if (agreement >= 0.5) {
      // Multiple strategies agree - boost confidence
      consensusConfidence = Math.min(1.0, maxConfidence + (agreement - 0.5) * 0.2);
    } else if (strategies.length > 1) {
      // Strategies disagree - reduce confidence
      consensusConfidence = maxConfidence * 0.8;
    }
    
    consensus.set(stepIndex, {
      stepIndex,
      timestamp: consensusTimestamp,
      confidence: consensusConfidence,
      strategy: bestStrategy,
      strategies,
      agreement,
      allMatches: matches.map(m => ({
        strategy: m.strategy,
        timestamp: m.timestamp,
        confidence: m.confidence,
      })),
      reasoning: `${strategies.length} strategies: ${strategies.join(', ')} (agreement: ${(agreement * 100).toFixed(0)}%, spread: ${timestampSpread}s)`,
    });
    
    strategyCounts.consensus++;
  }
  
  // Calculate average agreement
  const consensusMatches = Array.from(consensus.values());
  const agreementRate = consensusMatches.length > 0
    ? consensusMatches.reduce((sum, m) => sum + m.agreement, 0) / consensusMatches.length
    : 0;
  
  logger.info('Consensus building complete', {
    consensusMatches: consensusMatches.length,
    agreementRate: agreementRate.toFixed(2),
    strategyDistribution: strategyCounts,
  });
  
  return {
    matches: consensusMatches,
    strategyDistribution: strategyCounts,
    agreementRate,
  };
}


