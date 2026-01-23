import asyncio
import json
import os
import time
from typing import Any, Dict, List

import google.generativeai as genai
from web3 import Web3

# Whitelist of allowed models
ALLOWED_MODELS = {
    "gemini-2.5-flash",
    "gemini-2.5-pro", 
    "gemini-2.5-vision",
    "gemini-3.0-flash",
    "gemini-3.0-pro",
    "gemini-3.5-ultra"
}

class ModelExecutionResult:
    def __init__(self, model_id: str, role: str, prompt_hash: str, response_text: str, structured_decision: Any, timestamp_start: float, timestamp_end: float):
        self.model_id = model_id
        self.role = role
        self.prompt_hash = prompt_hash
        self.response_text = response_text
        self.structured_decision = structured_decision
        self.timestamp_start = timestamp_start
        self.timestamp_end = timestamp_end

    def to_dict(self) -> Dict[str, Any]:
        return {
            "model_id": self.model_id,
            "role": self.role,
            "prompt_hash": self.prompt_hash,
            "response_text": self.response_text,
            "structured_decision": self.structured_decision,
            "timestamp_start": self.timestamp_start,
            "timestamp_end": self.timestamp_end
        }

async def execute_model(model_id: str, prompt: str, api_key: str) -> Dict[str, Any]:
    """
    Executes a single Gemini model.
    """
    timestamp_start = time.time()
    
    # Configure API
    genai.configure(api_key=api_key)
    
    # Simple role mapping based on model capability
    role = "Neutral"
    if "flash" in model_id:
        role = "Conservative" # Fast models as conservative
    elif "pro" in model_id or "ultra" in model_id:
        role = "Aggressive" # Smarter models as aggressive/creative
    elif "vision" in model_id:
        role = "Observer"

    prompt_hash = Web3.keccak(text=prompt).hex()

    try:
        model = genai.GenerativeModel(model_id)
        response = await model.generate_content_async(prompt)
        response_text = response.text
        
        # simulated structured decision for now since prompt didn't strictly request JSON
        structured_decision = {
            "action": "unknown",
            "confidence": 0.9 if "pro" in model_id else 0.7
        }

    except Exception as e:
        response_text = f"Error executing model {model_id}: {str(e)}"
        structured_decision = {"error": str(e)}

    timestamp_end = time.time()

    return ModelExecutionResult(
        model_id=model_id,
        role=role,
        prompt_hash=prompt_hash,
        response_text=response_text,
        structured_decision=structured_decision,
        timestamp_start=timestamp_start,
        timestamp_end=timestamp_end
    ).to_dict()

async def execute_selected_models(selected_models: List[str], prompt: str, api_key: str | None = None) -> List[Dict[str, Any]]:
    """
    Executes the list of selected models.
    """
    if not api_key:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment")

    # Strict Validation
    if not selected_models:
        raise ValueError("No models selected for execution.")
    
    valid_models = []
    for m in selected_models:
        if m in ALLOWED_MODELS:
            valid_models.append(m)
        else:
            print(f"Warning: Skipping unauthorized model {m}")
    
    if not valid_models:
         raise ValueError("No valid models selected.")

    # Execute in parallel
    tasks = [execute_model(model_id, prompt, api_key) for model_id in valid_models]
    results = await asyncio.gather(*tasks)
    
    return results
