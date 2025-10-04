"""
Database configuration and MongoDB connection
"""
import os
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from dotenv import load_dotenv
import logging

load_dotenv()
logger = logging.getLogger(__name__)

# MongoDB Configuration
MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME", "credence")

class Database:
    client: AsyncIOMotorClient = None
    sync_client: MongoClient = None
    
    @classmethod
    async def connect(cls):
        """Create async database connection"""
        try:
            cls.client = AsyncIOMotorClient(MONGODB_URI)
            # Test connection
            await cls.client.admin.command('ping')
            logger.info("✅ Connected to MongoDB Atlas successfully")
        except Exception as e:
            logger.error(f"❌ Failed to connect to MongoDB: {e}")
            raise
    
    @classmethod
    def connect_sync(cls):
        """Create sync database connection for non-async operations"""
        try:
            cls.sync_client = MongoClient(MONGODB_URI)
            cls.sync_client.admin.command('ping')
            logger.info("✅ Sync MongoDB connection established")
        except Exception as e:
            logger.error(f"❌ Failed to create sync MongoDB connection: {e}")
            raise
    
    @classmethod
    async def disconnect(cls):
        """Close database connection"""
        if cls.client:
            cls.client.close()
        if cls.sync_client:
            cls.sync_client.close()
        logger.info("🔌 Database connections closed")

# Database instances
async def get_database():
    """Get async database instance"""
    if Database.client is None:
        await Database.connect()
    return Database.client[DB_NAME]

def get_sync_database():
    """Get sync database instance"""
    if Database.sync_client is None:
        Database.connect_sync()
    return Database.sync_client[DB_NAME]

# Collection names for Indian market data
COLLECTIONS = {
    "news_articles": "indian_news_articles",
    "market_sentiment": "indian_market_sentiment", 
    "reddit_posts": "reddit_indian_stocks",
    "stock_predictions": "indian_stock_predictions",
    "economic_indicators": "indian_economic_data",
    "user_preferences": "user_preferences",
    "market_analysis": "indian_market_analysis"
}