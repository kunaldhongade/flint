from pydantic import BaseModel, Field
from typing import List, Dict, Any
from pydantic_ai import Agent
from lib.flare_ai_kit.common.exceptions import SecurityViolationError
import os
from dotenv import load_dotenv

load_dotenv()

class ChaosEvaluation(BaseModel):
    is_robust: bool = Field(description="True if the decision survives stress testing")
    stress_results: List[str] = Field(description="Details of simulated adversarial scenarios")
    adversarial_score: float = Field(description="0.0 to 1.0 (higher means more robust)")

class ChaosVerificationAgent:
    """
    Inspired by ChaosChain's decentralized verification and stress testing patterns.
    This agent 'attacks' the primary decision to ensure regulatory robustness.
    """
    def __init__(self):
        self.agent = Agent(
            'google-gla:gemini-2.5-pro',
            output_type=ChaosEvaluation,
            system_prompt=(
                "You are the FLINT Chaos Verification Agent. Your job is to perform 'Chaos Engineering' "
                "on AI decisions. You simulate adversarial market conditions, data corruption, and "
                "regulatory edge cases to see if the primary decision holds up. "
                "This is required for high-integrity compliance (MiCA/HIPAA)."
            )
        )

    async def stress_test(self, primary_decision: Dict[str, Any], context: Dict[str, Any]) -> ChaosEvaluation:
        """
        Runs a stress test on a decision.
        """
        prompt = f"""
        Evaluate this decision for robustness:
        Decision: {primary_decision}
        Context: {context}
        
        Simulate these ChaosChain-inspired scenarios:
        1. Extreme FTSO price volatility (+50%/-50% in 1 minute).
        2. FDC attestation delay/failure.
        3. Adversarial data injection in the evaluation context.
        """
        
        if not os.getenv("GOOGLE_API_KEY") or "dummy" in (os.getenv("GOOGLE_API_KEY") or ""):
            raise SecurityViolationError("Valid Google Gemini API key is required for execution. Fallback/Simulation is DISALLOWED.")

        result = await self.agent.run(prompt)
        return result.data

chaos_agent = ChaosVerificationAgent()
