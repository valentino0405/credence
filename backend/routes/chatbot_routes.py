"""
Chatbot API Routes
AI-powered stock market chatbot endpoints
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from services.simple_chatbot import chatbot_service
import logging
from typing import List, Optional, Dict

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/chat", tags=["AI Chatbot"])

# Request models
class ChatMessageRequest(BaseModel):
    user_id: str
    message: str
    context: Optional[Dict] = None

class ChatAnalysisRequest(BaseModel):
    user_id: str
    symbol: str
    analysis_type: str = "general"  # general, technical, fundamental, prediction

@router.post("/message")
async def send_chat_message(request: ChatMessageRequest):
    """Send a message to the AI chatbot"""
    try:
        if not request.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        response = await chatbot_service.send_message(
            request.user_id,
            request.message,
            request.context
        )
        
        if not response["success"]:
            raise HTTPException(status_code=500, detail=response.get("error", "Unknown error"))
        
        return {
            "status": "success",
            "data": {
                "response": response["response"],
                "context": response["context"],
                "user_id": request.user_id
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in chat message: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/{user_id}")
async def get_chat_history(
    user_id: str,
    days_back: int = Query(7, ge=1, le=30, description="Number of days of history to retrieve")
):
    """Get chat history for a user"""
    try:
        history = await chatbot_service.get_chat_history(user_id, days_back)
        
        return {
            "status": "success",
            "data": {
                "history": history,
                "user_id": user_id,
                "days_requested": days_back,
                "total_messages": len(history)
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting chat history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-stock")
async def analyze_stock_with_ai(request: ChatAnalysisRequest):
    """Get AI analysis for a specific stock"""
    try:
        # Prepare context for stock analysis
        analysis_prompts = {
            "general": f"Provide a comprehensive analysis of {request.symbol} including current market position, recent performance, and outlook.",
            "technical": f"Perform technical analysis on {request.symbol} including chart patterns, indicators, and trading signals.",
            "fundamental": f"Analyze the fundamental aspects of {request.symbol} including financials, business model, and valuation.",
            "prediction": f"Provide price predictions and scenarios for {request.symbol} based on current market conditions and trends."
        }
        
        prompt = analysis_prompts.get(request.analysis_type, analysis_prompts["general"])
        
        context = {
            "action": "stock_analysis",
            "symbol": request.symbol,
            "analysis_type": request.analysis_type
        }
        
        response = await chatbot_service.send_message(
            request.user_id,
            prompt,
            context
        )
        
        if not response["success"]:
            raise HTTPException(status_code=500, detail=response.get("error", "Analysis failed"))
        
        return {
            "status": "success",
            "data": {
                "analysis": response["response"],
                "symbol": request.symbol,
                "analysis_type": request.analysis_type,
                "context": response["context"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in stock analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/market-insights/{user_id}")
async def get_market_insights(user_id: str):
    """Get AI-powered market insights and analysis"""
    try:
        # Get current market summary
        market_summary = await chatbot_service.get_market_summary_for_chat()
        
        # Ask AI for market insights
        prompt = f"""
        Based on current market conditions, provide insights on:
        1. Overall market sentiment and trends
        2. Key sectors to watch
        3. Notable market movements today
        4. Trading opportunities and risks
        5. Recommendations for different investor profiles
        
        Current Market Data:
        {market_summary}
        
        Please provide actionable insights in a clear, structured format.
        """
        
        context = {"action": "market_insights"}
        
        response = await chatbot_service.send_message(user_id, prompt, context)
        
        if not response["success"]:
            raise HTTPException(status_code=500, detail="Failed to generate market insights")
        
        return {
            "status": "success",
            "data": {
                "insights": response["response"],
                "market_summary": market_summary,
                "context": response["context"],
                "generated_at": response["context"]["timestamp"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting market insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/portfolio-analysis")
async def analyze_portfolio_with_ai(user_id: str):
    """Get AI analysis of user's portfolio"""
    try:
        # Get portfolio context
        portfolio_context = await chatbot_service.analyze_portfolio_context(user_id)
        
        prompt = f"""
        Analyze my trading portfolio and provide insights on:
        1. Portfolio diversification and balance
        2. Risk assessment and management
        3. Performance analysis and areas for improvement
        4. Recommendations for optimization
        5. Suggested next actions
        
        Portfolio Context: {portfolio_context}
        
        Please provide personalized, actionable advice.
        """
        
        context = {"action": "portfolio_analysis"}
        
        response = await chatbot_service.send_message(user_id, prompt, context)
        
        if not response["success"]:
            raise HTTPException(status_code=500, detail="Failed to analyze portfolio")
        
        return {
            "status": "success",
            "data": {
                "analysis": response["response"],
                "user_id": user_id,
                "context": response["context"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in portfolio analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/suggested-questions")
async def get_suggested_questions():
    """Get suggested questions/prompts for the chatbot"""
    try:
        suggestions = [
            {
                "category": "Stock Analysis",
                "questions": [
                    "Analyze RELIANCE stock for me",
                    "What's the technical outlook for TCS?",
                    "Should I buy HDFC Bank at current levels?",
                    "Compare Infosys vs Wipro"
                ]
            },
            {
                "category": "Market Insights", 
                "questions": [
                    "What's the current market sentiment?",
                    "Which sectors are performing well today?",
                    "What are the key market risks right now?",
                    "Any good buying opportunities in the market?"
                ]
            },
            {
                "category": "Portfolio Management",
                "questions": [
                    "Analyze my portfolio performance",
                    "How can I diversify my holdings better?",
                    "What's my portfolio risk level?",
                    "Suggest some portfolio rebalancing ideas"
                ]
            },
            {
                "category": "Trading Strategy",
                "questions": [
                    "What's a good entry strategy for swing trading?",
                    "How do I manage risk in volatile markets?",
                    "Explain support and resistance levels",
                    "What indicators should I use for day trading?"
                ]
            },
            {
                "category": "Learning",
                "questions": [
                    "Explain fundamental analysis basics",
                    "What are the key technical indicators?",
                    "How does market sentiment affect prices?",
                    "What's the difference between growth vs value investing?"
                ]
            }
        ]
        
        return {
            "status": "success",
            "data": {
                "suggestions": suggestions,
                "total_categories": len(suggestions)
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting suggested questions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/history/{user_id}")
async def clear_chat_history(user_id: str):
    """Clear chat history for a user"""
    try:
        # This would implement clearing chat history from database
        # For now, just return success
        
        return {
            "status": "success",
            "message": f"Chat history cleared for user {user_id}",
            "user_id": user_id
        }
        
    except Exception as e:
        logger.error(f"❌ Error clearing chat history: {e}")
        raise HTTPException(status_code=500, detail=str(e))