"""
Indian News API Service
Fetches and proce            # Query 1: General Indian market news
            market_news = self.news_api.get_everything(
                q='Indian stock market OR NIFTY OR SENSEX OR BSE OR NSE',
                sources=','.join(self.indian_sources),
                language='en',
                from_param=from_date.strftime('%Y-%m-%d'),
                to=to_date.strftime('%Y-%m-%d'),
                sort_by='publishedAt',
                page_size=50
            )n financial news
"""
import os
import asyncio
from datetime import datetime, timedelta
from newsapi import NewsApiClient
import google.generativeai as genai
from textblob import TextBlob
from database.config import get_database, COLLECTIONS
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

class IndianNewsService:
    def __init__(self):
        self.news_api = NewsApiClient(api_key=os.getenv('NEWSAPI_KEY'))
        genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))
        self.model = genai.GenerativeModel('gemini-1.5-pro')
        
        # Indian financial news sources
        self.indian_sources = [
            'the-times-of-india',
            'business-standard', 
            'economic-times'
        ]
        
        # Indian stock market keywords
        self.indian_keywords = [
            'NIFTY', 'SENSEX', 'BSE', 'NSE', 'RBI', 'rupee',
            'Reliance', 'TCS', 'Infosys', 'HDFC', 'ICICI',
            'Indian market', 'Mumbai', 'Indian economy',
            'Modi', 'Budget', 'GST', 'FII', 'DII'
        ]

    async def fetch_indian_financial_news(self, hours_back: int = 24) -> List[Dict]:
        """Fetch latest Indian financial news"""
        try:
            # Calculate date range
            to_date = datetime.now()
            from_date = to_date - timedelta(hours=hours_back)
            
            # Fetch news from multiple queries for comprehensive coverage
            all_articles = []
            
            # Query 1: Indian stock market news
            market_news = self.news_api.get_everything(
                q='Indian stock market OR NIFTY OR SENSEX OR BSE OR NSE',
                sources=','.join(self.indian_sources),
                language='en',
                from_param=from_date.isoformat(),
                to=to_date.isoformat(),
                sort_by='publishedAt',
                page_size=50
            )
            all_articles.extend(market_news.get('articles', []))
            
            # Query 2: Indian companies and economy
            company_news = self.news_api.get_everything(
                q='Reliance OR TCS OR Infosys OR HDFC OR Indian economy OR RBI',
                sources=','.join(self.indian_sources),
                language='en',
                from_param=from_date.strftime('%Y-%m-%d'),
                to=to_date.strftime('%Y-%m-%d'),
                sort_by='publishedAt',
                page_size=50
            )
            all_articles.extend(company_news.get('articles', []))
            
            # Remove duplicates and process
            seen_urls = set()
            unique_articles = []
            for article in all_articles:
                if article['url'] not in seen_urls:
                    seen_urls.add(article['url'])
                    unique_articles.append(article)
            
            logger.info(f"📰 Fetched {len(unique_articles)} unique Indian financial news articles")
            return unique_articles[:100]  # Limit to 100 most recent
            
        except Exception as e:
            logger.error(f"❌ Error fetching Indian news: {e}")
            return []

    async def analyze_sentiment_with_gemini(self, text: str, title: str) -> Dict:
        """Analyze sentiment using Gemini AI for Indian market context"""
        try:
            prompt = f"""
            Analyze the sentiment of this Indian financial news article for stock market impact:
            
            Title: {title}
            Content: {text}
            
            Provide analysis in JSON format:
            {{
                "overall_sentiment": "positive/negative/neutral",
                "confidence_score": 0.0-1.0,
                "market_impact": "bullish/bearish/neutral",
                "key_entities": ["entity1", "entity2"],
                "impact_score": 0.0-1.0,
                "reasoning": "brief explanation",
                "indian_context": "specific Indian market relevance"
            }}
            
            Focus on Indian stocks, NIFTY/SENSEX impact, RBI policies, Indian companies, and rupee implications.
            """
            
            response = await asyncio.to_thread(
                self.model.generate_content, prompt
            )
            
            # Extract JSON from response
            import json
            try:
                result = json.loads(response.text.strip().replace('```json', '').replace('```', ''))
                return result
            except:
                # Fallback to TextBlob if Gemini fails
                blob = TextBlob(text)
                return {
                    "overall_sentiment": "positive" if blob.sentiment.polarity > 0.1 else "negative" if blob.sentiment.polarity < -0.1 else "neutral",
                    "confidence_score": abs(blob.sentiment.polarity),
                    "market_impact": "bullish" if blob.sentiment.polarity > 0 else "bearish" if blob.sentiment.polarity < 0 else "neutral",
                    "key_entities": [],
                    "impact_score": abs(blob.sentiment.polarity),
                    "reasoning": "Fallback TextBlob analysis",
                    "indian_context": "General sentiment analysis"
                }
                
        except Exception as e:
            logger.error(f"❌ Error in Gemini sentiment analysis: {e}")
            # Fallback sentiment
            return {
                "overall_sentiment": "neutral",
                "confidence_score": 0.5,
                "market_impact": "neutral", 
                "key_entities": [],
                "impact_score": 0.5,
                "reasoning": "Analysis failed",
                "indian_context": "Unable to analyze"
            }

    async def save_news_to_db(self, articles: List[Dict]) -> int:
        """Save processed news articles to MongoDB"""
        try:
            db = await get_database()
            collection = db[COLLECTIONS["news_articles"]]
            
            processed_articles = []
            for article in articles:
                # Analyze sentiment
                sentiment = await self.analyze_sentiment_with_gemini(
                    article.get('content', '') or article.get('description', ''),
                    article.get('title', '')
                )
                
                # Create document
                doc = {
                    "title": article.get('title'),
                    "description": article.get('description'),
                    "content": article.get('content'),
                    "url": article.get('url'),
                    "source": article.get('source', {}).get('name'),
                    "published_at": article.get('publishedAt'),
                    "url_to_image": article.get('urlToImage'),
                    "sentiment_analysis": sentiment,
                    "created_at": datetime.utcnow(),
                    "market_region": "india",
                    "processed": True
                }
                processed_articles.append(doc)
            
            if processed_articles:
                # Insert with upsert to avoid duplicates
                for doc in processed_articles:
                    await collection.update_one(
                        {"url": doc["url"]},
                        {"$set": doc},
                        upsert=True
                    )
                
                logger.info(f"💾 Saved {len(processed_articles)} Indian news articles to database")
                return len(processed_articles)
            
            return 0
            
        except Exception as e:
            logger.error(f"❌ Error saving news to database: {e}")
            return 0

    async def get_latest_news_summary(self, limit: int = 20) -> Dict:
        """Get latest news summary with sentiment analysis"""
        try:
            db = await get_database()
            collection = db[COLLECTIONS["news_articles"]]
            
            # Get latest articles (remove 24-hour filter for now)
            cursor = collection.find({
                "market_region": "india"
            }).sort("created_at", -1).limit(limit)
            
            articles = await cursor.to_list(length=limit)
            
            # Convert ObjectId to string for JSON serialization
            for article in articles:
                if "_id" in article:
                    article["_id"] = str(article["_id"])
            
            # Calculate overall sentiment
            sentiments = [art["sentiment_analysis"]["overall_sentiment"] for art in articles if "sentiment_analysis" in art]
            positive_count = sentiments.count("positive")
            negative_count = sentiments.count("negative")
            neutral_count = sentiments.count("neutral")
            
            total = len(sentiments)
            overall_sentiment = "neutral"
            if total > 0:
                if positive_count > negative_count and positive_count > neutral_count:
                    overall_sentiment = "positive"
                elif negative_count > positive_count and negative_count > neutral_count:
                    overall_sentiment = "negative"
            
            return {
                "total_articles": len(articles),
                "overall_sentiment": overall_sentiment,
                "sentiment_breakdown": {
                    "positive": positive_count,
                    "negative": negative_count,
                    "neutral": neutral_count
                },
                "articles": articles,
                "last_updated": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting news summary: {e}")
            return {
                "total_articles": 0,
                "overall_sentiment": "neutral",
                "sentiment_breakdown": {"positive": 0, "negative": 0, "neutral": 0},
                "articles": [],
                "last_updated": datetime.utcnow().isoformat()
            }

# Create service instance
indian_news_service = IndianNewsService()