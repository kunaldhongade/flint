from pydantic import BaseModel, Field
from typing import List, Optional
from pydantic_ai import Agent, RunContext
import os

class RiskPolicyResponse(BaseModel):
    decision: str = Field(description="approve or reject")
    reasons: List[str] = Field(description="List of reasons for the decision")
    risk_score: float = Field(description="Risk score from 0.0 to 1.0")
    policy_violations: List[str] = Field(default_factory=list)

class PortfolioInput(BaseModel):
    assets: List[Dict[str, Any]]
    total_value_usd: float

class RiskPolicyAgent:
    def __init__(self):
        # In a real scenario, we'd use a specific model like 'google-gla:gemini-1.5-pro'
        # For the prototype/MVP, we'll use a mock agent or a simple LLM call if API key is present
        self.agent = Agent(
            'google-gla:gemini-1.5-flash', # Defaulting to flash for speed/cost
            result_type=RiskPolicyResponse,
            system_prompt=(
                "You are the FLINT Risk & Policy Agent. Your job is to evaluate DeFi yield strategies "
                "against institutional risk policies. You must provide a clear 'approve' or 'reject' "
                "decision, a risk score, and detailed reasons. Evaluate based on volatility, "
                "liquidity (using FDC data if provided), and price stability (using FTSO feeds)."
            )
        )

    async def evaluate_strategy(self, strategy_name: str, portfolio: Dict[str, Any], market_data: Dict[str, Any]) -> RiskPolicyResponse:
        """
        Evaluates a DeFi strategy based on portfolio context and market data.
        """
        prompt = f"""
        Evaluate the following strategy: {strategy_name}
        
        Portfolio Context:
        {portfolio}
        
        Market Data (FTSO/FDC):
        {market_data}
        
        Provide your decision based on the current market conditions and risk thresholds.
        """
        
        # In a real run without API key, this would fail. 
        # For M1/M2 demo, we can use a fallback or mock if needed.
        if not os.getenv("GEMINI_API_KEY"):
            return RiskPolicyResponse(
                decision="approve",
                reasons=["Simulated approval: Gemini API key missing", "Market data looks stable"],
                risk_score=0.2,
                policy_violations=[]
            )

        result = await self.agent.run(prompt)
        return result.data

risk_agent = RiskPolicyAgent()
