"""
Simple Finance Chatbot Service
Uses Gemini AI for finance questions and saves to MongoDB
"""
import os
from datetime import datetime
from typing import Dict, Optional
import google.generativeai as genai
from database.config import Database
import logging

logger = logging.getLogger(__name__)

class SimpleChatbotService:
    def __init__(self):
        # Configure Gemini
        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found in environment variables")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-pro')
        
        # Simple finance-focused prompt
        self.system_prompt = """You are a helpful finance assistant. Answer finance-related questions clearly and concisely. 
        Focus on: stocks, trading, investments, market analysis, financial planning.
        Keep responses informative but easy to understand.
        
        CORE EXPERTISE:
        - Indian stock markets (NSE/BSE) and global markets
        - Technical analysis and fundamental analysis  
        - Real-time market data interpretation
        - Risk assessment and portfolio management
        - Trading strategies and market insights"""

🎯 PERSONALITY:
- Professional yet approachable
- Data-driven and analytical
- Clear, concise explanations
- Use relevant emojis for visual appeal
- Provide actionable insights

📋 RESPONSE FORMAT:
- Start with a brief, direct answer
- Follow with detailed analysis if needed
- Include relevant data points when available
- Suggest next steps or questions
- Keep responses conversational but informative

🚨 IMPORTANT GUIDELINES:
- Always mention this is for educational purposes
- Remind users that all investments carry risk
- Never guarantee returns or profits
- Encourage users to do their own research
- Provide balanced perspectives (bull & bear cases)

When users ask about specific stocks, offer to get real-time data and analysis. For general questions, provide educational insights about markets, trading, and investment principles.
"""

    async def send_message(self, user_id: str, message: str, context: Dict = None) -> Dict:
        """Send a message to the AI chatbot and get response"""
        try:
            # Get conversation history for context
            conversation_history = await self._get_conversation_history(user_id, limit=5)
            
            # Enhance message with real-time data if stock symbol detected
            enhanced_message, stock_data = await self._enhance_message_with_data(message, context)
            
            # Build conversation context
            conversation_context = self._build_conversation_context(
                conversation_history, 
                enhanced_message, 
                stock_data
            )
            
            # Generate AI response
            response = await self._generate_ai_response(conversation_context)
            
            # Save conversation
            await self._save_conversation(user_id, message, response, stock_data)
            
            return {
                "success": True,
                "response": response,
                "context": {
                    "stocks_analyzed": list(stock_data.keys()) if stock_data else [],
                    "data_included": bool(stock_data),
                    "timestamp": datetime.now().isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Error in chatbot service: {e}")
            return {
                "success": False,
                "error": str(e),
                "response": "I'm experiencing some technical difficulties. Please try again in a moment. 🔧"
            }

    async def _enhance_message_with_data(self, message: str, context: Dict = None) -> tuple:
        """Detect stock symbols and enhance message with real-time data"""
        stock_data = {}
        enhanced_message = message
        
        try:
            # Common Indian stock symbols
            indian_stocks = {
                "reliance": "RELIANCE.NS", "tcs": "TCS.NS", "hdfc": "HDFCBANK.NS",
                "infosys": "INFY.NS", "icici": "ICICIBANK.NS", "wipro": "WIPRO.NS",
                "adani": "ADANIENT.NS", "tata": "TATAMOTORS.NS", "airtel": "BHARTIARTL.NS",
                "itc": "ITC.NS", "ongc": "ONGC.NS", "ntpc": "NTPC.NS"
            }
            
            # US stocks
            us_stocks = {
                "apple": "AAPL", "microsoft": "MSFT", "google": "GOOGL", 
                "tesla": "TSLA", "amazon": "AMZN", "nvidia": "NVDA", "meta": "META"
            }
            
            detected_stocks = []
            message_lower = message.lower()
            
            # Check for stock mentions
            for stock_name, symbol in {**indian_stocks, **us_stocks}.items():
                if stock_name in message_lower or symbol.replace(".NS", "").lower() in message_lower:
                    detected_stocks.append(symbol)
            
            # Get data for detected stocks
            for symbol in detected_stocks[:3]:  # Limit to 3 stocks to avoid overload
                try:
                    # Get current price
                    price_data = await indian_stock_service.get_real_time_price(symbol)
                    
                    # Get AI predictions
                    prediction_data = predictor.predict_future_prices(symbol, days=7)
                    
                    stock_data[symbol] = {
                        "current_price": price_data.get("price", "N/A"),
                        "change_percent": price_data.get("change_percent", 0),
                        "volume": price_data.get("volume", "N/A"),
                        "predictions": prediction_data.get("prediction_scenarios", {}).get("base_case", {}).get("predictions", [])[:7],
                        "trend": "BULLISH" if price_data.get("change_percent", 0) > 0 else "BEARISH"
                    }
                    
                except Exception as e:
                    logger.warning(f"Could not get data for {symbol}: {e}")
            
            # Enhance message with context if provided
            if context:
                if context.get("action") == "analyze_portfolio":
                    enhanced_message += f"\n\n[CONTEXT: User is asking about their portfolio analysis]"
                elif context.get("action") == "risk_assessment":
                    enhanced_message += f"\n\n[CONTEXT: User wants risk assessment for potential trades]"
            
            return enhanced_message, stock_data
            
        except Exception as e:
            logger.error(f"Error enhancing message: {e}")
            return message, {}

    def _build_conversation_context(self, history: List[Dict], current_message: str, stock_data: Dict) -> str:
        """Build comprehensive conversation context for AI"""
        context_parts = []
        
        # System prompt
        context_parts.append(f"SYSTEM: {self.system_prompt}")
        
        # Recent conversation history
        if history:
            context_parts.append("\nRECENT CONVERSATION:")
            for msg in history[-3:]:  # Last 3 exchanges
                timestamp = msg.get('timestamp', datetime.now()).strftime("%H:%M")
                context_parts.append(f"[{timestamp}] User: {msg.get('user_message', '')}")
                context_parts.append(f"[{timestamp}] Assistant: {msg.get('ai_response', '')}")
        
        # Real-time stock data if available
        if stock_data:
            context_parts.append("\nREAL-TIME MARKET DATA:")
            for symbol, data in stock_data.items():
                context_parts.append(f"""
{symbol}:
- Current Price: ${data['current_price']}
- Change: {data['change_percent']:.2f}%
- Volume: {data['volume']}
- Trend: {data['trend']}
- Next Week Prediction: ${data['predictions'][-1]['predicted_price'] if data['predictions'] else 'N/A'}
""")
        
        # Current message
        context_parts.append(f"\nCURRENT USER MESSAGE: {current_message}")
        
        # Instructions
        context_parts.append("""
