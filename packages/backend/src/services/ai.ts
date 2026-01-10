import { AIDecision, YieldOpportunity, PortfolioPosition, RiskScore } from '@flint/shared';
import { riskService } from './risk';
import { ftsoService } from './ftso';
import { fdcService } from './fdc';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * AI Decision Service
 * Generates AI-powered yield optimization decisions with full explainability
 */
class AIService {
  /**
   * Generate allocation decision
   */
  async generateAllocationDecision(
    userId: string,
    asset: string,
    amount: string,
    availableOpportunities: YieldOpportunity[]
  ): Promise<AIDecision> {
    // Filter opportunities for the asset
    const relevantOpportunities = availableOpportunities.filter(
      (opp) => opp.asset === asset
    );

    if (relevantOpportunities.length === 0) {
      throw new Error(`No yield opportunities found for asset: ${asset}`);
    }

    // Calculate risk scores for all opportunities
    const opportunitiesWithRisk = await Promise.all(
      relevantOpportunities.map(async (opp) => {
        const riskScore = await riskService.calculateRiskScore(opp);
        return { opportunity: opp, riskScore };
      })
    );

    // Select best opportunity based on risk-adjusted APY
    const bestOpportunity = opportunitiesWithRisk.reduce((best, current) => {
      const bestAPY = riskService.calculateRiskAdjustedAPY(
        best.opportunity.apy,
        best.riskScore.overall
      );
      const currentAPY = riskService.calculateRiskAdjustedAPY(
        current.opportunity.apy,
        current.riskScore.overall
      );
      return currentAPY > bestAPY ? current : best;
    });

    // Generate decision
    const decision = await this.createDecision({
      userId,
      action: 'ALLOCATE',
      asset,
      amount,
      toProtocol: bestOpportunity.opportunity.protocol,
      opportunity: bestOpportunity.opportunity,
      riskScore: bestOpportunity.riskScore,
      alternatives: opportunitiesWithRisk
        .filter((opp) => opp !== bestOpportunity)
        .map((opp) => opp.opportunity.protocol),
    });

    return decision;
  }

  /**
   * Generate reallocation decision
   */
  async generateReallocationDecision(
    userId: string,
    currentPositions: PortfolioPosition[],
    availableOpportunities: YieldOpportunity[]
  ): Promise<AIDecision | null> {
    // Analyze current positions vs available opportunities
    for (const position of currentPositions) {
      const betterOpportunities = availableOpportunities.filter(
        (opp) =>
          opp.asset === position.asset &&
          opp.apy > position.yieldAPY &&
          opp.protocol !== position.protocol
      );

      if (betterOpportunities.length > 0) {
        // Calculate risk scores
        const opportunitiesWithRisk = await Promise.all(
          betterOpportunities.map(async (opp) => {
            const riskScore = await riskService.calculateRiskScore(opp);
            return { opportunity: opp, riskScore };
          })
        );

        // Find best opportunity
        const bestOpportunity = opportunitiesWithRisk.reduce((best, current) => {
          const bestAPY = riskService.calculateRiskAdjustedAPY(
            best.opportunity.apy,
            best.riskScore.overall
          );
          const currentAPY = riskService.calculateRiskAdjustedAPY(
            current.opportunity.apy,
            current.riskScore.overall
          );
          return currentAPY > bestAPY ? current : best;
        });

        // Check if reallocation is worthwhile (consider gas costs, etc.)
        const currentRiskAdjustedAPY = riskService.calculateRiskAdjustedAPY(
          position.yieldAPY,
          position.riskScore
        );
        const newRiskAdjustedAPY = riskService.calculateRiskAdjustedAPY(
          bestOpportunity.opportunity.apy,
          bestOpportunity.riskScore.overall
        );

        // Only reallocate if improvement is significant (>1% APY difference)
        if (newRiskAdjustedAPY - currentRiskAdjustedAPY > 1) {
          return await this.createDecision({
            userId,
            action: 'REALLOCATE',
            asset: position.asset,
            amount: position.amount,
            fromProtocol: position.protocol,
            toProtocol: bestOpportunity.opportunity.protocol,
            opportunity: bestOpportunity.opportunity,
            riskScore: bestOpportunity.riskScore,
            alternatives: ['HOLD', ...opportunitiesWithRisk.map((opp) => opp.opportunity.protocol)],
          });
        }
      }
    }

    return null; // No reallocation recommended
  }

