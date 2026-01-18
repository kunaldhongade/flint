from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from pydantic_ai import Agent
import os
from dotenv import load_dotenv

load_dotenv()

class PolicyDecision(BaseModel):
    decision: str = Field(description="approve or reject")
    justification: str = Field(description="Human-readable explanation of the decision")
    risk_score: float = Field(description="Normalized risk score (0.0 to 1.0)")
    sector: str = Field(description="The sector this decision belongs to (e.g., Finance, Healthcare)")
    compliance_flags: List[str] = Field(default_factory=list)

class UniversalPolicyAgent:
    """
    A generalized AI agent that evaluates decisions against sector-specific policies.
    """
    def __init__(self):
        self.agent = Agent(
            'google-gla:gemini-2.5-pro',
            output_type=PolicyDecision,
            system_prompt=(
                "You are the FLINT Universal Trust Agent. Your mission is to provide verifiable "
                "risk and compliance evaluations across multiple sectors including Finance and Healthcare. "
                "You must strictly adhere to the provided sector-specific policy guidelines. "
                "Your decisions must be objective, explainable, and based on the provided audit context."
            )
        )

    async def evaluate(self, sector: str, context: Dict[str, Any], policy_rules: str) -> PolicyDecision:
        """
        Evaluates a request based on sector and specific policy rules.
        """
        prompt = f"""
        Sector: {sector}
        
        Evaluation Context:
        {context}
        
        Policy Rules to Enforce:
        {policy_rules}
        
        Provide a detailed evaluation and decision.
        """
        
        # Simulation fallback for development
        if not os.getenv("GOOGLE_API_KEY"):
            return PolicyDecision(
                decision="approve",
                justification=f"Simulated approval for {sector}. Policy rules were analyzed (Audit mode).",
                risk_score=0.15,
                sector=sector,
                compliance_flags=["SIMULATED_DATA_INTEGRITY"]
            )

        result = await self.agent.run(prompt)
        return result.data

universal_trust_agent = UniversalPolicyAgent()
