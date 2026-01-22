"""
AI Agent API Main Application Module

This module initializes and configures the FastAPI application for the AI Agent API.
It sets up CORS middleware, integrates various providers (AI, blockchain, attestation),
and configures the chat routing system.

Dependencies:
    - FastAPI for the web framework
    - Structlog for structured logging
    - CORS middleware for cross-origin resource sharing
    - Custom providers for AI, blockchain, and attestation services
"""

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from flare_ai_defai import (
    ChatRouter,
    FlareProvider,
    GeminiProvider,
    PromptService,
    Vtpm,
)
from flare_ai_defai.api.middleware.rate_limit import RateLimitMiddleware
from flare_ai_defai.settings import settings
from flare_ai_defai.api.routes.trust import router as trust_router
from flare_ai_defai.api.routes.verify import router as verify_router

logger = structlog.get_logger(__name__)


def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application instance.

    This function:
    1. Creates a new FastAPI instance
    2. Configures CORS middleware with settings from the configuration
    3. Initializes required service providers:
       - GeminiProvider for AI capabilities
       - FlareProvider for blockchain interactions
       - Vtpm for attestation services
       - PromptService for managing chat prompts
    4. Sets up routing for chat endpoints

    Returns:
        FastAPI: Configured FastAPI application instance

    Configuration:
        The following settings are used from settings module:
        - api_version: API version string
        - cors_origins: List of allowed CORS origins
        - gemini_api_key: API key for Gemini AI service
        - gemini_model: Model identifier for Gemini AI
        - web3_provider_url: URL for Web3 provider
        - simulate_attestation: Boolean flag for attestation simulation
    """
    app = FastAPI(
        title="Flare AI DeFi",
        description="AI-powered DeFi agent on Flare Network",
        version="0.1.0",
    )

    # Configure CORS middleware with settings from configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Add Rate Limiting for Trust APIs
    app.add_middleware(RateLimitMiddleware)

    # Initialize chat router
    chat = ChatRouter(
        ai=GeminiProvider(
            api_key=settings.gemini_api_key,
            model=settings.gemini_model,
            knowledge_base_path=settings.knowledge_base_path,
        ),
        blockchain=FlareProvider(web3_provider_url=settings.flare_rpc_url),
        attestation=Vtpm(simulate=settings.simulate_attestation),
        prompts=PromptService(),
    )

    # Register chat routes with API
    app.include_router(chat.router, prefix="/api/routes/chat", tags=["chat"])
    # Both trust routers share /api/trust prefix defined internally or here?
    # verify.py defines prefix="/trust". trust.py defines prefix="/trust".
    # We mount them under /api (so /api/trust/...)
    # But include_router arguments override? Or combine?
    # safe way: include_router(router, prefix="/api") if router has "/trust".
    # trust_router has prefix="/trust".
    # verify_router has prefix="/verify"?? No, I put "/trust" in verify.py too.
    # I should verify verify.py content.
    # "router = APIRouter(prefix="/trust", tags=["trust"])"
    # So app.include_router(verify_router, prefix="/api") -> /api/trust/verify/...
    app.include_router(trust_router, prefix="/api")
    app.include_router(verify_router, prefix="/api")
    
    # Register RAG management routes
    from flare_ai_defai.api.routes.rag import router as rag_router
    app.include_router(rag_router, prefix="/api/rag", tags=["rag"])
    
    # Store chat router in app state for access by other routes (e.g. RAG)
    app.state.chat_router = chat

    return app


app = create_app()


def start() -> None:
    """
    Start the FastAPI application server using uvicorn.

    This function initializes and runs the uvicorn server with the configuration:
    - Host: 0.0.0.0 (accessible from all network interfaces)
    - Port: 8000 (default HTTP port for the application)
    - App: The FastAPI application instance

    Note:
        This function is typically called when running the application directly,
        not when importing as a module.
    """
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8080)  # noqa: S104


if __name__ == "__main__":
    start()
