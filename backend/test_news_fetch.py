"""
Test script to fetch real Indian news data and populate the database
"""
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.news_service import indian_news_service
from services.reddit_service import indian_reddit_service
from database.config import Database
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_news_fetching():
    """Test script to fetch real news and populate database"""
    try:
        # Connect to database
        await Database.connect()
        Database.connect_sync()
        logger.info("Database connected")
        
        # Fetch Indian financial news
        logger.info("Fetching Indian financial news...")
        articles = await indian_news_service.fetch_indian_financial_news(hours_back=48)
        logger.info(f"Found {len(articles)} articles")
        
        if articles:
            # Save to database
            saved_count = await indian_news_service.save_news_to_db(articles)
            logger.info(f"Saved {saved_count} articles to database")
            
            # Get summary
            summary = await indian_news_service.get_latest_news_summary(limit=10)
            logger.info(f"Summary: {summary['total_articles']} articles, sentiment: {summary['overall_sentiment']}")
        
        # Test Reddit data (optional - might be slower)
        logger.info("Fetching Reddit discussions...")
        posts = await indian_reddit_service.fetch_indian_stock_discussions(hours_back=24)
        logger.info(f"Found {len(posts)} Reddit posts")
        
        if posts:
            saved_reddit = await indian_reddit_service.save_reddit_data_to_db(posts)
            logger.info(f"Saved {saved_reddit} Reddit posts to database")
        
        logger.info("Test completed successfully!")
        
    except Exception as e:
        logger.error(f"Test failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await Database.disconnect()

if __name__ == "__main__":
    asyncio.run(test_news_fetching())