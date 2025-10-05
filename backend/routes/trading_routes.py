"""
Trading API Routes
Mock trading simulation endpoints for buying/selling stocks
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from services.trading_service import trading_service
from services.stock_data_service import indian_stock_service
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/trading", tags=["Trading Simulation"])

# Request models
class BuyOrderRequest(BaseModel):
    user_id: str
    symbol: str
    quantity: int

class SellOrderRequest(BaseModel):
    user_id: str
    symbol: str
    quantity: int

@router.get("/portfolio/{user_id}")
async def get_user_portfolio(user_id: str):
    """Get user's complete portfolio with current values"""
    try:
        portfolio = await trading_service.get_user_portfolio(user_id)
        return {
            "status": "success",
            "data": portfolio
        }
    except Exception as e:
        logger.error(f"❌ Error getting portfolio: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/buy")
async def place_buy_order(order: BuyOrderRequest):
    """Place a buy order"""
    try:
        if order.quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be positive")
        
        result = await trading_service.place_buy_order(
            order.user_id, 
            order.symbol, 
            order.quantity
        )
        
        if result["success"]:
            return {
                "status": "success",
                "message": result["message"],
                "data": result.get("trade_details", {})
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error placing buy order: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sell")
async def place_sell_order(order: SellOrderRequest):
    """Place a sell order"""
    try:
        if order.quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be positive")
        
        result = await trading_service.place_sell_order(
            order.user_id, 
            order.symbol, 
            order.quantity
        )
        
        if result["success"]:
            return {
                "status": "success",
                "message": result["message"],
                "data": result.get("trade_details", {})
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error placing sell order: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/{user_id}")
async def get_trade_history(user_id: str, limit: int = Query(50, ge=1, le=200)):
    """Get user's trade history"""
    try:
        trades = await trading_service.get_trade_history(user_id, limit)
        return {
            "status": "success",
            "data": {
                "trades": trades,
                "total": len(trades)
            }
        }
    except Exception as e:
        logger.error(f"❌ Error getting trade history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stock/{symbol}")
async def get_stock_data(symbol: str):
    """Get real-time stock data for trading"""
    try:
        stock_data = await indian_stock_service.get_real_time_price(symbol)
        return {
            "status": "success",
            "data": stock_data
        }
    except Exception as e:
        logger.error(f"❌ Error getting stock data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stocks/search")
async def search_stocks(q: str = Query(..., min_length=1)):
    """Search for stocks"""
    try:
        stocks = await indian_stock_service.search_stocks(q)
        return {
            "status": "success",
            "data": {
                "stocks": stocks,
                "query": q
            }
        }
    except Exception as e:
        logger.error(f"❌ Error searching stocks: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/watchlist/{user_id}")
async def get_user_watchlist(user_id: str):
    """Get user's watchlist with current prices"""
    try:
        # For now, return default watchlist - later we'll make it user-customizable
        default_symbols = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS"]
        watchlist_data = await indian_stock_service.get_watchlist_data(default_symbols)
        
        return {
            "status": "success",
            "data": {
                "watchlist": watchlist_data,
                "user_id": user_id
            }
        }
    except Exception as e:
        logger.error(f"❌ Error getting watchlist: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/market-overview")
async def get_market_overview():
    """Get market overview with indices and top stocks"""
    try:
        logger.info("🏪 Getting market overview...")
        
        # Get major indices
        indices = ["^NSEI", "^BSESN"]  # NIFTY and SENSEX
        indices_data = await indian_stock_service.get_watchlist_data(indices)
        
        # Get top stocks
        top_stocks = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS"]
        stocks_data = await indian_stock_service.get_watchlist_data(top_stocks)
        
        logger.info(f"✅ Market overview: {len(indices_data)} indices, {len(stocks_data)} stocks")
        
        return {
            "status": "success",
            "data": {
                "indices": indices_data,
                "top_stocks": stocks_data,
                "market_status": "open",  # TODO: Add real market hours check
                "last_updated": "now"
            }
        }
    except Exception as e:
        logger.error(f"❌ Error getting market overview: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/available-stocks")
async def get_available_stocks():
    """Get all available Indian stocks for trading"""
    try:
        logger.info("📋 Getting available Indian stocks...")
        
        # Get all available stocks with basic info
        stocks = []
        for symbol, name in indian_stock_service.indian_stocks.items():
            stocks.append({
                "symbol": symbol,
                "name": name,
                "exchange": "NSE"
            })
        
        logger.info(f"✅ Found {len(stocks)} available stocks")
        
        return {
            "status": "success",
            "data": {
                "stocks": stocks,
                "total_count": len(stocks)
            }
        }
    except Exception as e:
        logger.error(f"❌ Error getting available stocks: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search")
async def search_stocks(q: str = Query(..., min_length=1)):
    """Search for stocks by name or symbol"""
    try:
        results = await indian_stock_service.search_stocks(q)
        return {
            "status": "success",
            "data": {
                "query": q,
                "results": results
            }
        }
    except Exception as e:
        logger.error(f"❌ Error searching stocks: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stock/{symbol}/chart")
async def get_stock_chart_data(symbol: str, period: str = Query("1mo", regex="^(1d|5d|1mo|3mo|6mo|1y)$")):
    """Get historical chart data for a stock"""
    try:
        chart_data = await indian_stock_service.get_historical_data(symbol, period)
        return {
            "status": "success",
            "data": {
                "symbol": symbol,
                "period": period,
                "chart_data": chart_data
            }
        }
    except Exception as e:
        logger.error(f"❌ Error getting chart data: {e}")
        raise HTTPException(status_code=500, detail=str(e))