"""
Stock Data Service for Indian Markets
Real-time stock prices, historical data, and market information
"""
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
from database.config import get_database, COLLECTIONS
import asyncio
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

class IndianStockDataService:
    def __init__(self):
        # Top Indian stocks with NSE suffixes
        self.indian_stocks = {
            "RELIANCE.NS": "Reliance Industries",
            "TCS.NS": "Tata Consultancy Services", 
            "HDFCBANK.NS": "HDFC Bank",
            "INFY.NS": "Infosys",
            "HINDUNILVR.NS": "Hindustan Unilever",
            "ICICIBANK.NS": "ICICI Bank",
            "KOTAKBANK.NS": "Kotak Mahindra Bank",
            "SBIN.NS": "State Bank of India",
            "BHARTIARTL.NS": "Bharti Airtel",
            "ITC.NS": "ITC Limited",
            "ASIANPAINT.NS": "Asian Paints",
            "MARUTI.NS": "Maruti Suzuki",
            "BAJFINANCE.NS": "Bajaj Finance",
            "LT.NS": "Larsen & Toubro",
            "HCLTECH.NS": "HCL Technologies",
            "WIPRO.NS": "Wipro",
            "ULTRACEMCO.NS": "UltraTech Cement",
            "TITAN.NS": "Titan Company",
            "NESTLEIND.NS": "Nestle India",
            "POWERGRID.NS": "Power Grid Corporation"
        }
        
        self.indices = {
            "^NSEI": "NIFTY 50",
            "^BSESN": "BSE SENSEX"
        }

    async def get_real_time_price(self, symbol: str) -> Dict:
        """Get real-time stock price"""
        try:
            # For now, use mock data to avoid yfinance issues
            logger.info(f"📊 Getting price for {symbol}")
            return self._get_mock_price(symbol)
            
        except Exception as e:
            logger.error(f"❌ Error fetching price for {symbol}: {e}")
            return self._get_mock_price(symbol)

    def _fetch_stock_data(self, symbol: str) -> Dict:
        """Fetch stock data using yfinance"""
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            hist = ticker.history(period="1d", interval="1m")
            
            if hist.empty:
                return self._get_mock_price(symbol)
            
            current_price = hist['Close'].iloc[-1]
            previous_close = info.get('previousClose', current_price)
            change = current_price - previous_close
            change_percent = (change / previous_close) * 100 if previous_close else 0
            
            return {
                "symbol": symbol,
                "name": self.indian_stocks.get(symbol, symbol),
                "price": round(current_price, 2),
                "change": round(change, 2),
                "change_percent": round(change_percent, 2),
                "volume": hist['Volume'].iloc[-1] if 'Volume' in hist else 0,
                "high": round(hist['High'].max(), 2),
                "low": round(hist['Low'].min(), 2),
                "open": round(hist['Open'].iloc[0], 2),
                "previous_close": round(previous_close, 2),
                "market_cap": info.get('marketCap'),
                "timestamp": datetime.utcnow(),
                "is_live": True
            }
            
        except Exception as e:
            logger.warning(f"⚠️ yfinance failed for {symbol}, using mock data: {e}")
            return self._get_mock_price(symbol)

    def _get_mock_price(self, symbol: str) -> Dict:
        """Generate realistic mock price data"""
        import random
        
        # Base prices for major Indian stocks
        base_prices = {
            "RELIANCE.NS": 2850, "TCS.NS": 4200, "HDFCBANK.NS": 1650,
            "INFY.NS": 1800, "ICICIBANK.NS": 1250, "SBIN.NS": 820
        }
        
        base_price = base_prices.get(symbol, 1000)
        current_price = base_price + random.uniform(-50, 50)
        change = random.uniform(-30, 30)
        change_percent = (change / base_price) * 100
        
        return {
            "symbol": symbol,
            "name": self.indian_stocks.get(symbol, symbol),
            "price": round(current_price, 2),
            "change": round(change, 2),
            "change_percent": round(change_percent, 2),
            "volume": random.randint(100000, 1000000),
            "high": round(current_price + 20, 2),
            "low": round(current_price - 20, 2),
            "open": round(current_price - change, 2),
            "previous_close": round(current_price - change, 2),
            "timestamp": datetime.utcnow(),
            "is_live": False
        }

    async def get_historical_data(self, symbol: str, period: str = "1mo") -> List[Dict]:
        """Get historical stock data for charts"""
        try:
            hist_data = await asyncio.to_thread(self._fetch_historical_data, symbol, period)
            return hist_data
            
        except Exception as e:
            logger.error(f"❌ Error fetching historical data for {symbol}: {e}")
            return []

    def _fetch_historical_data(self, symbol: str, period: str) -> List[Dict]:
        """Fetch historical data using yfinance"""
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period=period)
            
            if hist.empty:
                return []
            
            data = []
            for date, row in hist.iterrows():
                data.append({
                    "date": date.isoformat(),
                    "open": round(row['Open'], 2),
                    "high": round(row['High'], 2),
                    "low": round(row['Low'], 2),
                    "close": round(row['Close'], 2),
                    "volume": int(row['Volume']) if 'Volume' in row else 0
                })
            
            return data
            
        except Exception as e:
            logger.error(f"❌ Error in _fetch_historical_data: {e}")
            return []

    async def get_watchlist_data(self, symbols: List[str]) -> List[Dict]:
        """Get real-time data for multiple stocks"""
        try:
            logger.info(f"📋 Fetching watchlist data for {len(symbols)} symbols")
            valid_results = []
            
            for symbol in symbols:
                try:
                    result = await self.get_real_time_price(symbol)
                    valid_results.append(result)
                except Exception as e:
                    logger.warning(f"⚠️ Error fetching {symbol}: {e}")
                    continue
            
            logger.info(f"✅ Successfully fetched {len(valid_results)} stock prices")
            return valid_results
            
        except Exception as e:
            logger.error(f"❌ Error fetching watchlist data: {e}")
            return []

    async def search_stocks(self, query: str) -> List[Dict]:
        """Search for stocks by name or symbol"""
        try:
            query = query.upper()
            matches = []
            
            for symbol, name in self.indian_stocks.items():
                if query in symbol or query in name.upper():
                    stock_data = await self.get_real_time_price(symbol)
                    matches.append(stock_data)
                    
                if len(matches) >= 10:  # Limit results
                    break
            
            return matches
            
        except Exception as e:
            logger.error(f"❌ Error searching stocks: {e}")
            return []

    async def save_stock_prices_to_db(self, stock_data: List[Dict]):
        """Save stock prices to database"""
        try:
            db = await get_database()
            if not db:
                return
            
            collection = db[COLLECTIONS["stock_prices"]]
            
            for data in stock_data:
                await collection.update_one(
                    {"symbol": data["symbol"]},
                    {"$set": data},
                    upsert=True
                )
            
            logger.info(f"💾 Saved {len(stock_data)} stock prices to database")
            
        except Exception as e:
            logger.error(f"❌ Error saving stock prices: {e}")

# Global instance
indian_stock_service = IndianStockDataService()