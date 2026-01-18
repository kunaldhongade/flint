import asyncio
import os
import json
import sys
from typing import Dict, Any

# Ensure we can import from src
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "packages", "ai"))

from src.agent import risk_agent
from src.attestation import attestation_service

async def run_m1_demo():
    print("=== FLINT Milestone 1: Risk & Policy Agent Demo ===")
    
    # Sample Strategy
    strategy = "High-Yield Lending on Kinetic (FLR/USD)"
    
    # Mock Portfolio
    portfolio = {
        "balance_flr": 100000,
        "active_strategies": 2,
        "risk_tolerance": "medium"
    }
    
    # Mock Market Data (FTSO simulated if Flare Kit tool is in simulation mode)
    market_data = {
        "volatility_24h": "high",
        "liquidity_usd": 5000000
    }
    
    print(f"\nEvaluating Strategy: {strategy}")
    print(f"Context: {json.dumps(portfolio, indent=2)}")
    
    # 1. Run Agent Evaluation
    try:
        decision_result = await risk_agent.evaluate_strategy(strategy, portfolio, market_data)
        print("\n--- Agent Result (PydanticAI) ---")
        print(json.dumps(decision_result.model_dump(), indent=2))
        
        # 2. Generate TEE Attestation
        print("\nGenerating TEE Attestation (Flare AI Kit vTPM)...")
        attestation = attestation_service.generate_attestation(decision_result.model_dump())
        
        print("\n--- Verifiable Attestation Package ---")
        print(f"Timestamp: {attestation['timestamp']}")
        print(f"TEE Provider: {attestation['tee_provider']}")
        print(f"Decision Hash (to be bound to quote): {attestation['quote']['report_data_hash']}")
        print(f"Certification Status: {attestation['certification']['status']}")
        
        print("\n[SUCCESS] Milestone 1 Demonstration Complete.")
        
    except Exception as e:
        print(f"\n[ERROR] Demo failed: {e}")

if __name__ == "__main__":
    asyncio.run(run_m1_demo())
