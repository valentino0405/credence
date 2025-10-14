"""
Simple Finance Chatbot Service
Uses Gemini AI for finance questions and saves to MongoDB
"""
import os
from datetime import datetime
from typing import Dict, Optional
from google import genai
from database.config import get_database
import logging

logger = logging.getLogger(__name__)

class SimpleChatbotService:
    def __init__(self):
        # Configure Gemini with new API
        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found in environment variables")
        
        self.client = genai.Client(api_key=api_key)
        
        # Simple finance-focused prompt
        self.system_prompt = """You are a helpful finance assistant. Answer finance-related questions clearly and concisely. 
        Focus on: stocks, trading, investments, market analysis, financial planning.
        Keep responses informative but easy to understand. Always mention this is for educational purposes only."""

    async def send_message(self, user_id: str, message: str) -> Dict:
        """
        Simple chat function: question -> Gemini -> save to DB -> return answer
        """
        try:
            print(f"🤖 SimpleChatbotService.send_message called with user_id: {user_id}, message: {message[:100]}...")
            
            # Generate response using new Gemini API
            full_prompt = f"{self.system_prompt}\n\nUser question: {message}"
            print("🔮 Calling Gemini API...")
            
            response = self.client.models.generate_content(
                model='gemini-2.0-flash-exp',
                contents=full_prompt
            )
            print(f"✅ Gemini API response received: {str(response)[:200]}...")
            
            ai_response = response.text if hasattr(response, 'text') and response.text else "Sorry, I couldn't process that question."
            
            # Save conversation to MongoDB
            conversation_data = {
                "user_id": user_id,
                "timestamp": datetime.utcnow(),
                "user_message": message,
                "ai_response": ai_response,
                "model": "gemini-pro"
            }
            
            # Save to database
            try:
                db = await get_database()
                if db is not None:
                    await db.chat_conversations.insert_one(conversation_data)
                    logger.info(f"Saved chat for user {user_id}")
            except Exception as db_error:
                logger.error(f"Database save error: {db_error}")
                # Continue anyway - we still have the response
            
            return {
                "success": True,
                "response": ai_response,
                "timestamp": conversation_data["timestamp"].isoformat()
            }
            
        except Exception as e:
            logger.error(f"Chatbot error: {e}")
            return {
                "success": False,
                "response": "Sorry, I'm having trouble right now. Please try again.",
                "error": str(e)
            }

    async def get_conversation_history(self, user_id: str, limit: int = 10) -> list:
        """Get recent conversation history for a user"""
        try:
            db = await get_database()
            if db is None:
                return []
            
            cursor = db.chat_conversations.find(
                {"user_id": user_id}
            ).sort("timestamp", -1).limit(limit)
            
            history = []
            async for doc in cursor:
                history.append({
                    "timestamp": doc["timestamp"].isoformat(),
                    "user_message": doc["user_message"],
                    "ai_response": doc["ai_response"]
                })
            
            return list(reversed(history))  # Return in chronological order
            
        except Exception as e:
            logger.error(f"Error fetching history: {e}")
            return []

# Global instance
chatbot_service = SimpleChatbotService()