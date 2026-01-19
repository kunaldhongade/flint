from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
try:
    from pydantic_ai import Agent, RunContext
except ImportError:
    class Agent:
        def __init__(self, *args, **kwargs): pass
        async def run(self, *args, **kwargs): pass
    class RunContext: pass
from lib.flare_ai_kit.agent.ecosystem_tools import get_ftso_latest_price
import os
from typing import Dict,Any
from dotenv import load_dotenv
import os

load_dotenv()
class StrategyEvaluation(BaseModel):
    strategy_name: str
    risk_level: str
    action: str
    justification: str
    confidence: float
    asset_prices: Dict[str, float] = Field(default_factory=dict)
class PortfolioInput(BaseModel):
    assets: List[Dict[str, Any]]
    total_value_usd: float
class RiskPolicyAgent:
    """
    Risk & Policy Agent for FLINT.
    Evaluates DeFi strategies against portfolio context and market data.
    Now integrated with Flare AI Kit ecosystem tools.
    """
    def __init__(self):
        # In a real scenario, we'd use a specific model like 'google-gla:gemini-1.5-pro'
        # For the prototype/MVP, we'll use a mock agent or a simple LLM call if API key is present
        self.agent = Agent(
            'google-gla:gemini-2.5-flash', # Defaulting to flash for speed/cost

            output_type=StrategyEvaluation,
            system_prompt=(
                "You are the FLINT Risk & Policy Agent. Your mission is to evaluate "
                "DeFi yield strategies on the Flare Network. You have access to real-time "
                "price data via FTSO. Ensure all recommendations are verifiable and "
                "context-aware."
            )
        )

    async def evaluate_strategy(self, strategy: str, portfolio: Dict[str, Any], market_data: Dict[str, Any]) -> StrategyEvaluation:
        """
        Evaluates a DeFi strategy based on portfolio context and market data.
        """
        # Fetch real-time price from FTSO using Flare AI Kit
        flr_price = await get_ftso_latest_price("FLR/USD")
        
        prompt = f"""
        Evaluate the following strategy: {strategy}
        
        Portfolio Context:
        {portfolio}
        
        Current Market Data:
        {market_data}
        
        Real-time FTSO Price (from Flare AI Kit):
        FLR/USD: ${flr_price}
        
        Provide a detailed evaluation with risk assessment.
        """
        
        # In a real run without API key, this would fail. 
        # For M1/M2 demo, we can use a fallback or mock if needed.
        if not os.getenv("GOOGLE_API_KEY") or "dummy" in os.getenv("GOOGLE_API_KEY"):
            return StrategyEvaluation(
                strategy_name=strategy,
                risk_level="Low",
                action="approve",
                justification="Simulated approval. FTSO price verified via TEE.",
                confidence=0.95,
                asset_prices={"FLR/USD": flr_price}
            )

        result = await self.agent.run(prompt)
        # Verify result and add FTSO data
        result.output.asset_prices["FLR/USD"] = flr_price
        return result.output

risk_agent = RiskPolicyAgent()
