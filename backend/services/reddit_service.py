"""
Reddit Sentiment Analysis Service for Indian Stock Communities
"""
import os
import asyncio
import praw
from datetime import datetime, timedelta
import google.generativeai as genai
from database.config import get_database, COLLECTIONS
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

class IndianRedditService:
    def __init__(self):
        self.reddit = praw.Reddit(
            client_id=os.getenv('REDDIT_CLIENT_ID'),
            client_secret=os.getenv('REDDIT_CLIENT_SECRET'),
            user_agent=os.getenv('REDDIT_USER_AGENT')
        )
        genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))
        self.model = genai.GenerativeModel('gemini-1.5-pro')
        
        # Indian stock-focused subreddits and keywords
        self.indian_subreddits = [
            'IndiaInvestments',
            'IndianStreetBets', 
            'india',
            'investing',
            'stocks',
            'SecurityAnalysis'
        ]
        
        self.indian_stock_keywords = [
            'NIFTY', 'SENSEX', 'BSE', 'NSE', 'Reliance', 'TCS', 'Infosys',
            'HDFC', 'ICICI', 'Adani', 'Tata', 'Wipro', 'HUL', 'ITC',
            'Indian stocks', 'rupee', 'RBI', 'Indian market'
        ]

    async def fetch_indian_stock_discussions(self, hours_back: int = 24) -> List[Dict]:
        """Fetch Reddit discussions about Indian stocks"""
        try:
            all_posts = []
            cutoff_time = datetime.utcnow() - timedelta(hours=hours_back)
            
            for subreddit_name in self.indian_subreddits:
                try:
                    subreddit = self.reddit.subreddit(subreddit_name)
                    
                    # Get hot posts
                    for post in subreddit.hot(limit=50):
                        post_time = datetime.utcfromtimestamp(post.created_utc)
                        if post_time < cutoff_time:
                            continue
                            
                        # Check if post is related to Indian stocks
                        title_lower = post.title.lower()
                        selftext_lower = (post.selftext or '').lower()
                        
                        is_indian_stock_related = any(
                            keyword.lower() in title_lower or keyword.lower() in selftext_lower
                            for keyword in self.indian_stock_keywords
                        )
                        
                        if is_indian_stock_related:
                            # Get top comments
                            post.comments.replace_more(limit=0)
                            top_comments = []
                            for comment in post.comments[:10]:  # Top 10 comments
                                if hasattr(comment, 'body') and len(comment.body) > 20:
                                    top_comments.append({
                                        'body': comment.body,
                                        'score': comment.score,
                                        'created_utc': comment.created_utc
                                    })
                            
                            all_posts.append({
                                'id': post.id,
                                'title': post.title,
                                'selftext': post.selftext,
                                'subreddit': subreddit_name,
                                'score': post.score,
                                'upvote_ratio': post.upvote_ratio,
                                'num_comments': post.num_comments,
                                'created_utc': post.created_utc,
                                'url': post.url,
                                'comments': top_comments,
                                'permalink': f"https://reddit.com{post.permalink}"
                            })
                            
                except Exception as e:
                    logger.warning(f"⚠️ Error fetching from r/{subreddit_name}: {e}")
                    continue
            
            logger.info(f"🔍 Found {len(all_posts)} Indian stock-related Reddit posts")
            return all_posts
            
        except Exception as e:
            logger.error(f"❌ Error fetching Reddit discussions: {e}")
            return []

    async def analyze_reddit_sentiment(self, post: Dict) -> Dict:
        """Analyze sentiment of Reddit post using Gemini AI"""
        try:
            # Combine post content
            full_text = f"Title: {post['title']}\n"
            if post.get('selftext'):
                full_text += f"Content: {post['selftext']}\n"
            
            # Add top comments
            if post.get('comments'):
                full_text += "Top Comments:\n"
                for comment in post['comments'][:5]:
                    full_text += f"- {comment['body'][:200]}...\n"
            
            prompt = f"""
            Analyze the sentiment of this Indian stock market discussion from Reddit:
            
            {full_text}
            
            Provide analysis in JSON format:
            {{
                "overall_sentiment": "bullish/bearish/neutral",
                "confidence_score": 0.0-1.0,
                "market_impact": "positive/negative/neutral",
                "mentioned_stocks": ["stock1", "stock2"],
                "key_themes": ["theme1", "theme2"],
                "sentiment_score": -1.0 to 1.0,
                "community_mood": "excited/concerned/optimistic/pessimistic/neutral",
                "indian_market_relevance": "high/medium/low"
            }}
            
            Focus on:
            1. Indian stocks (NIFTY, SENSEX, individual stocks)
            2. Market sentiment and investor mood
            3. Specific stock mentions and opinions
            4. Indian market conditions and outlook
            """
            
            response = await asyncio.to_thread(
                self.model.generate_content, prompt
            )
            
            import json
            try:
                result = json.loads(response.text.strip().replace('```json', '').replace('```', ''))
                return result
            except:
                # Fallback analysis
                return {
                    "overall_sentiment": "neutral",
                    "confidence_score": 0.5,
                    "market_impact": "neutral",
                    "mentioned_stocks": [],
                    "key_themes": [],
                    "sentiment_score": 0.0,
                    "community_mood": "neutral",
                    "indian_market_relevance": "medium"
                }
                
        except Exception as e:
            logger.error(f"❌ Error analyzing Reddit sentiment: {e}")
            return {
                "overall_sentiment": "neutral",
                "confidence_score": 0.5,
                "market_impact": "neutral",
                "mentioned_stocks": [],
                "key_themes": [],
                "sentiment_score": 0.0,
                "community_mood": "neutral",
                "indian_market_relevance": "low"
            }

    async def save_reddit_data_to_db(self, posts: List[Dict]) -> int:
        """Save Reddit analysis to MongoDB"""
        try:
            db = await get_database()
            collection = db[COLLECTIONS["reddit_posts"]]
            
            processed_posts = []
            for post in posts:
                # Analyze sentiment
                sentiment = await self.analyze_reddit_sentiment(post)
                
                doc = {
                    "reddit_id": post["id"],
                    "title": post["title"],
                    "selftext": post.get("selftext", ""),
                    "subreddit": post["subreddit"],
                    "score": post["score"],
                    "upvote_ratio": post["upvote_ratio"],
                    "num_comments": post["num_comments"],
                    "created_utc": post["created_utc"],
                    "permalink": post["permalink"],
                    "comments_sample": post.get("comments", [])[:5],  # Store top 5 comments
                    "sentiment_analysis": sentiment,
                    "created_at": datetime.utcnow(),
                    "market_region": "india",
                    "processed": True
                }
                processed_posts.append(doc)
            
            if processed_posts:
                for doc in processed_posts:
                    await collection.update_one(
                        {"reddit_id": doc["reddit_id"]},
                        {"$set": doc},
                        upsert=True
                    )
                
                logger.info(f"💾 Saved {len(processed_posts)} Reddit posts to database")
                return len(processed_posts)
            
            return 0
            
        except Exception as e:
            logger.error(f"❌ Error saving Reddit data: {e}")
            return 0

    async def get_reddit_sentiment_summary(self) -> Dict:
        """Get summary of Reddit sentiment for Indian stocks"""
        try:
            db = await get_database()
            collection = db[COLLECTIONS["reddit_posts"]]
            
            # Get recent posts (last 24 hours)
            cursor = collection.find({
                "market_region": "india",
                "created_at": {"$gte": datetime.utcnow() - timedelta(hours=24)}
            }).sort("created_at", -1)
            
            posts = await cursor.to_list(length=None)
            
            # Convert ObjectId to string for JSON serialization
            for post in posts:
                if "_id" in post:
                    post["_id"] = str(post["_id"])
            
            if not posts:
                return {
                    "total_posts": 0,
                    "overall_sentiment": "neutral",
                    "community_mood": "neutral",
                    "top_mentioned_stocks": [],
                    "sentiment_breakdown": {"bullish": 0, "bearish": 0, "neutral": 0}
                }
            
            # Analyze sentiment breakdown
            sentiments = [post["sentiment_analysis"]["overall_sentiment"] for post in posts]
            bullish_count = sentiments.count("bullish")
            bearish_count = sentiments.count("bearish") 
            neutral_count = sentiments.count("neutral")
            
            # Get top mentioned stocks
            all_stocks = []
            for post in posts:
                all_stocks.extend(post["sentiment_analysis"].get("mentioned_stocks", []))
            
            stock_counts = {}
            for stock in all_stocks:
                stock_counts[stock] = stock_counts.get(stock, 0) + 1
            
            top_stocks = sorted(stock_counts.items(), key=lambda x: x[1], reverse=True)[:10]
            
            # Overall sentiment
            total = len(sentiments)
            if bullish_count > bearish_count and bullish_count > neutral_count:
                overall_sentiment = "bullish"
            elif bearish_count > bullish_count and bearish_count > neutral_count:
                overall_sentiment = "bearish"
            else:
                overall_sentiment = "neutral"
            
            return {
                "total_posts": len(posts),
                "overall_sentiment": overall_sentiment,
                "sentiment_breakdown": {
                    "bullish": bullish_count,
                    "bearish": bearish_count,
                    "neutral": neutral_count
                },
                "top_mentioned_stocks": [{"stock": stock, "mentions": count} for stock, count in top_stocks],
                "posts_sample": posts[:10],  # Recent 10 posts
                "last_updated": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting Reddit sentiment summary: {e}")
            return {
                "total_posts": 0,
                "overall_sentiment": "neutral",
                "sentiment_breakdown": {"bullish": 0, "bearish": 0, "neutral": 0},
                "top_mentioned_stocks": [],
                "posts_sample": [],
                "last_updated": datetime.utcnow().isoformat()
            }

# Create service instance
indian_reddit_service = IndianRedditService()