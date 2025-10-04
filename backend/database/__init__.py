"""
Database initialization
"""
from database.config import Database
import asyncio
import logging

logger = logging.getLogger(__name__)

async def init_database():
    """Initialize database connections and collections"""
    try:
        # Connect to database
        await Database.connect()
        Database.connect_sync()
        
        # Create indexes for better performance
        db = Database.client["credence"]
        
        # News articles indexes
        await db["indian_news_articles"].create_index("url", unique=True)
        await db["indian_news_articles"].create_index("created_at")
        await db["indian_news_articles"].create_index("market_region")
        
        # Reddit posts indexes
        await db["reddit_indian_stocks"].create_index("reddit_id", unique=True)
        await db["reddit_indian_stocks"].create_index("created_at")
        await db["reddit_indian_stocks"].create_index("market_region")
        
        logger.info("✅ Database initialized successfully")
        
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(init_database())