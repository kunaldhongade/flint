"""
RAG Management Routes
"""

import structlog
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from flare_ai_defai.api.routes.chat import ChatRouter

logger = structlog.get_logger(__name__)
router = APIRouter()

class IngestResponse(BaseModel):
    message: str
    count: int

@router.post("/ingest", response_model=IngestResponse)
async def ingest_documents(request: Request, force: bool = False):
    """
    Trigger manual ingestion of RAG documents.
    
    Args:
        force (bool): If True, clears existing vector store before ingestion.
    """
    try:
        # We need access to the RAGProcessor instance.
        # It's inside ChatRouter -> GeminiProvider -> RAGProcessor
        # Since we don't have direct access to the app instance here easily without valid injection,
        # we might need to rely on the fact that ChatRouter is a singleton or stored in app state.
        # But for now, let's assume we can access it via the 'chat' instance if it was global.
        # WAITING: refactor main.py to expose chat router or RAG processor.
        
        # Taking a different approach: The user wants an API call.
        # The app is initialized in main.py.
        # We can attach the chat router to the app state or request.app.
        
        # Accessing via request.app.state if we set it up.
        # Let's assume request.app.state.chat_router exists.
        
        if not hasattr(request.app.state, "chat_router"):
             raise HTTPException(status_code=500, detail="Chat router not initialized in app state")
             
        rag_processor = request.app.state.chat_router.ai.rag_processor
        
        if force:
            result = rag_processor.reload_knowledge_base()
            return IngestResponse(message="Forced reload complete", count=result["count"])
        else:
            # If not force, maybe just try to load? But our new logic skips if exists.
            # So 'ingest' without force implies 'load if missing'.
            # Or we can expose a method to add new documents.
            # For this simple implementation, let's say 'ingest' calls reload if force=True,
            # or maybe just re-runs the initial load logic (which skips if exists).
            
            # If user wants to "run this whenever we want", they probably imply "update".
            # So force=True is what they want if they changed files.
            # If they just want to ensure it's loaded:
            if len(rag_processor.rag_system.vector_store.documents) == 0:
                 rag_processor._load_documents(rag_processor.rag_system.data_dir) # Accessing private method for now or we expose public
                 count = len(rag_processor.rag_system.vector_store.documents)
                 return IngestResponse(message="Initial load complete", count=count)
            else:
                 return IngestResponse(message="Documents already loaded. Use force=True to reload.", count=len(rag_processor.rag_system.vector_store.documents))

    except Exception as e:
        logger.exception("ingest_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
