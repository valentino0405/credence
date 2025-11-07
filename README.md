# Advanced Stock Prediction System

An AI-powered stock prediction platform using XGBoost machine learning with Next.js frontend and FastAPI backend.

## Features

### AI-Powered Predictions
- **XGBoost Model**: Advanced machine learning model trained on technical indicators
- **Multi-timeframe Predictions**: Next day, 3-day, and weekly forecasts
- **Confidence Scores**: Model confidence ratings for each prediction
- **Accuracy Metrics**: Real-time model performance tracking

### Advanced Analytics
- **Technical Indicators**: RSI, MACD, Bollinger Bands, Stochastic Oscillator
- **Market Sentiment**: Overall market trend analysis
- **Price Comparisons**: Current vs predicted price analysis
- **Historical Accuracy**: Track prediction accuracy over time

### Modern Interface
- **Real-time Charts**: Interactive candlestick and line charts
- **Aurora Background**: Beautiful animated backgrounds
- **Responsive Design**: Works on all devices
- **Dark Theme**: Professional trading interface

### Market Overview
- **Multiple Stocks**: Track popular stocks simultaneously
- **Market Sentiment**: Overall market bullish/bearish indicators
- **Live Updates**: Real-time price and prediction updates
- **Click-through Navigation**: Easy access to detailed stock analysis

## Tech Stack

### Backend
- **FastAPI**: High-performance Python web framework
- **XGBoost**: Gradient boosting machine learning framework
- **scikit-learn**: Machine learning utilities
- **yfinance**: Real-time stock data
- **pandas/numpy**: Data processing

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **ApexCharts**: Interactive chart library
- **Clerk**: Authentication system

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 18+
- npm or yarn

### Easy Setup (Windows)
1. **Run the setup script:**
   ```bash
   # PowerShell (Recommended)
   .\setup.ps1
   
   # Or Command Prompt
   setup.bat
   ```

### Manual Setup

#### Backend Setup
1. **Navigate to backend:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the server:**
   ```bash
   python app.py
   ```

#### Frontend Setup
1. **Navigate to frontend:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   npm install react-apexcharts apexcharts
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Usage

### 1. Dashboard
- Enter stock ticker symbols (e.g., AAPL, GOOGL)
- Access popular stocks with one click
- Navigate to detailed analysis

### 2. Stock Analysis (`/stocks/[ticker]`)
- View real-time candlestick charts
- See AI predictions with confidence scores
- Compare current vs predicted prices
- Track model accuracy metrics

### 3. Prediction Center (`/prediction`)
- Generate multi-day forecasts
- Customize prediction timeframes
- View accuracy statistics
- Interactive prediction charts

### 4. Market Overview (`/market`)
- Monitor multiple stocks simultaneously
- Overall market sentiment analysis
- Quick stock comparisons
- Bulk prediction updates

## AI Model Features

### Technical Indicators Used
- **Moving Averages**: EMA(9), SMA(5,10,15,30)
- **RSI**: Relative Strength Index
- **MACD**: Moving Average Convergence Divergence
- **Bollinger Bands**: Price volatility bands
- **Stochastic Oscillator**: Momentum indicator
- **Lagged Features**: Historical price patterns
- **External Factors**: VIX (volatility), S&P500

### Model Performance
- **R² Score**: Model explanation power
- **MAPE**: Mean Absolute Percentage Error
- **Confidence Intervals**: Prediction reliability
- **Backtesting**: Historical accuracy validation

## API Endpoints

### Core Endpoints
- `GET /candlestick-data?ticker={symbol}` - Real-time OHLC data
- `GET /ai-prediction/{ticker}` - AI predictions with confidence
- `GET /advanced-prediction/{ticker}?days={n}` - Multi-day forecasts
- `POST /train-model/{ticker}` - Train/retrain model
- `GET /model-status` - Model training status
- `GET /prediction-history/{ticker}` - Historical accuracy

### Stock Information
- `GET /stock-info/{ticker}` - Basic stock information
- `GET /prediction-history/{ticker}` - Prediction accuracy metrics

- `GET /advanced-prediction/{ticker}?days={n}` - Multi-day forecasts
- `POST /train-model/{ticker}` - Train/retrain model
- `GET /model-status` - Model training status
- `GET /prediction-history/{ticker}` - Historical accuracy

### Stock Information
- `GET /stock-info/{ticker}` - Basic stock information
- `GET /prediction-history/{ticker}` - Prediction accuracy metrics

## Key Features Implemented

### Completed Features

1. **Advanced ML Model**
   - XGBoost with 25+ technical indicators
   - Feature engineering from your notebook
   - Model persistence and loading
   - Background training capability

2. **Real-time Predictions**
   - Next day price predictions
   - Multi-day forecasting (up to 30 days)
   - Confidence scoring
   - Trend analysis (BULLISH/BEARISH)

3. **Enhanced UI Components**
   - Interactive candlestick charts
   - Prediction visualization
   - Accuracy metrics display
   - Current vs predicted comparisons

4. **Market Dashboard**
   - Multiple stock monitoring
   - Market sentiment analysis
   - Bulk prediction updates
   - Click-through navigation

5. **Performance Features**
   - Modular code architecture
   - Efficient API endpoints
   - Background model training
   - Error handling and fallbacks

## Advanced Usage

### Training Custom Models
```python
# Train model for specific ticker
POST /train-model/AAPL?retrain=true
```

### Getting Extended Predictions
```python
# Get 2-week forecast
GET /advanced-prediction/AAPL?days=14
```

### Monitoring Model Performance
```python
# Check model accuracy
GET /prediction-history/AAPL?days_back=30
```

## Important Notes

### Model Accuracy
- The XGBoost model provides educational predictions
- Average accuracy varies by market conditions
- Past performance doesn't guarantee future results
- Always do your own research before investing

### Data Sources
- Real-time data from Yahoo Finance
- Technical indicators calculated in real-time
- External factors (VIX, S&P500) included
- Model updates automatically with new data

### Performance Considerations
- First prediction may take longer (model training)
- Subsequent predictions are fast (cached model)
- Background training doesn't block API calls
- Model auto-saves for persistence

## UI Features

### Design Elements
- **Aurora Backgrounds**: Animated gradient backgrounds
- **Glass Morphism**: Translucent panels with blur effects
- **Responsive Layouts**: Mobile-friendly design
- **Interactive Charts**: Hover effects and zoom capabilities
- **Real-time Updates**: Live data refresh

### User Experience
- **Intuitive Navigation**: Clear routing between sections
- **Loading States**: Smooth loading animations
- **Error Handling**: Graceful error messages
- **Accessibility**: Keyboard and screen reader support

## Disclaimer

This application is for **educational and demonstration purposes only**. The AI predictions:
- Should NOT be used as financial advice
- Are based on historical patterns and may not predict future performance
- Can be affected by unforeseen market events
- Should be combined with fundamental analysis and professional advice

**Always consult with financial professionals before making investment decisions.**

## Contributing

Feel free to enhance this project by:
- Adding more technical indicators
- Improving model accuracy
- Enhancing UI components
- Adding more data sources
- Implementing additional features

## License

This project is for educational use. Please ensure compliance with data provider terms of service.

---
Kuch nahi thoda sa editing

**Built with using XGBoost, FastAPI, and Next.js**