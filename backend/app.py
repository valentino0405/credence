from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import random
from stock_predictor import predictor
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    Get AI prediction for stock movement using trained XGBoost model
    """
    try:
        # Get future price predictions
        future_predictions = predictor.predict_future_prices(ticker, days=5)
        
        # Get current price for comparison
        current_price = future_predictions["current_price"]
        
        # Get accuracy statistics
        accuracy_stats = predictor.get_prediction_accuracy(ticker)
        
        # Calculate trends based on predictions
        predictions_data = future_predictions["predictions"]
        next_day_price = predictions_data[0]["predicted_price"] if predictions_data else current_price
        week_price = predictions_data[-1]["predicted_price"] if len(predictions_data) >= 5 else current_price
        
        # Determine trends
        short_term_trend = "BULLISH" if next_day_price > current_price else "BEARISH"
        long_term_trend = "BULLISH" if week_price > current_price else "BEARISH"
        overall_trend = short_term_trend if abs(next_day_price - current_price) > abs(week_price - current_price) else long_term_trend
        
        # Generate confidence based on model accuracy
        base_confidence = 75
        if 'mean_absolute_percentage_error' in accuracy_stats:
            # Higher accuracy = higher confidence
            mape = accuracy_stats['mean_absolute_percentage_error']
            confidence_adjustment = max(0, min(20, (10 - mape) * 2))  # Adjust confidence based on MAPE
            base_confidence += confidence_adjustment
        
        # Create predictions in the expected format
        predictions = [
            {
                "timeframe": "Next Day",
                "direction": "UP" if next_day_price > current_price else "DOWN",
                "confidence": round(min(95, max(60, base_confidence)), 1),
                "target_price": round(next_day_price, 2),
                "change_percent": round(((next_day_price - current_price) / current_price) * 100, 2)
            },
            {
                "timeframe": "3 Days",
                "direction": "UP" if predictions_data[2]["predicted_price"] > current_price else "DOWN" if len(predictions_data) >= 3 else "NEUTRAL",
                "confidence": round(min(90, max(55, base_confidence - 5)), 1),
                "target_price": round(predictions_data[2]["predicted_price"], 2) if len(predictions_data) >= 3 else current_price,
                "change_percent": round(((predictions_data[2]["predicted_price"] - current_price) / current_price) * 100, 2) if len(predictions_data) >= 3 else 0
            },
            {
                "timeframe": "1 Week",
                "direction": "UP" if week_price > current_price else "DOWN",
                "confidence": round(min(85, max(50, base_confidence - 10)), 1),
                "target_price": round(week_price, 2),
                "change_percent": round(((week_price - current_price) / current_price) * 100, 2)
            }
        ]
        
        return {
            "ticker": ticker.upper(),
            "current_price": round(current_price, 2),
            "overall_trend": overall_trend,
            "predictions": predictions,
            "model_accuracy": accuracy_stats,
            "future_predictions": predictions_data,
            "timestamp": datetime.now().isoformat(),
            "disclaimer": "Predictions based on XGBoost ML model. Past performance doesn't guarantee future results."
        }
        
    except Exception as e:
        logger.error(f"Error generating AI prediction for {ticker}: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating prediction: {str(e)}")

@app.get("/advanced-prediction/{ticker}")
def get_advanced_prediction(ticker: str, days: int = 5):
    """
    Get detailed future price predictions for multiple days
    """
    try:
        if days < 1 or days > 30:
            raise HTTPException(status_code=400, detail="Days must be between 1 and 30")
        
        predictions = predictor.predict_future_prices(ticker, days=days)
        accuracy = predictor.get_prediction_accuracy(ticker)
        
        return {
            "status": "success",
            "predictions": predictions,
            "accuracy_metrics": accuracy,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting advanced prediction for {ticker}: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.post("/train-model/{ticker}")
def train_model_endpoint(ticker: str, background_tasks: BackgroundTasks, retrain: bool = False):
    """
    Train or retrain the prediction model for a specific ticker
    """
    try:
        if predictor.is_trained and not retrain:
            return {
                "status": "already_trained",
                "message": "Model is already trained. Use retrain=true to retrain.",
                "ticker": ticker.upper()
            }
        
        # Train model in background to avoid timeout
        def train_in_background():
            try:
                result = predictor.train_model(ticker, retrain=retrain)
                logger.info(f"Background training completed for {ticker}: {result}")
            except Exception as e:
                logger.error(f"Background training failed for {ticker}: {e}")
        
        background_tasks.add_task(train_in_background)
        
        return {
            "status": "training_started",
            "message": f"Model training started for {ticker}. This may take a few minutes.",
            "ticker": ticker.upper(),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error starting training for {ticker}: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.get("/model-status")
def get_model_status():
    """
    Get current model training status and performance metrics
    """
    try:
        return {
            "is_trained": predictor.is_trained,
            "model_available": predictor.model is not None,
            "scaler_available": predictor.scaler is not None,
            "feature_count": len(predictor.feature_columns) if predictor.feature_columns else 0,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting model status: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.get("/prediction-history/{ticker}")
def get_prediction_history(ticker: str, days_back: int = 30):
    """
    Get historical prediction accuracy for analysis
    """
    try:
        if days_back < 1 or days_back > 90:
            raise HTTPException(status_code=400, detail="days_back must be between 1 and 90")
        
        accuracy_stats = predictor.get_prediction_accuracy(ticker)
        
        # Get recent stock data for comparison
        stock = yf.Ticker(ticker.upper())
        hist_data = stock.history(period=f"{days_back}d")
        
        if hist_data.empty:
            raise HTTPException(status_code=404, detail=f"No historical data found for {ticker}")
        
        # Calculate recent performance metrics
        recent_prices = hist_data['Close'].tail(min(days_back, len(hist_data))).tolist()
        price_changes = [recent_prices[i] - recent_prices[i-1] for i in range(1, len(recent_prices))]
        
        return {
            "ticker": ticker.upper(),
            "accuracy_metrics": accuracy_stats,
            "recent_performance": {
                "days_analyzed": len(recent_prices),
                "price_range": {
                    "min": round(min(recent_prices), 2),
                    "max": round(max(recent_prices), 2),
                    "current": round(recent_prices[-1], 2)
                },
                "average_daily_change": round(sum(price_changes) / len(price_changes), 2) if price_changes else 0,
                "volatility": round(pd.Series(recent_prices).std(), 2)
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting prediction history for {ticker}: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    import os
    
    # For deployment, use 0.0.0.0 to accept connections from anywhere
    # For local development, this will still work fine
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port, reload=False)
