"""
Simple Chatbot API Routes
Just send question -> get answer -> save to DB
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.simple_chatbot import SimpleChatbotService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chatbot"])

class ChatMessage(BaseModel):
    user_id: str
    message: str

class ChatResponse(BaseModel):
    success: bool
    response: str
    timestamp: str
    error: Optional[str] = None

@router.post("/send", response_model=ChatResponse)
async def send_chat_message(chat_data: ChatMessage):
    """
    Simple endpoint: Send a finance question and get Gemini AI response
    """
    print(f"/send endpoint called with: user_id={chat_data.user_id}, message={chat_data.message[:50]}...")
    try:
        if not chat_data.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        print("Creating SimpleChatbotService...")
        chatbot = SimpleChatbotService()
        print("Calling chatbot.send_message...")
        result = await chatbot.send_message(
            user_id=chat_data.user_id,
            message=chat_data.message
        )
        print(f"Chatbot service returned: {result}")
        
        return ChatResponse(
            success=result["success"],
            response=result["response"], 
            timestamp=result["timestamp"],
            error=result.get("error")
        )
        
    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/{user_id}")
async def get_chat_history(user_id: str, limit: int = 10):
    """Get conversation history for a user"""
    try:
        history = await chatbot_service.get_conversation_history(user_id, limit)
        return {
            "success": True,
            "history": history,
            "count": len(history)
        }
    except Exception as e:
        logger.error(f"History endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))