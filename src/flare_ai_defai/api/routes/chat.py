"""
Chat Router Module

This module implements the main chat routing system for the AI Agent API.
It handles message routing, blockchain interactions, attestations, and AI responses.

The module provides a ChatRouter class that integrates various services:
- AI capabilities through GeminiProvider
- Blockchain operations through FlareProvider
- Attestation services through Vtpm
- Prompt management through PromptService
"""

import json
import os
import re
from typing import Any, Dict, List

import structlog
from fastapi import APIRouter, HTTPException, Request, UploadFile
from pydantic import BaseModel, Field
from web3 import Web3

from flare_ai_defai.ai import GeminiProvider
from flare_ai_defai.attestation import Vtpm
from flare_ai_defai.blockchain.blazeswap import BlazeSwapHandler
from flare_ai_defai.blockchain.flare import FlareProvider
from flare_ai_defai.blockchain.sflr_staking import (
    SFLR_CONTRACT_ADDRESS,
    parse_stake_command,
    stake_flr_to_sflr,
)
from flare_ai_defai.blockchain.ftso_context import get_ftso_context
from flare_ai_defai.prompts import PromptService, SemanticRouterResponse
from flare_ai_defai.interceptor import DecisionInterceptor

logger = structlog.get_logger(__name__)
router = APIRouter()

# Constants
HTTP_500_ERROR = "Internal server error occurred"
WALLET_NOT_CONNECTED = "Please connect your wallet first"
BALANCE_CHECK_ERROR = "Error checking balance"
SWAP_ERROR = "Error preparing swap"
CROSS_CHAIN_ERROR = "Error preparing cross-chain swap"
PROCESSING_ERROR = (
    "Sorry, there was an error processing your request. Please try again."
)
NO_ROUTES_ERROR = "No valid routes found for this swap. This might be due to insufficient liquidity or temporary issues."
STAKING_ERROR = "Error preparing staking transaction"


class ChatMessage(BaseModel):
    """
    Pydantic model for chat message validation.

    Attributes:
        message (str): The chat message content, must not be empty
        image (UploadFile | None): Optional image file upload
    """

    message: str = Field(..., min_length=1)
    image: UploadFile | None = None


class ChatResponse(BaseModel):
    """Dynamic chat response model that can accept any JSON format"""

    class Config:
        arbitrary_types_allowed = True
        extra = "allow"


class PortfolioAnalysisResponse(BaseModel):
    """Portfolio analysis response model"""

    risk_score: float
    text: str


class ConnectWalletRequest(BaseModel):
    """Request model for wallet connection."""

    address: str


