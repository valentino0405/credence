# Credence AI Trading Backend

Advanced FastAPI backend with AI-powered trading, predictions, and chatbot functionality.

## 🚀 Setup Instructions

### 1. Environment Setup
```bash
cd backend
python -m venv myenv
myenv\Scripts\activate  # On Windows
# or
source myenv/bin/activate  # On macOS/Linux
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Environment Variables
Create a `.env` file:
```env
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=mongodb://localhost:27017
```

### 4. Start the Server
```bash
python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Server will be running at: http://127.0.0.1:8000

## 🔧 New Features & APIs

### 1. Enhanced Trading System
- **Portfolio Performance**: `/trading/portfolio-performance/{user_id}`
- **Risk Assessment**: `/trading/risk-assessment/{user_id}`
- **Trading Insights**: `/trading/insights/{user_id}`
- **Buy/Sell Orders**: `/trading/buy`, `/trading/sell`

#### Example Portfolio Response:
```json
{
  "total_value": 125000.00,
  "total_invested": 100000.00,
  "profit_loss": 25000.00,
  "profit_loss_percentage": 25.0,
  "holdings": [...]
}
```

### 2. Extended 30-Day Predictions
- **Standard Predictions**: `/advanced-prediction/{ticker}?days=5`
- **Extended Multi-Scenario**: `/extended-prediction/{ticker}`

#### Extended Prediction Features:
- Base, Optimistic, and Pessimistic scenarios
- Confidence decay over time
- Risk level assessment
- Volatility estimates

#### Example Extended Response:
```json
{
  "ticker": "AAPL",
  "current_price": 150.00,
  "extended_predictions": {
    "base_scenario": [...],
    "optimistic_scenario": [...],
    "pessimistic_scenario": [...]
  },
  "summary": {
    "trend_direction": "Bullish",
    "risk_level": "Medium",
    "average_confidence": 0.78,
    "volatility_estimate": 0.15
  }
}
```

### 3. AI Chatbot System
- **Send Message**: `/chatbot/message`
- **Stock Analysis**: `/chatbot/analyze-stock`
- **Market Insights**: `/chatbot/market-insights`
- **Portfolio Analysis**: `/chatbot/portfolio-analysis`

#### Chatbot Features:
- Gemini AI integration
- Context-aware conversations
- Real-time stock data integration
- Trading recommendations
- Market sentiment analysis

#### Example Chat Request:
```json
{
  "user_id": "user123",
  "message": "What's your opinion on AAPL stock?",
  "context": {...}
}
```

## 📊 API Documentation

### Trading Endpoints
- `GET /trading/portfolio-performance/{user_id}` - Get portfolio analytics
- `GET /trading/risk-assessment/{user_id}` - Risk analysis
- `GET /trading/insights/{user_id}` - AI trading insights
- `POST /trading/buy` - Execute buy order
- `POST /trading/sell` - Execute sell order

### Prediction Endpoints
- `GET /advanced-prediction/{ticker}?days=N` - Standard predictions
- `GET /extended-prediction/{ticker}` - 30-day multi-scenario

### Chatbot Endpoints
- `POST /chatbot/message` - Send chat message
- `POST /chatbot/analyze-stock` - Stock analysis chat
- `GET /chatbot/market-insights` - Market insights
- `POST /chatbot/portfolio-analysis` - Portfolio chat analysis

### Stock Data Endpoints
- `GET /stock-data/{ticker}` - Real-time stock data
- `GET /news/{ticker}` - Stock news

## 🏗️ Architecture

### Services Layer
- `trading_service.py` - Enhanced mock trading with analytics
- `stock_predictor.py` - XGBoost ML model with 30-day predictions
- `chatbot_service.py` - Gemini AI integration
- `news_service.py` - Financial news aggregation
- `stock_data_service.py` - Yahoo Finance integration

### Database Collections
- `trading_portfolios` - User portfolio data
- `trading_transactions` - Transaction history
- `chat_conversations` - Chatbot conversations
- `news_articles` - Cached news data

### ML Models
- **XGBoost Regressor** for price predictions
- **Confidence decay** for extended predictions
- **Scenario modeling** for risk assessment

## 🔒 Security Features
- Input validation with Pydantic
- Rate limiting on API endpoints
- Error handling and logging
- Secure environment variables

## 📈 Performance
- Async operations with FastAPI
- Caching for stock data
- Optimized database queries
- Background task processing

## 🧪 Testing
```bash
# Run tests
python -m pytest tests/

# Test specific endpoints
curl http://localhost:8000/trading/portfolio-performance/test_user
curl http://localhost:8000/extended-prediction/AAPL
```

## 🚀 Production Deployment
1. Set environment variables
2. Configure database connections
3. Enable HTTPS
4. Set up monitoring and logging
5. Deploy with gunicorn or similar WSGI server

---

**API Documentation**: Visit http://127.0.0.1:8000/docs for interactive API documentation.

