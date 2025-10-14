"""
Advanced Stock Price Prediction Model using XGBoost
Based on the trained model from PridictionXG2.ipynb
"""

import os
import numpy as np
import pandas as pd
import xgboost as xgb
import yfinance as yf
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.preprocessing import MinMaxScaler
from datetime import datetime, timedelta
import warnings
import pickle
import logging
from typing import Dict, List, Tuple, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Suppress warnings
warnings.filterwarnings('ignore')

class StockPredictor:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.feature_columns = None
        self.is_trained = False
        self.model_path = "models/stock_model.pkl"
        self.scaler_path = "models/scaler.pkl"
        
        # Create models directory if it doesn't exist
        os.makedirs("models", exist_ok=True)
        
        # Try to load existing model
        self.load_model()
    
    def download_stock_data(self, ticker: str, start_date: str = '2020-01-01', 
                           end_date: str = None) -> pd.DataFrame:
        """
        Download and prepare stock data with technical indicators
        """
        if end_date is None:
            end_date = datetime.today().strftime('%Y-%m-%d')
        
        try:
            # Download main stock data
            data = yf.download(ticker, start=start_date, end=end_date, progress=False)
            
            if data.empty:
                raise ValueError(f"No data found for ticker {ticker}")
            
            # Reset index to get Date as column
            data = data.reset_index()
            
            # Handle MultiIndex columns if necessary
            if isinstance(data.columns, pd.MultiIndex):
                data.columns = [col[0] if col[1] == ticker else f"{col[0]}_{col[1]}" 
                               for col in data.columns]
            
            # Clean up column names (remove any trailing underscores)
            data.columns = [col.rstrip('_') for col in data.columns]
            
            # Ensure we have required columns
            required_cols = ['Date', 'Open', 'High', 'Low', 'Close']
            available_cols = [col for col in required_cols if col in data.columns]
            
            if len(available_cols) < 5:
                raise ValueError(f"Missing required columns. Available: {data.columns.tolist()}")
            
            df = data[available_cols + (['Volume'] if 'Volume' in data.columns else [])].copy()
            
            # Add Volume if missing
            if 'Volume' not in df.columns:
                df['Volume'] = 1000000  # Default volume
            
            # Add external indicators with robust waterfall strategy
            
            # Ensure Date is a proper column for joins
            if 'Date' not in df.columns and df.index.name != 'Date':
                df = df.reset_index()
            
            # If index is still a DatetimeIndex, move it to a column
            if isinstance(df.index, pd.DatetimeIndex):
                df['Date'] = df.index
                df = df.reset_index(drop=True)
            
            # S&P500 Data (SPY is much more reliable than ^GSPC)
            sp500_obtained = False
            try:
                logger.info("Attempting to fetch S&P500 data using SPY...")
                spy_data = yf.download('SPY', start=start_date, end=end_date, progress=False)
                if not spy_data.empty and 'Close' in spy_data.columns:
                    # SPY trades around $450, scale to S&P500 level (~4500)
                    sp500_data = spy_data['Close'] * 10
                    # Create DataFrame with proper alignment
                    spy_df = pd.DataFrame({
                        'Date': spy_data.index.values,
                        'SP500': sp500_data.values.flatten()
                    })
                    df = df.merge(spy_df, on='Date', how='left')
                    logger.info("✅ Successfully fetched S&P500 data using SPY!")
                    sp500_obtained = True
                else:
                    raise ValueError("SPY data empty")
            except Exception as e:
                logger.warning(f"SPY failed: {e}")
                
                # Fallback: Try original S&P500 index
                try:
                    logger.info("Fallback: Trying ^GSPC...")
                    sp500_data = yf.download('^GSPC', start=start_date, end=end_date, progress=False)
                    if not sp500_data.empty and 'Close' in sp500_data.columns:
                        sp500_close = sp500_data['Close']
                        gspc_df = pd.DataFrame({
                            'Date': sp500_data.index.values,
                            'SP500': sp500_close.values.flatten()
                        })
                        df = df.merge(gspc_df, on='Date', how='left')
                        logger.info("✅ Successfully fetched S&P500 data using ^GSPC!")
                        sp500_obtained = True
                    else:
                        raise ValueError("^GSPC data empty")
                except Exception as e2:
                    logger.warning(f"^GSPC also failed: {e2}")
            
            # If all S&P500 methods failed, use smart synthetic data
            if not sp500_obtained:
                logger.info("🔄 Using smart synthetic S&P500 data (market-correlated)")
                # Base S&P500 around 4500, with some realistic variance
                base_sp500 = 4500
                try:
                    stock_trend = df['Close'].rolling(window=20).mean()
                    trend_normalized = (stock_trend - stock_trend.mean()) / stock_trend.std()
                    df['SP500'] = base_sp500 + (trend_normalized * 300).fillna(0)
                except:
                    # Simple fallback if rolling calculation fails
                    df['SP500'] = base_sp500 + np.random.normal(0, 200, len(df))
            
            # VIX Data (Try original first, then ETF)
            vix_obtained = False
            try:
                logger.info("Attempting to fetch VIX data using ^VIX...")
                vix_data = yf.download('^VIX', start=start_date, end=end_date, progress=False)
                if not vix_data.empty and 'Close' in vix_data.columns:
                    vix_close = vix_data['Close']
                    vix_df = pd.DataFrame({
                        'Date': vix_data.index.values,
                        'VIX': vix_close.values.flatten()
                    })
                    df = df.merge(vix_df, on='Date', how='left')
                    logger.info("✅ Successfully fetched VIX data using ^VIX!")
                    vix_obtained = True
                else:
                    raise ValueError("^VIX data empty")
            except Exception as e:
                logger.warning(f"^VIX failed: {e}")
                
                # Fallback: Try VIX ETF
                try:
                    logger.info("Fallback: Trying VIXY (VIX ETF)...")
                    vixy_data = yf.download('VIXY', start=start_date, end=end_date, progress=False)
                    if not vixy_data.empty and 'Close' in vixy_data.columns:
                        # VIXY needs scaling to match VIX range (typically 10-35)
                        vixy_close = vixy_data['Close']
                        # Scale VIXY to VIX-like range
                        vix_scaled = 15 + (vixy_close - vixy_close.mean()) / vixy_close.std() * 8
                        vix_scaled = vix_scaled.clip(8, 50)  # Keep in reasonable VIX range
                        vixy_df = pd.DataFrame({
                            'Date': vixy_data.index.values,
                            'VIX': vix_scaled.values.flatten()
                        })
                        df = df.merge(vixy_df, on='Date', how='left')
                        logger.info("✅ Successfully fetched VIX data using VIXY (scaled)!")
                        vix_obtained = True
                    else:
                        raise ValueError("VIXY data empty")
                except Exception as e2:
                    logger.warning(f"VIXY also failed: {e2}")
            
            # If all VIX methods failed, use smart synthetic data
            if not vix_obtained:
                logger.info("🔄 Using smart synthetic VIX data (volatility-correlated)")
                try:
                    # Calculate stock volatility and map to VIX-like values
                    stock_returns = df['Close'].pct_change()
                    rolling_volatility = stock_returns.rolling(window=20).std() * 100
                    # Map volatility to VIX range (higher volatility = higher VIX)
                    df['VIX'] = 15 + (rolling_volatility * 5).fillna(15).clip(10, 40)
                except:
                    # Simple fallback if volatility calculation fails
                    df['VIX'] = 20 + np.random.normal(0, 8, len(df))
            
            # Fill any remaining NaN values using forward fill then backward fill
            df = df.ffill().bfill()
            
            return df
            
        except Exception as e:
            logger.error(f"Error downloading data for {ticker}: {e}")
            raise
    
    def create_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Create technical indicators and features for the model
        """
        # Create target (next day's close price)
        df['Target'] = df['Close'].shift(-1)
        
        # Technical Indicators
        # Moving Averages
        df['EMA_9'] = df['Close'].ewm(span=9, min_periods=9).mean()
        df['SMA_5'] = df['Close'].rolling(window=5, min_periods=5).mean()
        df['SMA_10'] = df['Close'].rolling(window=10, min_periods=10).mean()
        df['SMA_15'] = df['Close'].rolling(window=15, min_periods=15).mean()
        df['SMA_30'] = df['Close'].rolling(window=30, min_periods=30).mean()
        
        # RSI
        delta = df['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss.replace(0, np.nan)
        df['RSI'] = 100 - (100 / (1 + rs))
        
        # MACD
        exp1 = df['Close'].ewm(span=12, min_periods=12).mean()
        exp2 = df['Close'].ewm(span=26, min_periods=26).mean()
        df['MACD'] = exp1 - exp2
        df['MACD_signal'] = df['MACD'].ewm(span=9, min_periods=9).mean()
        df['MACD_histogram'] = df['MACD'] - df['MACD_signal']
        
        # Bollinger Bands
        sma_bb = df['Close'].rolling(window=20).mean()
        std_bb = df['Close'].rolling(window=20).std()
        df['BB_upper'] = sma_bb + (std_bb * 2)
        df['BB_lower'] = sma_bb - (std_bb * 2)
        df['BB_middle'] = sma_bb
        
        # Stochastic Oscillator
        lowest_low = df['Low'].rolling(window=14).min()
        highest_high = df['High'].rolling(window=14).max()
        range_diff = highest_high - lowest_low
        range_diff = range_diff.replace(0, np.nan)
        df['Stoch_K'] = 100 * ((df['Close'] - lowest_low) / range_diff)
        df['Stoch_D'] = df['Stoch_K'].rolling(window=3).mean()
        
        # Lagged Features
        df['Close_lag_1'] = df['Close'].shift(1)
        df['Close_lag_3'] = df['Close'].shift(3)
        df['Close_lag_5'] = df['Close'].shift(5)
        df['Volume_lag_1'] = df['Volume'].shift(1)
        
        # Time-based features
        df['DayOfWeek'] = df['Date'].dt.dayofweek
        df['DayOfYear'] = df['Date'].dt.dayofyear
        df['WeekOfYear'] = df['Date'].dt.isocalendar().week.astype(int)
        
        # External indicators (lagged to prevent data leakage)
        df['VIX_lag_1'] = df['VIX'].shift(1)
        df['SP500_lag_1'] = df['SP500'].shift(1)
        
        # Shift technical indicators to prevent data leakage
        lag_cols = [col for col in df.columns if col not in 
                   ['Date', 'Close', 'Target', 'Open', 'High', 'Low', 'Volume', 'VIX', 'SP500']]
        for col in lag_cols:
            if col not in ['Close_lag_1', 'Close_lag_3', 'Close_lag_5', 'Volume_lag_1', 
                          'VIX_lag_1', 'SP500_lag_1', 'DayOfWeek', 'DayOfYear', 'WeekOfYear']:
                df[col] = df[col].shift(1)
        
        # Remove rows with NaN values
        df = df.dropna()
        df = df.reset_index(drop=True)
        
        return df
    
    def train_model(self, ticker: str, retrain: bool = False) -> Dict:
        """
        Train the XGBoost model on historical data
        """
        if self.is_trained and not retrain:
            logger.info("Model already trained. Use retrain=True to retrain.")
            return {"status": "already_trained"}
        
        try:
            logger.info(f"Training model for {ticker}...")
            
            # Download and prepare data
            df = self.download_stock_data(ticker)
            df = self.create_features(df)
            
            # Define feature columns
            self.feature_columns = [col for col in df.columns if col not in ['Date', 'Target']]
            
            # Split data
            test_size = 0.15
            valid_size = 0.15
            
            test_split_idx = int(df.shape[0] * (1 - test_size))
            valid_split_idx = int(df.shape[0] * (1 - (valid_size + test_size)))
            
            train_df = df.loc[:valid_split_idx].copy()
            valid_df = df.loc[valid_split_idx+1:test_split_idx].copy()
            test_df = df.loc[test_split_idx+1:].copy()
            
            # Extract features and targets
            X_train = train_df[self.feature_columns]
            y_train = train_df['Target']
            X_valid = valid_df[self.feature_columns]
            y_valid = valid_df['Target']
            X_test = test_df[self.feature_columns]
            y_test = test_df['Target']
            
            # Scale features
            self.scaler = MinMaxScaler(feature_range=(0, 1))
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_valid_scaled = self.scaler.transform(X_valid)
            X_test_scaled = self.scaler.transform(X_test)
            
            # Convert back to DataFrame
            X_train = pd.DataFrame(X_train_scaled, columns=self.feature_columns)
            X_valid = pd.DataFrame(X_valid_scaled, columns=self.feature_columns)
            X_test = pd.DataFrame(X_test_scaled, columns=self.feature_columns)
            
            # Train XGBoost model with more conservative parameters
            self.model = xgb.XGBRegressor(
                n_estimators=200,  # Reduced to prevent overfitting
                learning_rate=0.01,  # Lower learning rate for stability
                max_depth=6,  # Reduced depth to prevent overfitting
                subsample=0.8,
                colsample_bytree=0.8,
                objective='reg:squarederror',
                random_state=42,
                n_jobs=-1,
                reg_alpha=0.1,  # L1 regularization
                reg_lambda=0.1   # L2 regularization
            )
            
            self.model.fit(X_train, y_train)
            
            # Evaluate model
            y_train_pred = self.model.predict(X_train)
            y_valid_pred = self.model.predict(X_valid)
            y_test_pred = self.model.predict(X_test)
            
            # Calculate metrics
            train_metrics = self._calculate_metrics(y_train, y_train_pred)
            valid_metrics = self._calculate_metrics(y_valid, y_valid_pred)
            test_metrics = self._calculate_metrics(y_test, y_test_pred)
            
            self.is_trained = True
            
            # Save model and scaler
            self.save_model()
            
            logger.info("Model training completed successfully!")
            
            return {
                "status": "success",
                "train_metrics": train_metrics,
                "valid_metrics": valid_metrics,
                "test_metrics": test_metrics,
                "training_samples": len(X_train),
                "validation_samples": len(X_valid),
                "test_samples": len(X_test)
            }
            
        except Exception as e:
            logger.error(f"Error training model: {e}")
            raise
    
    def predict_future_prices(self, ticker: str, days: int = 30) -> Dict:
        """
        Enhanced prediction for up to 30 days with confidence decay and multiple scenarios
        """
        if not self.is_trained:
            logger.warning("Model not trained. Training now...")
            self.train_model(ticker)
        
        try:
            # Validate input
            if days < 1 or days > 30:
                raise ValueError("Days must be between 1 and 30")
            
            # Get recent data (more data for longer predictions)
            lookback_days = max(365, days * 12)  # More lookback for longer predictions
            df = self.download_stock_data(ticker, 
                                        start_date=(datetime.now() - timedelta(days=lookback_days)).strftime('%Y-%m-%d'))
            df = self.create_features(df)
            
            # Get current price and volatility for bounds
            current_price = df['Close'].iloc[-1]
            recent_volatility = df['Close'].pct_change().tail(20).std()
            
            # Generate multiple prediction scenarios
            scenarios = self._generate_prediction_scenarios(df, days, current_price, recent_volatility)
            
            return {
                "ticker": ticker,
                "current_price": current_price,
                "prediction_scenarios": scenarios,
                "confidence_methodology": "Confidence decreases with prediction horizon due to increasing uncertainty",
                "volatility_estimate": round(recent_volatility * 100, 2),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error predicting future prices: {e}")
            raise

    def _generate_prediction_scenarios(self, df: pd.DataFrame, days: int, current_price: float, volatility: float) -> Dict:
        """Generate optimistic, realistic, and pessimistic scenarios"""
        try:
            # Base scenario (realistic)
            base_predictions = self._predict_single_scenario(df, days, scenario_type="base")
            
            # Optimistic scenario (10% higher trend)
            optimistic_predictions = self._predict_single_scenario(df, days, scenario_type="optimistic")
            
            # Pessimistic scenario (10% lower trend)
            pessimistic_predictions = self._predict_single_scenario(df, days, scenario_type="pessimistic")
            
            # Calculate confidence levels with decay
            base_confidence = self._calculate_confidence_levels(days)
            
            # Format scenarios
            scenarios = {
                "base_case": {
                    "scenario": "Most Likely",
                    "description": "Based on current trends and technical indicators",
                    "predictions": base_predictions,
                    "confidence_levels": base_confidence
                },
                "optimistic_case": {
                    "scenario": "Bullish",
                    "description": "Assumes positive market sentiment and favorable conditions",
                    "predictions": optimistic_predictions,
                    "confidence_levels": [max(0.4, conf * 0.8) for conf in base_confidence]  # Lower confidence
                },
                "pessimistic_case": {
                    "scenario": "Bearish", 
                    "description": "Assumes negative market sentiment and unfavorable conditions",
                    "predictions": pessimistic_predictions,
                    "confidence_levels": [max(0.4, conf * 0.8) for conf in base_confidence]  # Lower confidence
                }
            }
            
            return scenarios
            
        except Exception as e:
            logger.error(f"Error generating prediction scenarios: {e}")
            return {}

    def _predict_single_scenario(self, df: pd.DataFrame, days: int, scenario_type: str = "base") -> List[Dict]:
        """Predict prices for a single scenario"""
        try:
            # Get the last available features
            last_features = df[self.feature_columns].iloc[-1:].copy()
            last_features_scaled = self.scaler.transform(last_features)
            last_features_scaled = pd.DataFrame(last_features_scaled, columns=self.feature_columns)
            
            future_predictions = []
            last_date = df['Date'].iloc[-1]
            current_price = df['Close'].iloc[-1]
            
            # Scenario adjustments
            trend_multiplier = 1.0
            volatility_multiplier = 1.0
            
            if scenario_type == "optimistic":
                trend_multiplier = 1.1  # 10% more optimistic trend
                volatility_multiplier = 0.8  # Less volatile
            elif scenario_type == "pessimistic":
                trend_multiplier = 0.9  # 10% more pessimistic trend
                volatility_multiplier = 1.2  # More volatile
            
            # Find the Close column index for inverse transformation
            close_price_index = self.feature_columns.index('Close')
            
            for day in range(days):
                # Predict next day's price
                next_price_scaled = self.model.predict(last_features_scaled)[0]
                
                # Apply scenario adjustments
                price_change = next_price_scaled - last_features_scaled.iloc[0, close_price_index]
                adjusted_change = price_change * trend_multiplier
                next_price_scaled = last_features_scaled.iloc[0, close_price_index] + adjusted_change
                
                # Dynamic bounds based on days ahead (wider bounds for longer predictions)
                days_factor = 1 + (day / 30)  # Increase bounds progressively
                max_daily_change = min(0.15, 0.05 * days_factor * volatility_multiplier)  # Max 15% or scaled by volatility
                
                # Apply bounds
                if abs(next_price_scaled - last_features_scaled.iloc[0, close_price_index]) > max_daily_change:
                    if next_price_scaled > last_features_scaled.iloc[0, close_price_index]:
                        next_price_scaled = last_features_scaled.iloc[0, close_price_index] * (1 + max_daily_change)
                    else:
                        next_price_scaled = last_features_scaled.iloc[0, close_price_index] * (1 - max_daily_change)
                
                # Create dummy array for inverse transformation
                dummy_array = last_features_scaled.values.copy()
                dummy_array[0, close_price_index] = next_price_scaled
                
                # Inverse transform to get actual price
                inverse_transformed = self.scaler.inverse_transform(dummy_array)
                next_price = inverse_transformed[0, close_price_index]
                
                # Additional sanity check - prevent extreme predictions
                reasonable_bounds = self._calculate_reasonable_bounds(current_price, day + 1)
                next_price = max(reasonable_bounds["min"], min(reasonable_bounds["max"], next_price))
                
                future_predictions.append({
                    "date": (last_date + timedelta(days=day + 1)).strftime('%Y-%m-%d'),
                    "predicted_price": round(next_price, 2),
                    "days_ahead": day + 1,
                    "price_change_percent": round(((next_price - current_price) / current_price) * 100, 2)
                })
                
                # Update features for next iteration
                last_features_scaled.iloc[0, close_price_index] = next_price_scaled
                
                # Update lagged features with proper shifting
                self._update_lagged_features(last_features_scaled, next_price_scaled)
            
            return future_predictions
            
        except Exception as e:
            logger.error(f"Error in single scenario prediction: {e}")
            return []

    def _calculate_confidence_levels(self, days: int) -> List[float]:
        """Calculate confidence levels with exponential decay"""
        base_confidence = 0.85  # 85% confidence for day 1
        decay_rate = 0.03  # 3% decay per day
        
        confidence_levels = []
        for day in range(1, days + 1):
            # Exponential decay: confidence decreases over time
            confidence = base_confidence * np.exp(-decay_rate * (day - 1))
            # Minimum confidence of 40% for long-term predictions
            confidence = max(0.40, confidence)
            confidence_levels.append(round(confidence, 2))
        
        return confidence_levels

    def _calculate_reasonable_bounds(self, current_price: float, days_ahead: int) -> Dict:
        """Calculate reasonable price bounds based on days ahead"""
        # Historical analysis shows most stocks don't move more than certain % over time periods
        daily_bound = 0.05  # 5% daily max change
        
        # Compound bounds for longer periods (but with diminishing returns)
        max_change = min(0.5, daily_bound * np.sqrt(days_ahead))  # Square root scaling, max 50%
        
        return {
            "min": current_price * (1 - max_change),
            "max": current_price * (1 + max_change)
        }

    def _update_lagged_features(self, features_df: pd.DataFrame, new_price: float):
        """Update lagged price features properly"""
        try:
            # Update lagged Close prices if they exist
            if 'Close_lag_5' in self.feature_columns:
                close_lag_5_idx = self.feature_columns.index('Close_lag_5')
                if 'Close_lag_3' in self.feature_columns:
                    close_lag_3_idx = self.feature_columns.index('Close_lag_3')
                    features_df.iloc[0, close_lag_5_idx] = features_df.iloc[0, close_lag_3_idx]
            
            if 'Close_lag_3' in self.feature_columns:
                close_lag_3_idx = self.feature_columns.index('Close_lag_3')
                if 'Close_lag_1' in self.feature_columns:
                    close_lag_1_idx = self.feature_columns.index('Close_lag_1')
                    features_df.iloc[0, close_lag_3_idx] = features_df.iloc[0, close_lag_1_idx]
            
            if 'Close_lag_1' in self.feature_columns:
                close_lag_1_idx = self.feature_columns.index('Close_lag_1')
                features_df.iloc[0, close_lag_1_idx] = new_price
                
        except Exception as e:
            logger.warning(f"Error updating lagged features: {e}")

    def get_extended_prediction_summary(self, ticker: str, days: int = 30) -> Dict:
        """Get a summary of extended predictions with key insights"""
        try:
            predictions = self.predict_future_prices(ticker, days)
            
            if not predictions.get("prediction_scenarios"):
                return {"error": "Failed to generate predictions"}
            
            base_case = predictions["prediction_scenarios"]["base_case"]["predictions"]
            optimistic_case = predictions["prediction_scenarios"]["optimistic_case"]["predictions"]
            pessimistic_case = predictions["prediction_scenarios"]["pessimistic_case"]["predictions"]
            
            current_price = predictions["current_price"]
            
            # Key timeframes
            week_1 = base_case[6] if len(base_case) >= 7 else base_case[-1]
            week_2 = base_case[13] if len(base_case) >= 14 else base_case[-1]
            month_end = base_case[-1]
            
            # Price ranges
            price_range = {
                "week_1": {
                    "low": min(pessimistic_case[6]["predicted_price"] if len(pessimistic_case) >= 7 else pessimistic_case[-1]["predicted_price"],
                              optimistic_case[6]["predicted_price"] if len(optimistic_case) >= 7 else optimistic_case[-1]["predicted_price"]),
                    "high": max(pessimistic_case[6]["predicted_price"] if len(pessimistic_case) >= 7 else pessimistic_case[-1]["predicted_price"],
                               optimistic_case[6]["predicted_price"] if len(optimistic_case) >= 7 else optimistic_case[-1]["predicted_price"]),
                    "base": week_1["predicted_price"]
                },
                "month_end": {
                    "low": min(pessimistic_case[-1]["predicted_price"], optimistic_case[-1]["predicted_price"]),
                    "high": max(pessimistic_case[-1]["predicted_price"], optimistic_case[-1]["predicted_price"]),
                    "base": month_end["predicted_price"]
                }
            }
            
            return {
                "ticker": ticker,
                "summary": {
                    "current_price": current_price,
                    "prediction_period_days": days,
                    "key_timeframes": {
                        "week_1_target": round(week_1["predicted_price"], 2),
                        "week_2_target": round(week_2["predicted_price"], 2) if len(base_case) >= 14 else None,
                        "month_end_target": round(month_end["predicted_price"], 2)
                    },
                    "expected_returns": {
                        "week_1": round(((week_1["predicted_price"] - current_price) / current_price) * 100, 2),
                        "month_end": round(((month_end["predicted_price"] - current_price) / current_price) * 100, 2)
                    },
                    "price_ranges": price_range,
                    "volatility_estimate": predictions.get("volatility_estimate", 0),
                    "overall_trend": "BULLISH" if month_end["predicted_price"] > current_price else "BEARISH"
                },
                "full_predictions": predictions,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error creating prediction summary: {e}")
            return {"error": str(e)}
            
        except Exception as e:
            logger.error(f"Error predicting future prices: {e}")
            raise
    
    def get_prediction_accuracy(self, ticker: str) -> Dict:
        """
        Get recent prediction accuracy statistics
        """
        try:
            # Get recent data for accuracy calculation
            df = self.download_stock_data(ticker, 
                                        start_date=(datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d'))
            df = self.create_features(df)
            
            # Use last 30 days for accuracy testing
            test_df = df.tail(30).copy()
            
            if len(test_df) < 10:
                return {"error": "Insufficient data for accuracy calculation"}
            
            X_test = test_df[self.feature_columns]
            y_test = test_df['Target']
            
            # Scale features
            X_test_scaled = self.scaler.transform(X_test)
            X_test_scaled = pd.DataFrame(X_test_scaled, columns=self.feature_columns)
            
            # Make predictions
            y_pred = self.model.predict(X_test_scaled)
            
            # Calculate metrics
            metrics = self._calculate_metrics(y_test, y_pred)
            
            # Calculate percentage errors
            pct_errors = np.abs((y_test - y_pred) / y_test) * 100
            
            return {
                "ticker": ticker,
                "accuracy_period_days": len(test_df),
                "mean_absolute_percentage_error": round(pct_errors.mean(), 2),
                "median_absolute_percentage_error": round(pct_errors.median(), 2),
                "max_absolute_percentage_error": round(pct_errors.max(), 2),
                "rmse": round(metrics['RMSE'], 2),
                "mae": round(metrics['MAE'], 2),
                "r2_score": round(metrics['R2'], 4),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error calculating accuracy: {e}")
            return {"error": str(e)}
    
    def _calculate_metrics(self, y_true, y_pred) -> Dict:
        """Calculate prediction metrics"""
        mse = mean_squared_error(y_true, y_pred)
        rmse = np.sqrt(mse)
        mae = mean_absolute_error(y_true, y_pred)
        r2 = r2_score(y_true, y_pred)
        
        return {
            'MSE': mse,
            'RMSE': rmse,
            'MAE': mae,
            'R2': r2
        }
    
    def save_model(self):
        """Save the trained model and scaler"""
        try:
            with open(self.model_path, 'wb') as f:
                pickle.dump(self.model, f)
            with open(self.scaler_path, 'wb') as f:
                pickle.dump({
                    'scaler': self.scaler,
                    'feature_columns': self.feature_columns
                }, f)
            logger.info("Model saved successfully")
        except Exception as e:
            logger.error(f"Error saving model: {e}")
    
    def load_model(self):
        """Load a pre-trained model and scaler"""
        try:
            if os.path.exists(self.model_path) and os.path.exists(self.scaler_path):
                with open(self.model_path, 'rb') as f:
                    self.model = pickle.load(f)
                with open(self.scaler_path, 'rb') as f:
                    scaler_data = pickle.load(f)
                    self.scaler = scaler_data['scaler']
                    self.feature_columns = scaler_data['feature_columns']
                self.is_trained = True
                logger.info("Model loaded successfully")
            else:
                logger.info("No pre-trained model found")
        except Exception as e:
            logger.error(f"Error loading model: {e}")

# Global predictor instance
predictor = StockPredictor()