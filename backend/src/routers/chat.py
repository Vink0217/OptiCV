from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from starlette.concurrency import run_in_threadpool
from ..models.schemas import ChatRequest
from ..models.prompts import CHATBOT_SYSTEM_PROMPT, format_chatbot_context
from ..services.gemini import GeminiClient

router = APIRouter()


@router.post("/chat")
async def chat(request: ChatRequest):
    """AI chatbot endpoint with streaming responses."""
    context = format_chatbot_context(request.job_description, request.resume_context)
    system_prompt = CHATBOT_SYSTEM_PROMPT.format(context_section=context)
    
    # Build conversation history
    conversation = system_prompt + "\n\n"
    for msg in request.messages:
        conversation += f"{msg.role.upper()}: {msg.content}\n"
    conversation += "ASSISTANT: "

    try:
        client = GeminiClient()
        
        def generate():
            for chunk in client.generate_streaming(conversation, temperature=0.8):
                yield chunk
        
        return StreamingResponse(generate(), media_type="text/plain")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {e}")
