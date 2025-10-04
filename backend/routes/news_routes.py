"""
News & Sentiment Analysis API Routes
Indian market focused endpoints
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from datetime import datetime
from services.news_service import indian_news_service
from services.reddit_service import indian_reddit_service
from database.config import get_database, COLLECTIONS
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/news", tags=["News & Sentiment"])

@router.get("/indian-market-sentiment")
async def get_indian_market_sentiment():
    """Get overall Indian market sentiment from news and social media"""
    try:
        # Check if database is available
        db = await get_database()
        if db is None:
            # Return demo data if database is offline
            return {
                "status": "success",
                "data": {
                    "overall_sentiment": "bullish",
                    "sentiment_score": 0.72,
                    "confidence": "medium",
                    "news_analysis": {
                        "total_articles": 15,
                        "overall_sentiment": "positive",
                        "sentiment_breakdown": {"positive": 9, "negative": 3, "neutral": 3},
                        "articles": [],
                        "last_updated": datetime.utcnow().isoformat()
                    },
                    "reddit_analysis": {
                        "total_posts": 8,
                        "overall_sentiment": "bullish",
                        "sentiment_breakdown": {"bullish": 5, "bearish": 1, "neutral": 2},
                        "top_mentioned_stocks": [
                            {"stock": "RELIANCE", "mentions": 12},
                            {"stock": "TCS", "mentions": 8},
                            {"stock": "INFY", "mentions": 6}
                        ],
                        "posts_sample": [],
                        "last_updated": datetime.utcnow().isoformat()
                    },
                    "total_data_points": 23,
                    "last_updated": datetime.utcnow().isoformat(),
                    "market_region": "india",
                    "demo_mode": True
                }
            }
        
        # Get real data if database is available
        news_summary = await indian_news_service.get_latest_news_summary(limit=50)
        reddit_summary = await indian_reddit_service.get_reddit_sentiment_summary()
        
        # Combine sentiments for overall score
        news_positive = news_summary["sentiment_breakdown"]["positive"]
        news_negative = news_summary["sentiment_breakdown"]["negative"]
        
        reddit_bullish = reddit_summary["sentiment_breakdown"]["bullish"]
        reddit_bearish = reddit_summary["sentiment_breakdown"]["bearish"]
        
        total_positive = news_positive + reddit_bullish
        total_negative = news_negative + reddit_bearish
        total_signals = total_positive + total_negative
        
        if total_signals == 0:
            overall_sentiment = "neutral"
            sentiment_score = 0.5
        else:
            sentiment_ratio = total_positive / total_signals
            if sentiment_ratio > 0.6:
                overall_sentiment = "bullish"
            elif sentiment_ratio < 0.4:
                overall_sentiment = "bearish"
            else:
                overall_sentiment = "neutral"
            sentiment_score = sentiment_ratio
        
        return {
            "status": "success",
            "data": {
                "overall_sentiment": overall_sentiment,
                "sentiment_score": round(sentiment_score, 2),
                "confidence": "high" if total_signals > 20 else "medium" if total_signals > 10 else "low",
                "news_analysis": news_summary,
                "reddit_analysis": reddit_summary,
                "total_data_points": total_signals,
                "last_updated": datetime.utcnow().isoformat(),
                "market_region": "india"
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting market sentiment: {e}")
        # Return demo data on error
        return {
            "status": "success",
            "data": {
                "overall_sentiment": "neutral",
                "sentiment_score": 0.5,
                "confidence": "low",
                "news_analysis": {
                    "total_articles": 0,
                    "overall_sentiment": "neutral",
                    "sentiment_breakdown": {"positive": 0, "negative": 0, "neutral": 0},
                    "articles": [],
                    "last_updated": datetime.utcnow().isoformat()
                },
                "reddit_analysis": {
                    "total_posts": 0,
                    "overall_sentiment": "neutral",
                    "sentiment_breakdown": {"bullish": 0, "bearish": 0, "neutral": 0},
                    "top_mentioned_stocks": [],
                    "posts_sample": [],
                    "last_updated": datetime.utcnow().isoformat()
                },
                "total_data_points": 0,
                "last_updated": datetime.utcnow().isoformat(),
                "market_region": "india",
                "error": str(e),
                "demo_mode": True
            }
        }

@router.get("/latest-news")
async def get_latest_indian_news(limit: int = 20):
    """Get latest Indian financial news with sentiment analysis"""
    try:
        news_summary = await indian_news_service.get_latest_news_summary(limit=limit)
        
        return {
            "status": "success", 
            "data": news_summary
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting latest news: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching news: {str(e)}")

@router.get("/reddit-sentiment")
async def get_reddit_indian_sentiment():
    """Get Reddit sentiment analysis for Indian stocks"""
    try:
        reddit_summary = await indian_reddit_service.get_reddit_sentiment_summary()
        
        return {
            "status": "success",
            "data": reddit_summary
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting Reddit sentiment: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching Reddit sentiment: {str(e)}")

@router.post("/refresh-news")
async def refresh_indian_news(background_tasks: BackgroundTasks):
    """Refresh Indian news data (background task)"""
    try:
        background_tasks.add_task(fetch_and_process_news)
        
        return {
            "status": "success",
            "message": "News refresh started in background",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Error starting news refresh: {e}")
        raise HTTPException(status_code=500, detail=f"Error starting refresh: {str(e)}")

@router.post("/refresh-reddit")
async def refresh_reddit_data(background_tasks: BackgroundTasks):
    """Refresh Reddit sentiment data (background task)"""
    try:
        background_tasks.add_task(fetch_and_process_reddit)
        
        return {
            "status": "success", 
            "message": "Reddit data refresh started in background",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Error starting Reddit refresh: {e}")
        raise HTTPException(status_code=500, detail=f"Error starting refresh: {str(e)}")

@router.post("/populate-sample-data")
async def populate_sample_data():
    """Populate database with sample Indian market news data"""
    try:
        logger.info("🔄 Starting to populate sample data...")
        
        # Fetch real news
        articles = await indian_news_service.fetch_indian_financial_news(hours_back=48)
        
        if articles:
            saved_count = await indian_news_service.save_news_to_db(articles)
            logger.info(f"💾 Saved {saved_count} articles to database")
            
            return {
                "status": "success",
                "message": f"Successfully populated {saved_count} news articles",
                "articles_fetched": len(articles),
                "articles_saved": saved_count,
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            return {
                "status": "success",
                "message": "No new articles found to populate",
                "articles_fetched": 0,
                "articles_saved": 0,
                "timestamp": datetime.utcnow().isoformat()
            }
        
    except Exception as e:
        logger.error(f"❌ Error populating sample data: {e}")
        raise HTTPException(status_code=500, detail=f"Error populating data: {str(e)}")

@router.get("/debug-db")
async def debug_database():
    """Debug endpoint to check database contents"""
    try:
        db = await get_database()
        news_collection = db[COLLECTIONS["news_articles"]]
        
        # Count total documents
        total_count = await news_collection.count_documents({})
        india_count = await news_collection.count_documents({"market_region": "india"})
        
        # Get a sample document
        sample_doc = await news_collection.find_one({})
        
        # Convert ObjectId to string for JSON serialization
        if sample_doc and "_id" in sample_doc:
            sample_doc["_id"] = str(sample_doc["_id"])
        
        return {
            "total_articles": total_count,
            "india_articles": india_count,
            "sample_document": sample_doc,
            "collections": COLLECTIONS
        }
        
    except Exception as e:
        logger.error(f"❌ Error in debug endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Debug error: {str(e)}")

@router.post("/populate-mock-data")
async def populate_mock_data():
    """Populate database with mock Indian market data for testing"""
    try:
        logger.info("🔄 Populating mock data for testing...")
        
        # Generate mock data
        from generate_mock_data import generate_mock_indian_news, generate_mock_reddit_posts
        
        mock_articles = generate_mock_indian_news()
        mock_reddit = generate_mock_reddit_posts()
        
        # Save mock news to database
        db = await get_database()
        news_collection = db[COLLECTIONS["news_articles"]]
        reddit_collection = db[COLLECTIONS["reddit_posts"]]
        
        # Insert mock news articles
        if mock_articles:
            for article in mock_articles:
                await news_collection.update_one(
                    {"url": article["url"]},
                    {"$set": article},
                    upsert=True
                )
        
        # Insert mock Reddit posts
        if mock_reddit:
            for post in mock_reddit:
                await reddit_collection.update_one(
                    {"reddit_id": post["reddit_id"]},
                    {"$set": post},
                    upsert=True
                )
        
        logger.info(f"💾 Saved {len(mock_articles)} mock articles and {len(mock_reddit)} mock Reddit posts")
        
        return {
            "status": "success",
            "message": f"Successfully populated {len(mock_articles)} mock news articles and {len(mock_reddit)} Reddit posts",
            "articles_saved": len(mock_articles),
            "reddit_posts_saved": len(mock_reddit),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Error populating mock data: {e}")
        raise HTTPException(status_code=500, detail=f"Error populating mock data: {str(e)}")

@router.get("/sentiment-history")
async def get_sentiment_history(days: int = 7):
    """Get historical sentiment trends for Indian market"""
    try:
        db = await get_database()
        
        # Get historical sentiment data
        from datetime import timedelta
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # News sentiment history
        news_collection = db[COLLECTIONS["news_articles"]]
        news_cursor = news_collection.find({
            "market_region": "india",
            "created_at": {"$gte": start_date}
        }).sort("created_at", 1)
        
        news_articles = await news_cursor.to_list(length=None)
        
        # Group by day and calculate daily sentiment
        daily_sentiment = {}
        for article in news_articles:
            day = article["created_at"].date().isoformat()
            if day not in daily_sentiment:
                daily_sentiment[day] = {"positive": 0, "negative": 0, "neutral": 0}
            
            sentiment = article.get("sentiment_analysis", {}).get("overall_sentiment", "neutral")
            daily_sentiment[day][sentiment] += 1
        
        # Convert to time series format
        sentiment_history = []
        for day, counts in sorted(daily_sentiment.items()):
            total = sum(counts.values())
            if total > 0:
                sentiment_history.append({
                    "date": day,
                    "positive_ratio": counts["positive"] / total,
                    "negative_ratio": counts["negative"] / total,
                    "neutral_ratio": counts["neutral"] / total,
                    "total_articles": total
                })
        
        return {
            "status": "success",
            "data": {
                "sentiment_history": sentiment_history,
                "period_days": days,
                "total_data_points": len(news_articles),
                "generated_at": datetime.utcnow().isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting sentiment history: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching sentiment history: {str(e)}")

# Background task functions
async def fetch_and_process_news():
    """Background task to fetch and process news"""
    try:
        logger.info("🔄 Starting news fetch background task...")
        articles = await indian_news_service.fetch_indian_financial_news(hours_back=24)
        saved_count = await indian_news_service.save_news_to_db(articles)
        logger.info(f"✅ Background news task completed: {saved_count} articles processed")
    except Exception as e:
        logger.error(f"❌ Background news task failed: {e}")

async def fetch_and_process_reddit():
    """Background task to fetch and process Reddit data"""
    try:
        logger.info("🔄 Starting Reddit fetch background task...")
        posts = await indian_reddit_service.fetch_indian_stock_discussions(hours_back=24)
        saved_count = await indian_reddit_service.save_reddit_data_to_db(posts)
        logger.info(f"✅ Background Reddit task completed: {saved_count} posts processed")
    except Exception as e:
        logger.error(f"❌ Background Reddit task failed: {e}")