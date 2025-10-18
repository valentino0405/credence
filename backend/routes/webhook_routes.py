"""
Clerk Webhook Handler for User Management
Handles user creation, updates, and portfolio initialization
"""
from fastapi import APIRouter, Request, HTTPException
from database.config import get_database, COLLECTIONS
import logging
import json
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])

@router.get("/test")
async def test_webhook_endpoint():
    """Test webhook endpoint to verify it's working"""
    return {
        "status": "success",
        "message": "Webhook endpoint is working!",
        "timestamp": datetime.utcnow().isoformat()
    }

@router.post("/clerk")
async def handle_clerk_webhook(request: Request):
    """Handle Clerk user events"""
    try:
        # Get the webhook payload
        payload = await request.json()
        event_type = payload.get("type")
        
        logger.info(f"Received Clerk webhook: {event_type}")
        
        if event_type == "user.created":
            await handle_user_created(payload["data"])
        elif event_type == "user.updated":
            await handle_user_updated(payload["data"])
        elif event_type == "user.deleted":
            await handle_user_deleted(payload["data"])
        
        return {"status": "success", "message": f"Processed {event_type}"}
        
    except Exception as e:
        logger.error(f"Error processing Clerk webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_user_created(user_data):
    """Initialize user portfolio when user signs up"""
    try:
        user_id = user_data.get("id")
        email = user_data.get("email_addresses", [{}])[0].get("email_address")
        
        db = await get_database()
        if not db:
            logger.error("Database not available")
            return
        
    # Initialize user portfolio with INR 10,00,000 virtual money
        portfolio_doc = {
            "user_id": user_id,
            "email": email,
            "cash_balance": 1000000.0,  # INR 10 lakh starting money
            "total_value": 1000000.0,
            "holdings": [],
            "total_profit_loss": 0.0,
            "total_trades": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await db[COLLECTIONS["user_portfolios"]].insert_one(portfolio_doc)
        
        # Initialize empty watchlist
        watchlist_doc = {
            "user_id": user_id,
            "stocks": ["RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS"],  # Default watchlist
            "created_at": datetime.utcnow()
        }
        
        await db[COLLECTIONS["user_watchlists"]].insert_one(watchlist_doc)
        
        logger.info(f"Initialized portfolio for user {user_id}")
        
    except Exception as e:
        logger.error(f"Error initializing user portfolio: {e}")

async def handle_user_updated(user_data):
    """Handle user profile updates"""
    try:
        user_id = user_data.get("id")
        # Update user profile data if needed
        logger.info(f"Updated user profile: {user_id}")
        
    except Exception as e:
        logger.error(f"Error updating user: {e}")

async def handle_user_deleted(user_data):
    """Clean up user data when account is deleted"""
    try:
        user_id = user_data.get("id")
        
        db = await get_database()
        if not db:
            return
        
        # Delete user portfolio
        await db[COLLECTIONS["user_portfolios"]].delete_one({"user_id": user_id})
        # Delete user trades
        await db[COLLECTIONS["user_trades"]].delete_one({"user_id": user_id})
        # Delete user watchlist
        await db[COLLECTIONS["user_watchlists"]].delete_one({"user_id": user_id})
        
        logger.info(f"Cleaned up data for deleted user: {user_id}")
        
    except Exception as e:
        logger.error(f"Error cleaning up user data: {e}")