from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
try:
    from pydantic_ai import Agent
except ImportError:
    class Agent:
        def __init__(self, *args, **kwargs): pass
        async def run(self, *args, **kwargs): pass

class AgentDecision(BaseModel):
    agent_id: str
    decision: str = Field(description="approve or reject")
    justification: str
    confidence: float
    risk_score: float

def create_strategy_agent(agent_id: str, strategy_prompt: str) -> Agent:
    return Agent(
        'google-gla:gemini-1.5-flash',

        output_type=AgentDecision,
        system_prompt=(
            f"You are the FLINT {agent_id} Agent. {strategy_prompt} "
            "Evaluate DeFi strategies and provide a clear approve/reject decision."
        )
    )

conservative_agent = create_strategy_agent(
    "Conservative",
    "Your priority is capital preservation and minimizing risk. You only approve high-confidence, low-volatility strategies."
)

neutral_agent = create_strategy_agent(
    "Neutral",
    "Your priority is a balanced risk-reward ratio. You seek stable yields and moderate risk exposure."
)

aggressive_agent = create_strategy_agent(
    "Aggressive",
    "Your priority is maximizing yield. You have a high risk tolerance and are willing to approve more volatile strategies for better returns."
)
