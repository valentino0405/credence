"""
Indian RSS News Service
Fetches and processes Indian financial news from RSS feeds
"""
import os
import asyncio
import aiohttp
import feedparser
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from google import genai
from textblob import TextBlob
from database.config import get_database, COLLECTIONS
import logging
from typing import List, Dict, Optional
import re

logger = logging.getLogger(__name__)

class IndianRSSNewsService:
    def __init__(self):
        # Initialize Gemini client - using the same pattern as our working test
        self.client = genai.Client()
        
        # Indian financial RSS feeds
        self.rss_feeds = {
            'Economic Times': 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',
            'Business Standard': 'https://www.business-standard.com/rss/markets.rss',
            'MoneyControl': 'https://www.moneycontrol.com/rss/business.xml',
            'LiveMint': 'https://www.livemint.com/rss/markets'
        }
        
        # Indian stock market keywords
        self.indian_stock_keywords = [
            'NIFTY', 'SENSEX', 'BSE', 'NSE', 'Reliance', 'TCS', 'Infosys', 'HDFC', 
            'ICICI', 'Wipro', 'ITC', 'SBI', 'Bajaj', 'Maruti', 'Airtel', 'Adani',
            'Indian stock market', 'Indian markets', 'Mumbai markets', 'Dalal Street',
            'RBI', 'rupee', 'Indian economy'
        ]

    async def fetch_rss_news(self, hours_back: int = 24) -> List[Dict]:
        """Fetch news from RSS feeds"""
        try:
            logger.info(f"Fetching RSS news from last {hours_back} hours...")
            all_articles = []
            cutoff_time = datetime.utcnow() - timedelta(hours=hours_back)
            
            async with aiohttp.ClientSession() as session:
                for source_name, rss_url in self.rss_feeds.items():
                    try:
                        logger.info(f"Fetching from {source_name}...")
                        
                        # Fetch RSS feed
                        async with session.get(rss_url, timeout=30) as response:
                            if response.status == 200:
                                rss_content = await response.text()
                                feed = feedparser.parse(rss_content)
                                
                                for entry in feed.entries:
                                    # Parse publication date
                                    if hasattr(entry, 'published_parsed') and entry.published_parsed:
                                        pub_date = datetime(*entry.published_parsed[:6])
                                    elif hasattr(entry, 'updated_parsed') and entry.updated_parsed:
                                        pub_date = datetime(*entry.updated_parsed[:6])
                                    else:
                                        pub_date = datetime.utcnow()
                                    
                                    # Check if article is recent enough
                                    if pub_date < cutoff_time:
                                        continue
                                    
                                    # Check if related to Indian stocks
                                    title = entry.get('title', '')
                                    description = entry.get('description', '') or entry.get('summary', '')
                                    
                                    is_stock_related = any(
                                        keyword.lower() in title.lower() or 
                                        keyword.lower() in description.lower()
                                        for keyword in self.indian_stock_keywords
                                    )
                                    
                                    if is_stock_related:
                                        logger.info(f"Found relevant article: {title[:50]}...")
                                        
                                        # Clean HTML from description
                                        clean_description = BeautifulSoup(description, 'html.parser').get_text()
                                        
                                        article = {
                                            'title': title.strip(),
                                            'description': clean_description.strip(),
                                            'content': clean_description.strip(),  # RSS usually has limited content
                                            'url': entry.get('link', ''),
                                            'source': source_name,
                                            'published_at': pub_date.isoformat(),
                                            'url_to_image': self._extract_image_url(entry),
                                            'created_at': datetime.utcnow(),
                                            'market_region': 'india',
                                            'processed': False
                                        }
                                        
                                        all_articles.append(article)
                                        
                            else:
                                logger.warning(f"Failed to fetch {source_name}: HTTP {response.status}")
                                
                    except Exception as e:
                        logger.warning(f"Error fetching from {source_name}: {e}")
                        continue
            
            logger.info(f"Found {len(all_articles)} relevant Indian financial news articles")
            
            # Sort by published date (most recent first) and limit to top 5 for quick processing
            all_articles.sort(key=lambda x: x['published_at'], reverse=True)
            limited_articles = all_articles[:5]  # Process only top 5 most recent articles
            
            if len(all_articles) > 5:
                logger.info(f"Limited to top {len(limited_articles)} most recent articles for fast processing")
            
            return limited_articles
            
        except Exception as e:
            logger.error(f"Error fetching RSS news: {e}")
            return []

    def _extract_image_url(self, entry) -> Optional[str]:
        """Extract image URL from RSS entry"""
        try:
            # Try different ways to get image
            if hasattr(entry, 'media_content') and entry.media_content:
                return entry.media_content[0].get('url')
            elif hasattr(entry, 'enclosures') and entry.enclosures:
                for enclosure in entry.enclosures:
                    if 'image' in enclosure.get('type', ''):
                        return enclosure.get('href')
            elif hasattr(entry, 'description'):
                # Extract image from HTML description
                soup = BeautifulSoup(entry.description, 'html.parser')
                img_tag = soup.find('img')
                if img_tag and img_tag.get('src'):
                    return img_tag.get('src')
        except:
            pass
        return None

    async def analyze_sentiment_with_gemini(self, text: str, title: str) -> Dict:
        """Analyze sentiment using Gemini AI for Indian market context"""
        try:
            prompt = f"""
            Analyze this Indian financial news sentiment quickly:
            
            Title: {title}
            Content: {text[:500]}
            
            Return JSON:
            {{
                "overall_sentiment": "positive/negative/neutral",
                "confidence_score": 0.7,
                "market_impact": "bullish/bearish/neutral",
                "key_entities": ["stock1", "stock2"],
                "impact_score": 0.7,
                "reasoning": "brief reason",
                "indian_context": "Indian market impact"
            }}
            """
            
            response = await asyncio.to_thread(
                self.client.models.generate_content,
                model="gemini-2.5-flash",
                contents=prompt
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
            logger.error(f"Error in Gemini sentiment analysis: {e}")
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
                    "source": article.get('source'),
                    "published_at": article.get('published_at'),
                    "url_to_image": article.get('url_to_image'),
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
                
                logger.info(f"Saved {len(processed_articles)} RSS news articles to database")
                return len(processed_articles)
            
            return 0
            
        except Exception as e:
            logger.error(f"Error saving news to database: {e}")
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
            logger.error(f"Error getting news summary: {e}")
            return {
                "total_articles": 0,
                "overall_sentiment": "neutral",
                "sentiment_breakdown": {"positive": 0, "negative": 0, "neutral": 0},
                "articles": [],
                "last_updated": datetime.utcnow().isoformat()
            }

# Create service instance
indian_rss_news_service = IndianRSSNewsService()