  /**
   * Create a decision with full explainability
   */
  private async createDecision(params: {
    userId: string;
    action: 'ALLOCATE' | 'REALLOCATE' | 'DEALLOCATE' | 'HOLD';
    asset: string;
    amount: string;
    fromProtocol?: string;
    toProtocol?: string;
    opportunity: YieldOpportunity;
    riskScore: RiskScore;
    alternatives: string[];
  }): Promise<AIDecision> {
    const { userId, action, asset, amount, fromProtocol, toProtocol, opportunity, riskScore, alternatives } = params;

    // Gather data sources
    const dataSources: string[] = [];
    const reasons: string[] = [];

    // FTSO data
    const priceData = ftsoService.getPrice(asset);
    if (priceData) {
      dataSources.push(`FTSO_${asset}_USD`);
      reasons.push(`FTSO detected ${asset} price: $${priceData.price.toFixed(2)}`);
    }

    // FDC attestations
    const attestations = fdcService.getLatestAttestations(asset, 5);
    if (attestations.length > 0) {
      dataSources.push(`FDC_${asset}_attestations`);
      reasons.push(`FDC verified ${attestations.length} recent ${asset} events`);
    }

    // Risk analysis
    reasons.push(`Risk score: ${riskScore.overall.toFixed(2)}/100 (lower is better)`);
    reasons.push(`Protocol TVL: $${opportunity.tvl.toLocaleString()}`);
    reasons.push(`APY: ${opportunity.apy.toFixed(2)}%`);

    // Calculate confidence score (0-10000, where 10000 = 100%)
    const confidenceScore = this.calculateConfidenceScore(opportunity, riskScore);

    const decision: AIDecision = {
      id: uuidv4(),
      timestamp: new Date(),
      action,
      asset: asset as any,
      amount,
      fromProtocol,
      toProtocol,
      confidenceScore,
      reasons,
      dataSources,
      alternatives,
    };

    return decision;
  }

  /**
   * Calculate confidence score for a decision
   */
  private calculateConfidenceScore(opportunity: YieldOpportunity, riskScore: RiskScore): number {
    // Base confidence from risk score (lower risk = higher confidence)
    let confidence = (100 - riskScore.overall) * 100; // Convert to 0-10000 scale

    // Boost confidence for high TVL
    if (opportunity.tvl > 10000000) {
      confidence += 500; // +5%
    } else if (opportunity.tvl > 1000000) {
      confidence += 200; // +2%
    }

    // Boost confidence for FTSO/FDC data availability
    const priceData = ftsoService.getPrice(opportunity.asset);
    if (priceData) {
      confidence += 300; // +3%
    }

    // Cap at 10000 (100%)
    return Math.min(Math.round(confidence), 10000);
  }

  /**
   * Generate human-readable explanation for a decision
   */
  generateExplanation(decision: AIDecision): string {
    const actionText = {
      ALLOCATE: 'allocate',
      REALLOCATE: 'reallocate',
      DEALLOCATE: 'deallocate',
      HOLD: 'hold',
    }[decision.action];

    let explanation = `Recommendation: ${actionText} ${decision.amount} ${decision.asset}`;
    
    if (decision.toProtocol) {
      explanation += ` to ${decision.toProtocol}`;
    }
    
    if (decision.fromProtocol) {
      explanation += ` from ${decision.fromProtocol}`;
    }

    explanation += `\n\nConfidence: ${(decision.confidenceScore / 100).toFixed(2)}%`;
    explanation += `\n\nReasons:\n${decision.reasons.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;
    explanation += `\n\nData Sources: ${decision.dataSources.join(', ')}`;
    
    if (decision.alternatives.length > 0) {
      explanation += `\n\nAlternatives Considered: ${decision.alternatives.join(', ')}`;
    }

    return explanation;
  }
}

export const aiService = new AIService();