RESPONSE INSTRUCTIONS:
1. Address the user's question directly and professionally
2. Use the real-time data provided to give accurate insights
3. Include relevant emojis for visual appeal
4. Provide actionable insights or suggestions
5. Keep response concise but informative (max 300 words)
6. Always remind about investment risks when giving advice
7. If asking about specific stocks, offer to provide more detailed analysis
""")
        
        return "\n".join(context_parts)

    async def _generate_ai_response(self, context: str) -> str:
        """Generate AI response using Gemini"""
        try:
            response = await asyncio.to_thread(
                self.model.generate_content,
                context
            )
            
            return response.text.strip()
            
        except Exception as e:
            logger.error(f"Error generating AI response: {e}")
            return "I apologize, but I'm having trouble processing your request right now. Could you please rephrase your question? 🤖"

    async def _save_conversation(self, user_id: str, user_message: str, ai_response: str, stock_data: Dict):
        """Save conversation to database"""
        try:
            db = await get_database()
            if not db:
                return
            
            conversation_doc = {
                "user_id": user_id,
                "user_message": user_message,
                "ai_response": ai_response,
                "stock_data_included": list(stock_data.keys()) if stock_data else [],
                "timestamp": datetime.now(),
                "session_id": f"{user_id}_{datetime.now().strftime('%Y%m%d')}"
            }
            
            await db[COLLECTIONS["chat_conversations"]].insert_one(conversation_doc)
            
        except Exception as e:
            logger.error(f"Error saving conversation: {e}")

    async def _get_conversation_history(self, user_id: str, limit: int = 10) -> List[Dict]:
        """Get recent conversation history for context"""
        try:
            db = await get_database()
            if not db:
                return []
            
            # Get today's conversations
            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            
            conversations = await db[COLLECTIONS["chat_conversations"]].find(
                {
                    "user_id": user_id,
                    "timestamp": {"$gte": today}
                }
            ).sort("timestamp", -1).limit(limit).to_list(length=limit)
            
            # Reverse to get chronological order
            return list(reversed(conversations))
            
        except Exception as e:
            logger.error(f"Error getting conversation history: {e}")
            return []

    async def get_chat_history(self, user_id: str, days_back: int = 7) -> List[Dict]:
        """Get formatted chat history for frontend"""
        try:
            db = await get_database()
            if not db:
                return []
            
            start_date = datetime.now() - timedelta(days=days_back)
            
            conversations = await db[COLLECTIONS["chat_conversations"]].find(
                {
                    "user_id": user_id,
                    "timestamp": {"$gte": start_date}
                }
            ).sort("timestamp", 1).to_list(length=100)
            
            # Format for frontend
            formatted_history = []
            for conv in conversations:
                formatted_history.extend([
                    {
                        "type": "user",
                        "message": conv["user_message"],
                        "timestamp": conv["timestamp"].isoformat()
                    },
                    {
                        "type": "assistant", 
                        "message": conv["ai_response"],
                        "timestamp": conv["timestamp"].isoformat(),
                        "stocks_mentioned": conv.get("stock_data_included", [])
                    }
                ])
            
            return formatted_history
            
        except Exception as e:
            logger.error(f"Error getting chat history: {e}")
            return []

    async def analyze_portfolio_context(self, user_id: str) -> str:
        """Get portfolio context for AI analysis"""
        try:
            # This would integrate with trading service
            # For now, return a placeholder
            return "Portfolio analysis integration pending - user has active portfolio with diversified holdings."
            
        except Exception as e:
            logger.error(f"Error analyzing portfolio context: {e}")
            return ""

    async def get_market_summary_for_chat(self) -> str:
        """Get current market summary for chat context"""
        try:
            # Get key Indian market data
            nifty_data = await indian_stock_service.get_real_time_price("^NSEI")
            
            market_summary = f"""
Current Market Status:
- NIFTY 50: {nifty_data.get('price', 'N/A')} ({nifty_data.get('change_percent', 0):.2f}%)
- Market Sentiment: {'Positive' if nifty_data.get('change_percent', 0) > 0 else 'Negative'}
- Trading Session: {'Active' if datetime.now().hour >= 9 and datetime.now().hour <= 15 else 'Closed'}
"""
            return market_summary
            
        except Exception as e:
            logger.error(f"Error getting market summary: {e}")
            return "Market data temporarily unavailable"

# Global chatbot service instance
chatbot_service = StockChatbotService()