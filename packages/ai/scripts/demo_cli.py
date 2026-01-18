import asyncio
import httpx
import json

async def run_demo():
    print("=== FLINT Verifiable AI Agent Demo ===")
    
    async with httpx.AsyncClient() as client:
        # 1. Health Check
        print("\n[1] Checking AI Layer Health...")
        try:
            resp = await client.get("http://localhost:8080/health")
            print(f"Health: {json.dumps(resp.json(), indent=2)}")
        except Exception as e:
            print(f"Error: {e}. (Make sure the server is running on :8080)")
            return

        # 2. Strategy Decision with Consensus
        print("\n[2] Triggering Multi-Agent Consensus Decision...")
        payload = {
            "strategy_name": "Conservative FLR Staking",
            "portfolio": {"FLR": 10000, "USDT": 500},
            "market_data": {"volatility": "low", "trend": "stable"}
        }
        resp = await client.post("http://localhost:8080/consensus-decide", json=payload)
        decision = resp.json()
        print(f"Consensus Decision: {decision['decision']['final_decision']}")
        print(f"Attestation Hash: {decision['decision_id']}")
        
        # 3. Verification
        print(f"\n[3] Verifying Decision via API (/v1/verify-decision/{decision['decision_id']})...")
        v_resp = await client.get(f"http://localhost:8080/v1/verify-decision/{decision['decision_id']}")
        print(f"Verification Result: {v_resp.json()['status']}")

        # 4. Prohibited Strategy (Policy Override Test)
        print("\n[4] Testing Prohibited Strategy (High Concentration Risk)...")
        prohibited_payload = {
            "strategy_name": "Go All-In on high risk assets",
            "portfolio": {"FLR": 1000000},
            "market_data": {"volatility": "high"}
        }
        resp = await client.post("http://localhost:8080/consensus-decide", json=prohibited_payload)
        p_decision = resp.json()
        print(f"Decision: {p_decision['decision']['final_decision']}")
        print(f"Method: {p_decision['decision']['method']}")
        print(f"Compliance Status: {p_decision['decision']['compliance_status']}")

    print("\n=== Demo Complete ===")

if __name__ == "__main__":
    asyncio.run(run_demo())
