import hashlib
import json
import os
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from pydantic_ai import Agent
from lib.flare_ai_kit.common.exceptions import SecurityViolationError
from dotenv import load_dotenv

load_dotenv()

class PolicyDecision(BaseModel):
    decision: str = Field(description="approve or reject")
    justification: str = Field(description="Human-readable explanation of the decision")
    risk_score: float = Field(description="Normalized risk score (0.0 to 1.0)")
    sector: str = Field(description="The sector this decision belongs to (e.g., Finance, Healthcare)")
    compliance_flags: List[str] = Field(default_factory=list)
    reputation_hash: Optional[str] = Field(None, description="ChaosChain-compatible computation hash")

class UniversalPolicyAgent:
    """
    A generalized AI agent that evaluates decisions against sector-specific policies.
    Now integrated with ChaosChain Reputation patterns.
    """
    def __init__(self):
        self.agent = Agent(
            'google-gla:gemini-2.5-pro',
            output_type=PolicyDecision,
            system_prompt=(
                "You are the FLINT Universal Trust Agent. Your mission is to provide verifiable "
                "risk and compliance evaluations. You operate inside a Flare TEE. "
                "Every decision you make must be robust, as it will be recorded "
                "in your ChaosChain reputation profile."
            )
        )

    async def evaluate(self, sector: str, context: Dict[str, Any], policy_rules: str) -> PolicyDecision:
        """
        Evaluates a request based on sector and specific policy rules.
        """
        prompt = f"""
        Sector: {sector}
        Evaluation Context: {context}
        Policy Rules to Enforce: {policy_rules}
        
        Provide a detailed evaluation and decision.
        """
        
        if not os.getenv("GOOGLE_API_KEY") or "dummy" in (os.getenv("GOOGLE_API_KEY") or ""):
            raise SecurityViolationError("Valid Google Gemini API key is required for execution. Fallback/Simulation is DISALLOWED.")

        result = await self.agent.run(prompt)
        decision = result.data

        # Calculate ChaosChain Reputation Hash (ERC-8004 Pattern)
        # This hash binds the input context and the output decision for audit trails.
        audit_trail = {
            "context_hash": hashlib.sha256(json.dumps(context, sort_keys=True).encode()).hexdigest(),
            "decision_hash": hashlib.sha256(json.dumps(decision.model_dump(), sort_keys=True).encode()).hexdigest()
        }
        decision.reputation_hash = hashlib.sha256(json.dumps(audit_trail, sort_keys=True).encode()).hexdigest()
        
        return decision

universal_trust_agent = UniversalPolicyAgent()