class ChatRouter:
    """
    Main router class handling chat messages and their routing to appropriate handlers.

    This class integrates various services and provides routing logic for different
    types of chat messages including blockchain operations, attestations, and general
    conversation.

    Attributes:
        ai (GeminiProvider): Provider for AI capabilities
        blockchain (FlareProvider): Provider for blockchain operations
        attestation (Vtpm): Provider for attestation services
        prompts (PromptService): Service for managing prompts
        logger (BoundLogger): Structured logger for the chat router
    """

    def __init__(
        self,
        ai: GeminiProvider,
        blockchain: FlareProvider,
        attestation: Vtpm,
        prompts: PromptService,
    ) -> None:
        """
        Initialize the ChatRouter with required service providers.

        Args:
            ai: Provider for AI capabilities
            blockchain: Provider for blockchain operations
            attestation: Provider for attestation services
            prompts: Service for managing prompts
        """
        self._router = APIRouter()
        self.ai = ai
        self.blockchain = blockchain
        self.attestation = attestation
        self.prompts = prompts
        self.logger = logger.bind(router="chat")

        # Get Web3 provider URL from environment
        web3_provider_url = os.getenv(
            "WEB3_PROVIDER_URL", "https://flare-api.flare.network/ext/C/rpc"
        )

        # Initialize BlazeSwap handler with provider URL from environment
        # Initialize BlazeSwap handler with provider URL from environment
        self.blazeswap = BlazeSwapHandler(web3_provider_url)
        self.interceptor = DecisionInterceptor()
        
        # Mapping from session_id to stateful decision_id
        self.session_decisions: dict[str, Any] = {}
        
        self._setup_routes()

    def _setup_routes(self) -> None:
        """
        Set up FastAPI routes for the chat endpoint.
        Handles message routing, command processing, and transaction confirmations.
        """

        @self._router.post("/")
        async def chat(request: Request) -> ChatResponse | PortfolioAnalysisResponse:
            """
            Handle chat messages.
            """
            try:
                # Use form data to support file uploads
                data = await request.form()
                message_text = data.get("message", "")
                wallet_address = data.get("walletAddress")
                session_id = data.get("sessionId")
                image = data.get("image")  # This will be an UploadFile if provided
                
                # Extract selected models
                selected_models_raw = data.get("selectedModels")
                selected_models = []
                if selected_models_raw:
                    try:
                        selected_models = json.loads(selected_models_raw)
                    except json.JSONDecodeError:
                        pass # Ignore if not valid JSON

                if not message_text:
                    return {"response": "Message cannot be empty"}

                # Initialize action source and response
                ai_action = "CONVERSATIONAL"
                handler_response = {}

                # --- EXPLICIT MODEL EXECUTION BRANCH ---
                if selected_models and isinstance(selected_models, list) and len(selected_models) > 0:
                    from flare_ai_defai.ai.user_selected_model_executor import execute_selected_models
                    
                    # 1. RAG: Retrieve context for the user message
                    retrieved_docs = await self.ai.rag_processor.retrieve_relevant_docs(query=message_text)
                    
                    # 2. RAG: Augment the prompt with context
                    augmented_prompt = self.ai.rag_processor.augment_prompt(
                        query=message_text, retrieved_docs=retrieved_docs
                    )
                    
                    # Execute selected models concurrently with augmented prompt
                    model_results = await execute_selected_models(selected_models, augmented_prompt)
                    
                    # Format as agent votes for the frontend to display
                    agent_votes = []
                    for res in model_results:
                        agent_votes.append({
                            "name": res["model_id"],
                            "role": res["role"],
                            "decision": "approve", # Default for now
                            "reason": res["response_text"]
                        })
                    
                    # We pick one "main" response to show in the bubble
                    main_response = f"I've consulted {len(model_results)} specialized agents regarding your request about Flare. Based on the retrieved documentation, here is the consensus analysis."
                    if len(model_results) == 1:
                        main_response = model_results[0]["response_text"]

                    handler_response = {
                        "response": main_response,
                        "agent_votes": agent_votes
                    }
                # ----------------------------------------

                # If an image/file is provided, handle it
                elif image is not None:
                    file_data = await image.read()
                    mime_type = image.content_type or "application/octet-stream"

                    # Special handling for portfolio analysis (still requires image conceptually)
                    if message_text == "analyze-portfolio":
                        # Get portfolio analysis prompt
                        prompt, _, schema = self.prompts.get_formatted_prompt(
                            "portfolio_analysis"
                        )

                        # Send message with file using AI
                        response = await self.ai.send_message_with_attachment(
                            prompt,
                            file_data,
                            mime_type,
                        )

                        # Parse and validate response
                        try:
                            # Try to extract JSON from the text response
                            # Look for JSON structure in the response text
                            response_text = response.text
                            start_idx = response_text.find("{")
                            end_idx = response_text.rfind("}") + 1

                            if start_idx >= 0 and end_idx > start_idx:
                                json_str = response_text[start_idx:end_idx]
                                analysis = json.loads(json_str)
                            else:
                                raise ValueError("No JSON structure found in response")

                            # Validate required fields
                            if "risk_score" not in analysis or "text" not in analysis:
                                raise ValueError(
                                    "Missing required fields in analysis response"
                                )

                            # Convert and validate risk score
                            risk_score = float(analysis["risk_score"])
                            if not (1 <= risk_score <= 10):
                                raise ValueError("Risk score must be between 1 and 10")

                            return PortfolioAnalysisResponse(
                                risk_score=risk_score, text=analysis["text"]
                            )
                        except (json.JSONDecodeError, ValueError) as e:
                            self.logger.error("portfolio_analysis_failed", error=str(e))
                            return PortfolioAnalysisResponse(
                                risk_score=5.0,  # Default moderate risk
                                text="Sorry, I was unable to properly analyze the portfolio image. Please try again.",
                            )

                    # Default file handling
                    else:
                        response = await self.ai.send_message_with_attachment(
                            message_text, file_data, mime_type, session_id=session_id
                        )
                        handler_response = {"response": response.text}

                # --- STANDARD COMMANDS / SEMANTIC ROUTING ---
                if not handler_response:
                    # Update the blockchain provider with the wallet address if provided
                    if wallet_address:
                        self.blockchain.address = wallet_address

                    # Check for direct commands first
                    words = message_text.lower().split()
                    if words:
                        command = words[0]
                        # Map commands to actions
                        command_map = {
                            "swap": "SWAP",
                            "balance": "CHECK_BALANCE",
                            "check": "CHECK_BALANCE", 
                            "send": "SEND",
                            "stake": "STAKE",
                            "pool": "POOL",
                            "risk": "RISK",
                            "attest": "ATTEST",
                            "help": "HELP"
                        }

                        if command == "perp":
                             handler_response = {
                                "response": "Perpetuals trading is not supported. Please use BlazeSwap for token swaps."
                            }
                        elif command == "universal":
                             handler_response = {
                                "response": "Universal router swaps have been removed. Please use 'swap' command for BlazeSwap trading."
                            }
                        elif command in command_map:
                            ai_action = command_map[command]
                            # Dispatch to strict handler
                            if command == "swap":
                                handler_response = await self.handle_swap_token(message_text)
                            elif command in ["balance", "check"]:
                                handler_response = await self.handle_balance_check(message_text)
                            elif command == "send":
                                handler_response = await self.handle_send_token(message_text)
                            elif command == "stake":
                                handler_response = await self.handle_stake_command(message_text)
                            elif command == "pool":
                                handler_response = await self.handle_add_liquidity(message_text)
                            elif command == "risk":
                                handler_response = await self.handle_risk_assessment(message_text)
                            elif command == "attest":
                                handler_response = await self.handle_attestation(message_text)
                            elif command == "help":
                                handler_response = await self.handle_help_command()
                    
                    # If no direct command served, use semantic routing
                    if not handler_response:
                        prompt, mime_type, schema = self.prompts.get_formatted_prompt(
                            "semantic_router", user_input=message_text
                        )
                        route_response = self.ai.generate(
                            prompt=prompt, response_mime_type=mime_type, response_schema=schema,
                            session_id=session_id
                        )
                        route = SemanticRouterResponse(route_response.text.strip())
                        ai_action = route.value
                        handler_response = await self.route_message(route, message_text, session_id=session_id)

                # --- INTERCEPTION POINT ---
                if "response" in handler_response:
                    try:
                        # Fetch FTSO context if relevant
                        ftso_data = {"ftso_feed_id": None, "ftso_round_id": None}
                        if str(ai_action) in ["SWAP", "STAKE", "POOL", "SEND"]:
                             # Heuristic: Default to FLR context if relevant action, or look for token
                             target_token = "FLR"
                             # Simple check for other tokens
                             for t in ["WC2FLR", "WETH", "BTC", "USDT"]:
                                 if t in message_text.upper():
                                     target_token = t
                                     break
                             ftso_data = await get_ftso_context(self.blockchain, target_token)

                        # Maintain stable decision_id per session
                        stable_decision_id = None
                        if session_id:
                            if session_id not in self.session_decisions:
                                from uuid import uuid4
                                self.session_decisions[session_id] = uuid4()
                            stable_decision_id = self.session_decisions[session_id]

                        decision_packet = self.interceptor.intercept(
                            wallet_address=wallet_address or "0x0000000000000000000000000000000000000000",
                            ai_action=str(ai_action),
                            user_input=message_text,
                            ai_response_text=handler_response["response"],
                            transaction_data=handler_response.get("transaction"),
                            model_id=selected_models[0] if selected_models else "gemini-1.5-flash",
                            ftso_feed_id=ftso_data.get("ftso_feed_id"),
                            ftso_round_id=ftso_data.get("ftso_round_id"),
                            decision_id=stable_decision_id
                        )
                        # Attach packet to response
                        handler_response["decision_packet"] = decision_packet.model_dump()
                        from flare_ai_defai.settings import settings
                        handler_response["decision_logger_address"] = settings.decision_logger_address
                    except Exception as e:
                        self.logger.error("interceptor_failed", error=str(e))
                        # Fail open or closed? For PoC, log and proceed.
                
                # Generate follow-up suggestions
                if "response" in handler_response:
                    suggestions = await self.get_suggestions(handler_response["response"])
                    if suggestions:
                        handler_response["suggestions"] = suggestions

                return handler_response

            except Exception as e:
                self.logger.error("message_handling_failed", error=str(e))
                return {"response": PROCESSING_ERROR}

        @self._router.post("/connect_wallet")
        async def connect_wallet(request: ConnectWalletRequest):
            """Connect wallet endpoint"""
            try:
                # Get network configuration
                network_config = await self.blockchain.get_network_config()

                # Get wallet balance
                balance = await self.blockchain.get_balance(request.address)

                return {
                    "status": "success",
                    "balance": balance,
                    "network": network_config,
                    "message": f"Your wallet ({request.address}) has:\n{balance} {self.blockchain.native_symbol}",
                }
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        @self._router.post("/confirm_decision")
        async def confirm_decision(request: Request) -> Dict[str, str]:
            """
            Log the final user decision and workflow to IPFS.
            """
            try:
                data = await request.json()
                trail_data = data.get("decision_trail")
                
                if not trail_data:
                     raise HTTPException(status_code=400, detail="Missing decision_trail")

                from flare_ai_defai.attestation.pinata_logger import pinata_logger
                
                # Upload to Pinata
                cid, cid_hash = pinata_logger.upload_decision_trail(trail_data)
                
                if not cid:
                    return {"status": "skipped", "message": "Logging skipped (missing config or error)"}

                return {
                    "status": "success", 
                    "ipfs_cid": cid, 
                    "cid_hash": cid_hash
                }

            except Exception as e:
                self.logger.error("confirm_decision_failed", error=str(e))
                raise HTTPException(status_code=500, detail=str(e))

    @property
    def router(self) -> APIRouter:
        """Get the FastAPI router with registered routes."""
        return self._router

    async def handle_command(self, command: str) -> dict[str, str]:
        """
        Handle special command messages starting with '/'.

        Args:
            command: Command string to process

        Returns:
            dict[str, str]: Response containing command result
        """
        if command == "/reset":
            self.blockchain.reset()
            self.ai.reset()
            return {"response": "Reset complete"}
        return {"response": "Unknown command"}

    async def get_semantic_route(self, message: str) -> SemanticRouterResponse:
        """
        Determine the semantic route for a message using AI provider.

        Args:
            message: Message to route

        Returns:
            SemanticRouterResponse: Determined route for the message
        """
        try:
            prompt, mime_type, schema = self.prompts.get_formatted_prompt(
                "semantic_router", user_input=message
            )
            route_response = self.ai.generate(
                prompt=prompt, response_mime_type=mime_type, response_schema=schema
            )
            return SemanticRouterResponse(route_response.text.strip())
        except Exception as e:
            self.logger.exception("routing_failed", error=str(e))
            return SemanticRouterResponse.CONVERSATIONAL

    async def get_suggestions(self, ai_response: str) -> list[str]:
        """
        Generate dynamic suggestions based on the AI response.
        """
        try:
            prompt, mime_type, _ = self.prompts.get_formatted_prompt(
                "suggestions_generator", ai_response=ai_response, context=""
            )
            response = self.ai.generate(
                prompt=prompt, response_mime_type=mime_type
            )
            import json
            suggestions = json.loads(response.text)
            return suggestions if isinstance(suggestions, list) else []
        except Exception as e:
            self.logger.error("suggestions_failed", error=str(e))
            return []

    async def route_message(
        self, route: SemanticRouterResponse, message: str, session_id: str | None = None
    ) -> dict[str, str]:
        """
        Route a message to the appropriate handler based on the semantic route.

        Args:
            route: Semantic route determined by the AI
            message: Message to process
            session_id: Optional session ID for context memory

        Returns:
            dict[str, str]: Response from the appropriate handler
        """
        # Map routes to handlers
        handlers = {
            SemanticRouterResponse.CHECK_BALANCE: self.handle_balance_check,
            SemanticRouterResponse.SEND_TOKEN: self.handle_send_token,
            SemanticRouterResponse.SWAP_TOKEN: self.handle_swap_token,
            SemanticRouterResponse.CROSS_CHAIN_SWAP: self.handle_cross_chain_swap,
            SemanticRouterResponse.STAKE_FLR: self.handle_stake_command,
            SemanticRouterResponse.REQUEST_ATTESTATION: self.handle_attestation,
            SemanticRouterResponse.CONVERSATIONAL: self.handle_conversation,
        }

        # Defensive validation: ensure route exists in handlers
        if route not in handlers:
            self.logger.error(
                "invalid_semantic_route",
                route=str(route),
                available_routes=[str(r) for r in handlers.keys()],
            )
            raise ValueError(
                f"PROTOCOL MISMATCH: LLM returned '{route}' which is not in SemanticRouterResponse enum. "
                f"This indicates the prompt and enum are out of sync. "
                f"Valid routes: {[str(r) for r in handlers.keys()]}"
            )

        # Check for direct command patterns before semantic routing
        message_lower = message.lower()

        # Handle universal router commands
        if message_lower.startswith("universal"):
            # Extract the parameters from the universal command
            parts = message_lower.split()
            if len(parts) >= 4:
                amount = parts[1]
                token_in = parts[2]
                token_out = parts[3]
                # Convert to swap format
                swap_command = f"swap {amount} {token_in} to {token_out}"
                return await self.handle_swap_token(swap_command)
            return {
                "response": "Invalid swap format. Please use: swap <amount> <token_in> to <token_out>"
            }

        # Convert regular swap commands to the right format if they match the pattern
        # Example: "swap 1 wflr to wc2flr"
        swap_pattern = re.compile(
            r"swap\s+(\d+\.?\d*)\s+(\w+\.?\w*)\s+to\s+(\w+\.?\w*)", re.IGNORECASE
        )
        match = swap_pattern.match(message_lower)
        if match:
            return await self.handle_swap_token(message)

        handler = handlers.get(route)
        if not handler:
            return {"response": "Unsupported route"}

        if route == SemanticRouterResponse.CONVERSATIONAL:
            return await self.handle_conversation(message, session_id=session_id)
        
        return await handler(message)

    async def handle_balance_check(self, message: str) -> dict[str, str]:
        """Handle balance check requests - supports native FLR and ERC20 tokens."""
        if not self.blockchain.address:
            return {
                "response": "Please make sure your wallet is connected to check your balance."
            }

        try:
            # Get native balance
            native_balance = self.blockchain.check_balance()
            native_symbol = self.blockchain.native_symbol

            # Get all token balances including zero balances using blazeswap tokens
            token_balances = self.blockchain.check_all_token_balances(
                self.blazeswap.tokens, self.blazeswap.token_decimals, include_zero=True
            )

            # Build response
            response = f"Your wallet holdings ({self.blockchain.address[:6]}...{self.blockchain.address[-4:]}):\n\n"
            response += f"• **{native_symbol}**: {native_balance:,.6f}\n"

            # Separate tokens with balance from those with zero balance
            with_balance = {s: b for s, b in token_balances.items() if b > 0}
            zero_balance = {s: b for s, b in token_balances.items() if b == 0}

            if with_balance:
                response += "\n**Token Balances:**\n"
                for symbol, balance in sorted(with_balance.items()):
                    response += f"• **{symbol}**: {balance:,.6f}\n"

            if zero_balance:
                response += f"\n**Other Supported Tokens:** {', '.join(sorted(zero_balance.keys()))} (0 balance)"

            return {"response": response}
        except Exception as e:
            self.logger.exception(BALANCE_CHECK_ERROR, error=str(e))
            return {"response": f"{BALANCE_CHECK_ERROR}: {e!s}"}

    async def handle_send_token(self, message: str) -> dict[str, str]:
        """
        Handle token sending requests.

        Args:
            message: Message containing token sending details

        Returns:
            dict[str, str]: Response containing transaction preview or follow-up prompt
        """
        if not self.blockchain.address:
            await self.handle_generate_account(message)

        prompt, mime_type, schema = self.prompts.get_formatted_prompt(
            "token_send", user_input=message
        )
        send_token_response = self.ai.generate(
            prompt=prompt, response_mime_type=mime_type, response_schema=schema
        )
        send_token_json = json.loads(send_token_response.text)
        expected_json_len = 2
        if (
            len(send_token_json) != expected_json_len
            or send_token_json.get("amount") == 0.0
        ):
            prompt, _, _ = self.prompts.get_formatted_prompt("follow_up_token_send")
            follow_up_response = self.ai.generate(prompt)
            return {"response": follow_up_response.text}

        tx = self.blockchain.create_send_flr_tx(
            to_address=send_token_json.get("to_address"),
            amount=send_token_json.get("amount"),
        )
        self.logger.debug("send_token_tx", tx=tx)

        # Convert transaction to JSON string - frontend expects 'transactions' (plural)
        # Note: create_send_flr_tx returns a TxParams dict which needs to be serialized
        # We need to ensure hex values are handled correctly
        formatted_tx = {
            "from": tx["from"],
            "to": tx["to"],
            "value": hex(tx["value"]),
            "nonce": hex(tx["nonce"]),
            "gas": hex(tx["gas"]),
            "maxFeePerGas": hex(int(tx["maxFeePerGas"])),
            "maxPriorityFeePerGas": hex(int(tx["maxPriorityFeePerGas"])),
            "chainId": hex(tx["chainId"]),
            "type": "0x2",
        }
        transaction_json = json.dumps([formatted_tx])

        return {
            "response": f"Ready to send {send_token_json.get('amount')} FLR to {send_token_json.get('to_address')}.\n\n"
            + "Please confirm the transaction in your wallet.",
            "transactions": transaction_json,
        }

    async def handle_swap_token(self, message: str) -> dict[str, str]:
        """Handle token swap requests."""
        if not self.blockchain.address:
            return {"response": WALLET_NOT_CONNECTED}

        try:
            # Parse swap parameters from message
            parts = message.split()
            if len(parts) < 5:
                return {
                    "response": """Usage: swap <amount> <token_in> to <token_out>
Example: swap 0.1 FLR to WC2FLR
Example: swap 0.1 FLR to FLX

Supported tokens: FLR, WFLR, WC2FLR, USDT, WETH, FLX"""
                }

            amount = float(parts[1])
            token_in = parts[2].upper()
            token_out = parts[4].upper()

            # Validate tokens using blazeswap instance
            supported_tokens = list(self.blazeswap.tokens.keys())
            if token_in != "FLR" and token_in not in supported_tokens:
                return {
                    "response": f"Unsupported input token: {token_in}. Supported tokens: FLR, {', '.join(supported_tokens)}"
                }

            if token_out not in supported_tokens:
                return {
                    "response": f"Unsupported output token: {token_out}. Supported tokens: {', '.join(supported_tokens)}"
                }

            # Prepare swap transaction
            swap_data = await self.blazeswap.prepare_swap_transaction(
                token_in=token_in,
                token_out=token_out,
                amount_in=amount,
                wallet_address=self.blockchain.address,
                router_address=self.blazeswap.contracts["router"],
            )

            # Convert transaction to JSON string - frontend expects 'transactions' (plural)
            transaction_json = json.dumps([swap_data["transaction"]])  # Wrap in array

            # Format the response based on the tokens involved
            min_amount = self.blockchain.w3.from_wei(
                swap_data["min_amount_out"], "ether"
            )


            return {
                "response": f"Ready to swap {amount} {token_in} for {token_out}.\n\n"
                + "Transaction details:\n"
                + f"- From: {self.blockchain.address[:6]}...{self.blockchain.address[-4:]}\n"
                + f"- Amount: {amount} {token_in}\n"
                + f"- Minimum received: {min_amount} {token_out}\n\n"
                + "Please confirm the transaction in your wallet.",
                "transactions": transaction_json,  # Changed from 'transaction' to 'transactions'
            }


        except ValueError as e:
            # Handle pool validation errors specifically
            error_msg = str(e)
            if "No liquidity pool exists" in error_msg:
                # Extract available pairs from error message
                self.logger.warning("pool_not_found", token_in=token_in, token_out=token_out, error=error_msg)
                return {
                    "response": f"{error_msg}\n\n💡 **Suggestions:**\n"
                    f"• Add liquidity for {token_in}/{token_out} pair\n"
                    f"• Try swapping with available pairs listed above\n"
                    f"• Check BlazeSwap for existing pools",
                    "suggest_add_liquidity": True,
                    "token_pair": f"{token_in}/{token_out}"
                }
            else:
                self.logger.error(SWAP_ERROR, error=error_msg)
                return {"response": f"{SWAP_ERROR}: {error_msg}"}
        except Exception as e:
            self.logger.exception(SWAP_ERROR, error=str(e))
            return {"response": f"{SWAP_ERROR}: {e!s}"}

    async def handle_cross_chain_swap(self, message: str) -> dict[str, str]:
        """Handle cross-chain token swap requests."""
        if not self.blockchain.address:
            return {
                "response": "Please connect your wallet first to perform cross-chain swaps."
            }

        try:
            # Parse swap parameters using the template
            prompt, mime_type, schema = self.prompts.get_formatted_prompt(
                "cross_chain_swap", user_input=message
            )
            swap_response = self.ai.generate(
                prompt=prompt, response_mime_type=mime_type, response_schema=schema
            )

            # The schema ensures we get FLR to WC2FLR with just the amount
            swap_json = json.loads(swap_response.text)

            # Validate the parsed data
            if not swap_json or swap_json.get("amount", 0) <= 0:
                return {
                    "response": "Could not understand the swap amount. Please try again with a valid amount."
                }

        except Exception as e:
            self.logger.exception(CROSS_CHAIN_ERROR, error=str(e))
            return {"response": f"{CROSS_CHAIN_ERROR}: {e!s}"}

    async def handle_attestation(self, _: str) -> dict[str, str]:
        """
        Handle attestation requests.

        Args:
            _: Unused message parameter

        Returns:
            dict[str, str]: Response containing attestation request
        """
        prompt = self.prompts.get_formatted_prompt("request_attestation")[0]
        request_attestation_response = self.ai.generate(prompt=prompt)
        self.attestation.attestation_requested = True
        return {"response": request_attestation_response.text}

    async def handle_conversation(self, message: str, session_id: str | None = None) -> dict[str, str]:
        """
        Handle general conversation messages.
        """
        prompt, _, _ = self.prompts.get_formatted_prompt(
            "conversational", user_input=message, context="", image_data=""
        )
        response = await self.ai.send_message(prompt, session_id=session_id)
        return {"response": response.text}

    async def handle_onboarding(self, _: str) -> dict[str, str]:
        """
        Handle onboarding requests.
        """
        prompt, _, _ = self.prompts.get_formatted_prompt("onboarding")
        response = await self.ai.send_message(prompt)
        return {"response": response.text}

    async def handle_risk_assessment(self, message: str) -> dict[str, str]:
        """Handle risk assessment requests."""
        try:
            # Extract risk score from message (e.g., "risk 5")
            parts = message.split()
            score = 5.0
            if len(parts) >= 2:
                try:
                    score = float(parts[1])
                except ValueError:
                    pass
            
            # Clamp score between 1 and 10
            score = max(1.0, min(10.0, score))
            
            # Generate a strategy based on the score
            if score <= 3:
                strategy = "Conservative: Focus on stablecoins like WC2FLR and USDT. Consider providing liquidity to stable pairs or staking FLR to sFLR for steady rewards with lower volatility."
            elif score <= 7:
                strategy = "Moderate: A balanced mix of staking FLR and providing liquidity to major pairs like FLR/WC2FLR or FLR/WETH. This provides a good balance between rewards and market exposure."
            else:
                strategy = "Aggressive: Focus on high-yield pairs like FLR/FLX or speculative assets. Be prepared for higher volatility and potential impermanent loss in exchange for higher reward potential."
            
            return {
                "response": f"Based on your risk tolerance of {score}/10, here is your customized DeFi strategy:\n\n**Strategy:** {strategy}\n\nWould you like to explore specific liquidity pools or staking options?"
            }
        except Exception as e:
            self.logger.exception("Error in risk assessment", error=str(e))
            return {"response": f"Error calculating risk strategy: {e!s}"}

    async def handle_message(self, message: str) -> dict[str, str]:
        """Handle incoming chat message."""

        # Extract command if present
        words = message.lower().split()
        if not words:
            return {"response": "Please enter a message."}

        command = words[0]

        # Handle direct commands first
        try:
            # Direct command routing
            if command == "perp":
                return {
                    "response": "Perpetuals trading is not supported. Please use BlazeSwap for token swaps."
                }
            if command == "swap":
                return await self.handle_swap_token(message)
            if command == "universal":
                return {
                    "response": "Universal router swaps have been removed. Please use 'swap' command for BlazeSwap trading."
                }
            if command == "balance" or command == "check":
                return await self.handle_balance_check(message)
            if command == "send":
                return await self.handle_send_token(message)
            if command == "stake":
                # Directly handle stake command without semantic routing
                return await self.handle_stake_command(message)
            if command == "pool":
                # Check if it's a pool command with native FLR
                if (
                    len(words) >= 5
                    and words[1].lower() == "add"
                    and words[3].lower() == "flr"
                ) or (
                    len(words) >= 5
                    and words[1].lower() == "add"
                    and (words[3].lower() == "wflr" or words[4].lower() == "wflr")
                ):
                    return await self.handle_add_liquidity(message)
                # Otherwise, it's a regular pool command with two tokens
                if len(words) >= 5 and words[1].lower() == "add":
                    return await self.handle_add_liquidity(message)
                return {
                    "response": """Usage: pool add <amount> <token_a> <token_b>
Example: pool add 1 WFLR WC2FLR
Example: pool add 100 FLX WC2FLR

Or for native FLR:
pool add <amount_flr> FLR <token>
Example: pool add 1 FLR WC2FLR

Supported tokens: FLR, WFLR, WC2FLR, USDT, WETH, FLX"""
                }
            if command == "risk":
                return await self.handle_risk_assessment(message)
            if command == "attest":
                return await self.handle_attestation(message)
            if command == "help":
                return await self.handle_help_command()
            # If no specific command, treat as conversation
            return await self.handle_conversation(message)
        except Exception as e:
            self.logger.exception(PROCESSING_ERROR, error=str(e))
            return {"response": f"{PROCESSING_ERROR}: {e!s}"}

    async def handle_stake_command(self, message: str) -> dict[str, str]:
        """Handle FLR staking to sFLR requests."""
        if not self.blockchain.address:
            return {"response": WALLET_NOT_CONNECTED}

        try:
            # Parse stake parameters from message
            parsed_command = await parse_stake_command(message)

            if parsed_command["status"] == "error":
                return {"response": f"{STAKING_ERROR}: {parsed_command['message']}"}

            amount = parsed_command["amount"]

            # Prepare staking transaction
            stake_data = stake_flr_to_sflr(
                web3_provider_url=self.blockchain.w3.provider.endpoint_uri,
                wallet_address=self.blockchain.address,
                amount=amount,
            )

            if stake_data["status"] == "error":
                return {"response": f"{STAKING_ERROR}: {stake_data['message']}"}

            # Convert transaction to JSON string - frontend expects 'transactions' (plural)
            transaction_json = json.dumps([stake_data["transaction"]])  # Wrap in array

            return {
                "response": f"Ready to stake {amount} FLR to sFLR.\n\n"
                + "Transaction details:\n"
                + f"- From: {self.blockchain.address[:6]}...{self.blockchain.address[-4:]}\n"
                + f"- Amount: {amount} FLR\n"
                + f"- Contract: {SFLR_CONTRACT_ADDRESS[:6]}...{SFLR_CONTRACT_ADDRESS[-4:]}\n\n"
                + "Please confirm the transaction in your wallet.",
                "transactions": transaction_json,  # Changed from 'transaction' to 'transactions'
            }

        except Exception as e:
            self.logger.exception(STAKING_ERROR, error=str(e))
            return {"response": f"{STAKING_ERROR}: {e!s}"}

    async def handle_help_command(self) -> dict[str, str]:
        """Handle help command."""
        help_text = """
🤖 **DeFi AI Assistant Commands**

**Wallet Operations:**
- `balance` - Check your wallet balance
- `send <amount> <address>` - Send FLR to an address

**Trading Operations:**
- `swap <amount> <token_in> to <token_out>` - Swap tokens on BlazeSwap
  Example: swap 0.1 WFLR to WC2FLR
  Example: swap 0.1 FLR to FLX
  Example: swap 0.5 FLX to FLR

**Liquidity Operations:**
- `pool add <amount> <token_a> <token_b>` - Add liquidity with two tokens
  Example: pool add 1 WFLR WC2FLR
  Example: pool add 100 FLX WC2FLR
- `pool add <amount_flr> FLR <token>` - Add liquidity with native FLR
  Example: pool add 1 FLR WC2FLR
  Example: pool add 0.5 FLR FLX

**Staking Operations:**
- `stake <amount> FLR` - Stake FLR to get sFLR
  Example: stake 10 FLR

**Risk Assessment:**
- `risk <score>` - Get personalized DeFi strategy based on risk tolerance (1-10)
  Example: risk 5

**Other Commands:**
- `help` - Show this help message
- `attest` - Generate an attestation of the AI's response

You can also ask me general questions about DeFi on Flare Network!
"""
        return {"response": help_text}

    async def handle_add_liquidity_nat(self, message: str) -> dict[str, str]:
        """Handle adding liquidity with native FLR and a token."""
        if not self.blockchain.address:
            return {"response": WALLET_NOT_CONNECTED}

        try:
            # Parse parameters from message
            # New format: pool add <amount_flr> FLR <token>
            # Example: pool add 1 FLR WC2FLR
            parts = message.split()
            if len(parts) < 5:
                return {
                    "response": """Usage: pool add <amount_flr> FLR <token>
Example: pool add 0.1 FLR WC2FLR
Example: pool add 0.5 FLR FLX

Supported tokens: WC2FLR, USDT, WETH, FLX"""
                }

            amount_flr = float(parts[2])
            token = parts[4].upper()

            # Validate token using blazeswap instance
            supported_tokens = list(self.blazeswap.tokens.keys())
            if token not in supported_tokens or token == "FLR" or token == "WFLR":
                return {
                    "response": f"Unsupported token: {token}. Supported tokens: {', '.join([t for t in supported_tokens if t not in ['FLR', 'WFLR']])}"
                }

            # Get token pair price to calculate the equivalent amount of token
            # This is a simplified approach - in a real implementation, you would query the pool for the current ratio
            # For now, we'll use a hardcoded ratio for FLR/WC2FLR and default to 1:1 for other pairs
            token_ratios = {
                "FLR_WC2FLR": 1.0,  # 1 FLR = 1 WC2FLR (1:1 wrap)
                "WC2FLR_FLR": 1.0,  # 1 WC2FLR = 1 FLR
                "FLR_FLX": 0.135,  # Approximate ratio (adjusted)
                "FLX_FLR": 7.4,  # Approximate ratio (adjusted)
            }

            # Determine the pair key
            pair_key = f"FLR_{token}"
            reverse_pair_key = f"{token}_FLR"

            # Calculate amount_token based on the ratio
            amount_token = 0
            if pair_key in token_ratios:
                amount_token = amount_flr * token_ratios[pair_key]
                print(f"Debug - Using ratio {token_ratios[pair_key]} for {pair_key}")
            elif reverse_pair_key in token_ratios:
                amount_token = amount_flr / token_ratios[reverse_pair_key]
                print(
                    f"Debug - Using inverse ratio 1/{token_ratios[reverse_pair_key]} for {reverse_pair_key}"
                )
            else:
                # Default to 1:1 ratio if we don't have a specific ratio
                amount_token = amount_flr
                print(f"Debug - Using default 1:1 ratio for {pair_key}")

            # Round to appropriate decimal places based on token
            if token.upper() == "WC2FLR":
                amount_token = round(amount_token, 18)  # WC2FLR has 18 decimals
            else:
                amount_token = round(
                    amount_token, 8
                )  # Other tokens use 8 decimal places for display

            print(f"Debug - Calculated {amount_token} {token} for {amount_flr} FLR")

            # Prepare add liquidity transaction
            liquidity_data = await self.blazeswap.prepare_add_liquidity_nat_transaction(
                token=token,
                amount_token=amount_token,
                amount_flr=amount_flr,
                wallet_address=self.blockchain.address,
                router_address=self.blazeswap.contracts["router"],
            )

            # Print debug information about the transaction
            print(
                f"Debug - Liquidity data: token={token}, amount_token={amount_token}, amount_flr={amount_flr}"
            )
            print(
                f"Debug - Min amounts: token_min={liquidity_data.get('amount_token_min', 'N/A')}, flr_min={liquidity_data.get('amount_flr_min', 'N/A')}"
            )

            # Check if approval is needed
            needs_approval = liquidity_data.get("needs_approval", False)

            # Prepare transactions array
            transactions = []

            # Add approval transaction if needed
            if needs_approval and "approval_transaction" in liquidity_data:
                approval_tx = liquidity_data["approval_transaction"]
                print(f"Debug - Approval transaction to: {approval_tx['to']}")
                transactions.append(
                    {
                        "tx": approval_tx,
                        "description": f"1. Approve {amount_token:.6f} {token} for adding liquidity",
                    }
                )

            # Add liquidity transaction
            add_liquidity_tx = liquidity_data["transaction"]
            print(f"Debug - Add liquidity transaction to: {add_liquidity_tx['to']}")
            transactions.append(
                {
                    "tx": add_liquidity_tx,
                    "description": f"{'2' if needs_approval else '1'}. Add liquidity with {amount_flr} FLR and {amount_token:.6f} {token}",
                }
            )

            # Convert transactions to JSON string
            transactions_json = json.dumps(transactions)
            print(f"Debug - Transactions JSON: {transactions_json[:100]}...")

            # Build response message
            response_message = f"Ready to add liquidity with {amount_flr} FLR and {amount_token:.6f} {token}.\n\n"

            if needs_approval:
                response_message += "This operation requires two transactions:\n"
                response_message += f"1. Approve {token} for trading\n"
                response_message += f"2. Add liquidity with FLR and {token}\n\n"

            response_message += "Transaction details:\n"
            response_message += f"- From: {self.blockchain.address[:6]}...{self.blockchain.address[-4:]}\n"
            response_message += f"- FLR amount: {amount_flr} (min: {liquidity_data['amount_flr_min']})\n"
            response_message += f"- {token} amount: {amount_token:.6f} (min: {liquidity_data['amount_token_min']})\n\n"
            response_message += f"Please confirm {'each transaction' if needs_approval else 'the transaction'} in your wallet."

            return {"response": response_message, "transactions": transactions_json}

        except Exception as e:
            self.logger.exception(
                "Error adding liquidity with native FLR", error=str(e)
            )
            return {"response": f"Error adding liquidity: {e!s}"}

    async def handle_add_liquidity(self, message: str) -> dict[str, str]:
        """Handle adding liquidity with two tokens."""
        if not self.blockchain.address:
            return {"response": WALLET_NOT_CONNECTED}

        try:
            # Parse parameters from message
            # New format: pool add <amount> <token_a> <token_b>
            # Example: pool add 1 WFLR WC2FLR
            parts = message.split()
            if len(parts) < 5:
                return {
                    "response": """Usage: pool add <amount> <token_a> <token_b>
Example: pool add 1 WFLR WC2FLR
Example: pool add 100 FLX WC2FLR

Supported tokens: WFLR, WC2FLR, USDT, WETH, FLX"""
                }

            amount_a = float(parts[2])
            token_a = parts[3].upper()
            token_b = parts[4].upper()

            # Validate tokens using blazeswap instance
            supported_tokens = list(self.blazeswap.tokens.keys())

            # Special case: if either token is FLR, redirect to handle_add_liquidity_nat
            if token_a == "FLR":
                return await self.handle_add_liquidity_nat(
                    f"pool add {amount_a} FLR {token_b}"
                )

            if token_b == "FLR":
                return await self.handle_add_liquidity_nat(
                    f"pool add {amount_a} FLR {token_a}"
                )

            # Make sure both tokens are supported and neither is FLR
            if token_a not in supported_tokens or token_a == "FLR":
                return {
                    "response": f"Unsupported token A: {token_a}. Supported tokens: {', '.join([t for t in supported_tokens if t != 'FLR'])}"
                }

            if token_b not in supported_tokens or token_b == "FLR":
                return {
                    "response": f"Unsupported token B: {token_b}. Supported tokens: {', '.join([t for t in supported_tokens if t != 'FLR'])}"
                }

            # Special case for WFLR - make sure we're using the correct token address
            if token_a == "WFLR":
                print(f"Debug - Using WFLR as token A: {self.blazeswap.tokens['WFLR']}")

            if token_b == "WFLR":
                print(f"Debug - Using WFLR as token B: {self.blazeswap.tokens['WFLR']}")

            # Get token pair price to calculate the equivalent amount of token B
            # This is a simplified approach - in a real implementation, you would query the pool for the current ratio
            # For now, we'll use a hardcoded ratio for WFLR/WC2FLR and default to 1:1 for other pairs
            token_ratios = {
                "WFLR_WC2FLR": 1.0,  # 1 WFLR = 1 WC2FLR (1:1 wrap)
                "WC2FLR_WFLR": 1.0,  # 1 WC2FLR = 1 WFLR
                "WFLR_FLX": 0.135,  # Approximate ratio (adjusted)
                "FLX_WFLR": 7.4,  # Approximate ratio (adjusted)
            }

            # Determine the pair key
            pair_key = f"{token_a}_{token_b}"
            reverse_pair_key = f"{token_b}_{token_a}"

            # Calculate amount_b based on the ratio
            amount_b = 0
            if pair_key in token_ratios:
                amount_b = amount_a * token_ratios[pair_key]
                print(f"Debug - Using ratio {token_ratios[pair_key]} for {pair_key}")
            elif reverse_pair_key in token_ratios:
                amount_b = amount_a / token_ratios[reverse_pair_key]
                print(
                    f"Debug - Using inverse ratio 1/{token_ratios[reverse_pair_key]} for {reverse_pair_key}"
                )
            else:
                # Default to 1:1 ratio if we don't have a specific ratio
                amount_b = amount_a
                print(f"Debug - Using default 1:1 ratio for {pair_key}")

            # Round to appropriate decimal places based on token
            if token_b.upper() == "WC2FLR":
                amount_b = round(amount_b, 18)  # WC2FLR has 18 decimals
            else:
                amount_b = round(
                    amount_b, 8
                )  # Other tokens use 8 decimal places for display

            print(f"Debug - Calculated {amount_b} {token_b} for {amount_a} {token_a}")

            # Prepare add liquidity transaction
            liquidity_data = await self.blazeswap.prepare_add_liquidity_transaction(
                token_a=token_a,
                token_b=token_b,
                amount_a=amount_a,
                amount_b=amount_b,
                wallet_address=self.blockchain.address,
                router_address=self.blazeswap.contracts["router"],
            )

            # Print debug information about the transaction
            print(
                f"Debug - Liquidity data: token_a={token_a}, amount_a={amount_a}, token_b={token_b}, amount_b={amount_b}"
            )
            print(
                f"Debug - Min amounts: token_a_min={liquidity_data.get('amount_a_min', 'N/A')}, token_b_min={liquidity_data.get('amount_b_min', 'N/A')}"
            )

            # Convert transactions array to JSON string
            transactions_json = json.dumps(liquidity_data["transactions"])
            print(f"Debug - Transactions JSON: {transactions_json[:100]}...")

            # Build response message
            response_message = f"Ready to add liquidity with {amount_a} {token_a} and {amount_b:.6f} {token_b}.\n\n"

            num_approvals = 0
            if liquidity_data.get("needs_approval_a", False):
                num_approvals += 1
            if liquidity_data.get("needs_approval_b", False):
                num_approvals += 1

            if num_approvals > 0:
                response_message += (
                    f"This operation requires {num_approvals + 1} transactions:\n"
                )
                if liquidity_data.get("needs_approval_a", False):
                    response_message += f"- Approve {token_a} for trading\n"
                if liquidity_data.get("needs_approval_b", False):
                    response_message += f"- Approve {token_b} for trading\n"
                response_message += f"- Add liquidity with {token_a} and {token_b}\n\n"

            response_message += "Transaction details:\n"
            response_message += f"- From: {self.blockchain.address[:6]}...{self.blockchain.address[-4:]}\n"
            response_message += f"- {token_a} amount: {amount_a} (min: {liquidity_data['amount_a_min']})\n"
            response_message += f"- {token_b} amount: {amount_b:.6f} (min: {liquidity_data['amount_b_min']})\n\n"
            response_message += f"Please confirm {'each transaction' if num_approvals > 0 else 'the transaction'} in your wallet."

            return {"response": response_message, "transactions": transactions_json}

        except Exception as e:
            self.logger.exception("Error adding liquidity", error=str(e))
            return {"response": f"Error adding liquidity: {e!s}"}
