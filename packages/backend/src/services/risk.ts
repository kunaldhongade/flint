import { RiskScore, YieldOpportunity, FTSOPriceData } from '@flint/shared';
import { ftsoService } from './ftso';
import { fdcService } from './fdc';
import { logger } from '../utils/logger';

/**
 * Risk Scoring Service
 * Calculates risk scores for yield opportunities using FTSO and FDC data
 */
class RiskService {
  /**
   * Calculate comprehensive risk score for a yield opportunity
   */
  async calculateRiskScore(opportunity: YieldOpportunity): Promise<RiskScore> {
    const factors: { name: string; score: number; weight: number }[] = [];

    // 1. Smart Contract Risk (based on protocol age, audits, etc.)
    const smartContractRisk = await this.calculateSmartContractRisk(opportunity);
    factors.push({
      name: 'Smart Contract Risk',
      score: smartContractRisk,
      weight: 0.3,
    });

    // 2. Protocol Risk (based on TVL, liquidity, etc.)
    const protocolRisk = await this.calculateProtocolRisk(opportunity);
    factors.push({
      name: 'Protocol Risk',
      score: protocolRisk,
      weight: 0.25,
    });

    // 3. Liquidity Risk (based on TVL and market depth)
    const liquidityRisk = await this.calculateLiquidityRisk(opportunity);
    factors.push({
      name: 'Liquidity Risk',
      score: liquidityRisk,
      weight: 0.2,
    });

    // 4. Market Risk (based on FTSO price volatility)
    const marketRisk = await this.calculateMarketRisk(opportunity);
    factors.push({
      name: 'Market Risk',
      score: marketRisk,
      weight: 0.25,
    });

    // Calculate weighted overall risk score
    const overall = factors.reduce((sum, factor) => {
      return sum + factor.score * factor.weight;
    }, 0);

    return {
      overall: Math.round(overall * 100) / 100, // Round to 2 decimal places
      smartContractRisk,
      protocolRisk,
      liquidityRisk,
      marketRisk,
      factors,
    };
  }

  /**
   * Calculate smart contract risk (0-100, lower is better)
   */
  private async calculateSmartContractRisk(opportunity: YieldOpportunity): Promise<number> {
    // TODO: Integrate with audit databases, protocol age, etc.
    // For now, use a simple heuristic based on TVL
    if (opportunity.tvl > 10000000) {
      return 20; // Low risk for high TVL protocols
    } else if (opportunity.tvl > 1000000) {
      return 40; // Medium risk
    } else {
      return 60; // Higher risk for low TVL
    }
  }

  /**
   * Calculate protocol risk
   */
  private async calculateProtocolRisk(opportunity: YieldOpportunity): Promise<number> {
    // TODO: Analyze protocol metrics, team, governance, etc.
    // Placeholder implementation
    const baseRisk = 30;
    const tvlFactor = Math.min(opportunity.tvl / 10000000, 1); // Normalize TVL
    return baseRisk * (1 - tvlFactor * 0.5); // Lower risk for higher TVL
  }

  /**
   * Calculate liquidity risk
   */
  private async calculateLiquidityRisk(opportunity: YieldOpportunity): Promise<number> {
    // Higher TVL generally means better liquidity
    if (opportunity.tvl > 5000000) {
      return 15; // Low liquidity risk
    } else if (opportunity.tvl > 500000) {
      return 35; // Medium liquidity risk
    } else {
      return 55; // Higher liquidity risk
    }
  }

  /**
   * Calculate market risk based on FTSO price volatility
   */
  private async calculateMarketRisk(opportunity: YieldOpportunity): Promise<number> {
    try {
      const priceData = ftsoService.getPrice(opportunity.asset);
      if (!priceData) {
        return 50; // Default medium risk if no price data
      }

      const volatilityData = await ftsoService.getPriceWithVolatility(opportunity.asset);
      if (!volatilityData) {
        return 50;
      }

      // Convert volatility percentage to risk score (0-100)
      // Higher volatility = higher risk
      const volatility = volatilityData.volatility;
      const riskScore = Math.min(volatility * 500, 100); // Scale volatility to 0-100

      return Math.round(riskScore);
    } catch (error) {
      logger.error('Risk Service: Error calculating market risk', error);
      return 50; // Default medium risk
    }
  }

  /**
   * Calculate risk-adjusted APY
   */
  calculateRiskAdjustedAPY(apy: number, riskScore: number): number {
    // Risk-adjusted APY = APY * (1 - riskScore/100)
    // Higher risk reduces effective APY
    const riskFactor = 1 - riskScore / 100;
    return apy * riskFactor;
  }

  /**
   * Compare risk scores
   */
  compareRiskScores(score1: RiskScore, score2: RiskScore): number {
    // Returns: -1 if score1 < score2, 0 if equal, 1 if score1 > score2
    if (score1.overall < score2.overall) return -1;
    if (score1.overall > score2.overall) return 1;
    return 0;
  }
}

export const riskService = new RiskService();

