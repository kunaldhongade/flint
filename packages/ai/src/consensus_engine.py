import hashlib
import os
import asyncio
from typing import Dict, Any, List
from consensus_agents import conservative_agent, neutral_agent, aggressive_agent, AgentDecision
from lib.flare_ai_kit.common.schemas import Prediction
from lib.flare_ai_kit.consensus.aggregator.strategies import majority_vote

class PolicyEngine:
    """
    Augmented Smart Contract Engine (ASCE) local implementation.
    Enforces real-time ethical guardrails.
    """
    def check_compliance(self, task: str, decision: str, confidence: float) -> tuple[bool, str]:
        # Industry-grade safety check: prohibit extremely high-risk actions without manual review
        if "all-in" in task.lower() or "100%" in task.lower():
            return False, "PROHIBITED: High-concentration risk detected. Manual override required."
        
        # Minimum confidence threshold for industry execution
        if confidence < 0.7:
            return False, "REJECTED: Confidence score below safety threshold (70%)."
        
        return True, "COMPLIANT"

def calculate_model_cid():
    """Model Registry and Integrity System (MRIS) simulation."""
    # In production, this would be a hash of the container/model binary
    # Here we hash the core agent files to ensure code integrity
    core_files = ["packages/ai/src/agent.py", "packages/ai/src/consensus_agents.py"]
    hasher = hashlib.sha256()
    
    for file_path in core_files:
        try:
            with open(file_path, "rb") as f:
                hasher.update(f.read())
        except FileNotFoundError:
             # Fail-close if integrity files missing
            raise RuntimeError(f"Integrity check failed: {file_path} not found")

    return f"bgl_{hasher.hexdigest()[:16]}"


class ConsensusEngine:
    def __init__(self):
        self.agents = {
            "conservative": conservative_agent,
            "neutral": neutral_agent,
            "aggressive": aggressive_agent
        }
        self.policy_engine = PolicyEngine()
        self.model_cid = calculate_model_cid()

    async def run_consensus(self, task: str) -> Dict[str, Any]:
        """
        Runs the target task through three independent agents and reaches a consensus.
        """
        if not os.getenv("GOOGLE_API_KEY"):
            raise ValueError("Consensus Engine: GOOGLE_API_KEY Missing. Mocks are not allowed in staging.")

        # Run agents in parallel
        tasks = [agent.run(task) for agent in self.agents.values()]
        agent_results = await asyncio.gather(*tasks)
        results = [r.data for r in agent_results]

        # Convert to Flare AI Kit Predictions
        print("DEBUG: Creating predictions")
        predictions = [
            Prediction(agent_id=r.agent_id, prediction=r.decision, confidence=r.confidence)
            for r in results
        ]
        print(f"DEBUG: Predictions created: {predictions}")

        # Use Flare AI Kit's majority vote
        print("DEBUG: Running majority_vote")
        final_decision = majority_vote(predictions)
        print(f"DEBUG: Majority vote result: {final_decision}")

        # Policy Interception (ASCE)
        overall_confidence = sum(p.confidence for p in predictions) / len(predictions)
        is_compliant, policy_result = self.policy_engine.check_compliance(task, final_decision, overall_confidence)

        if not is_compliant:
            final_decision = "reject"
            method = f"policy_override: {policy_result}"
        else:
            method = "majority_vote"

        return {
            "final_decision": final_decision,
            "individual_decisions": [r.model_dump() for r in results],
            "consensus_reached": True,
            "method": method,
            "model_cid": self.model_cid,
            "compliance_status": "PASS" if is_compliant else "FAIL",
            "xai_trace": {
                "feature_importance": [
                    {"agent": r.agent_id, "score": r.confidence, "reason": r.justification}
                    for r in results
                ],
                "governance_override": not is_compliant
            }
        }

consensus_engine = ConsensusEngine()
