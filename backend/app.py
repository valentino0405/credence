from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import random

app = FastAPI(title="AI Trading API", version="1.0.0")

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    # For local development allow all origins so the frontend dev server can fetch
    # If deploying, narrow this to your production frontend origin for security
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "AI Trading API is running!", "docs": "/docs"}

@app.get("/candlestick-data")
def get_candlestick_data(ticker: str = "AAPL"):
    """
    Get 1-day intraday candlestick data for a stock ticker
    Returns data in ApexCharts format
    """
    try:
        # Create ticker object
        stock = yf.Ticker(ticker.upper())
        
        # Get 1-day intraday data (5-minute intervals)
        data = stock.history(period="1d", interval="5m")
        
        if data.empty:
            raise HTTPException(status_code=404, detail=f"No data found for ticker {ticker}")
        
        # Format data for ApexCharts candlestick
        candles = []
        for index, row in data.iterrows():
            candles.append({
                "x": index.strftime("%Y-%m-%d %H:%M"),
                "y": [
                    round(row['Open'], 2),
                    round(row['High'], 2),
                    round(row['Low'], 2),
                    round(row['Close'], 2)
                ]
            })
        
        # Get latest price and calculate change
        latest_price = round(data['Close'].iloc[-1], 2)
        previous_close = round(data['Close'].iloc[0], 2)
        change = round(latest_price - previous_close, 2)
        change_percent = round((change / previous_close) * 100, 2)
        
        return {
            "ticker": ticker.upper(),
            "candles": candles,
            "current_price": latest_price,
            "change": change,
            "change_percent": change_percent,
            "volume": int(data['Volume'].sum()),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data: {str(e)}")

@app.get("/stock-info/{ticker}")
def get_stock_info(ticker: str):
    """Get basic stock information"""
    try:
        stock = yf.Ticker(ticker.upper())
        info = stock.info
        
        return {
            "ticker": ticker.upper(),
            "company_name": info.get("longName", "N/A"),
            "sector": info.get("sector", "N/A"),
            "market_cap": info.get("marketCap", "N/A"),
            "pe_ratio": info.get("trailingPE", "N/A"),
            "52_week_high": info.get("fiftyTwoWeekHigh", "N/A"),
            "52_week_low": info.get("fiftyTwoWeekLow", "N/A")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching stock info: {str(e)}")

@app.get("/ai-prediction/{ticker}")
def get_ai_prediction(ticker: str):
    """
    Simulate AI prediction for stock movement
    In real implementation, this would use ML models
    """
    try:
        # Get current stock data
        stock = yf.Ticker(ticker.upper())
        data = stock.history(period="5d", interval="1d")
        
        if data.empty:
            raise HTTPException(status_code=404, detail=f"No data found for ticker {ticker}")
        
        # Simple trend analysis (mock AI)
        recent_prices = data['Close'].tail(5).tolist()
        trend = "BULLISH" if recent_prices[-1] > recent_prices[0] else "BEARISH"
        
        # Generate mock predictions
        predictions = [
            {
                "timeframe": "15 minutes",
                "direction": random.choice(["UP", "DOWN"]),
                "confidence": round(random.uniform(65, 95), 1),
                "target_price": round(recent_prices[-1] * random.uniform(0.98, 1.02), 2)
            },
            {
                "timeframe": "1 hour",
                "direction": random.choice(["UP", "DOWN"]),
                "confidence": round(random.uniform(60, 90), 1),
                "target_price": round(recent_prices[-1] * random.uniform(0.95, 1.05), 2)
            },
            {
                "timeframe": "1 day",
                "direction": trend,
                "confidence": round(random.uniform(70, 85), 1),
                "target_price": round(recent_prices[-1] * random.uniform(0.92, 1.08), 2)
            }
        ]
        
        return {
            "ticker": ticker.upper(),
            "overall_trend": trend,
            "predictions": predictions,
            "timestamp": datetime.now().isoformat(),
            "disclaimer": "These are simulated predictions for demo purposes"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating prediction: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    import os
    
    # For deployment, use 0.0.0.0 to accept connections from anywhere
    # For local development, this will still work fine
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port, reload=False)
