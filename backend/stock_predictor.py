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
            
            # Add external indicators (VIX and S&P500) with fallbacks
            try:
                # Try different VIX tickers
                for vix_ticker in ['^VIX', 'VIX']:
                    try:
                        vix_data = yf.download(vix_ticker, start=start_date, end=end_date, progress=False)
                        if not vix_data.empty and 'Close' in vix_data.columns:
                            vix_data = vix_data['Close'].rename('VIX')
                            df = df.set_index('Date').join(vix_data, how='left').reset_index()
                            logger.info(f"Successfully fetched VIX data using {vix_ticker}")
                            break
                    except:
                        continue
                else:
                    raise ValueError("All VIX tickers failed")
            except:
                logger.info("Using realistic VIX synthetic data (12-30 range)")
                # Use more realistic VIX values (typically 10-35)
                df['VIX'] = np.random.uniform(12, 30, len(df))
            
            try:
                # Try different S&P500 tickers
                for sp_ticker in ['^GSPC', 'SPY']:
                    try:
                        sp500_data = yf.download(sp_ticker, start=start_date, end=end_date, progress=False)
                        if not sp500_data.empty and 'Close' in sp500_data.columns:
                            sp500_data = sp500_data['Close'].rename('SP500')
                            df = df.set_index('Date').join(sp500_data, how='left').reset_index()
                            logger.info(f"Successfully fetched S&P500 data using {sp_ticker}")
                            break
                    except:
                        continue
                else:
                    raise ValueError("All S&P500 tickers failed")
            except:
                logger.info("Using realistic S&P500 synthetic data (4000-5000 range)")
                # Use more realistic S&P500 values (typically 3500-5500)
                base_sp500 = 4500
                df['SP500'] = base_sp500 + np.random.normal(0, 200, len(df))
            
            # Fill any remaining NaN values
            df = df.fillna(method='ffill').fillna(method='bfill')
            
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
    
    def predict_future_prices(self, ticker: str, days: int = 5) -> Dict:
        """
        Predict future stock prices for the next N days
        """
        if not self.is_trained:
            logger.warning("Model not trained. Training now...")
            self.train_model(ticker)
        
        try:
            # Get recent data
            df = self.download_stock_data(ticker, 
                                        start_date=(datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d'))
            df = self.create_features(df)
            
            # Get the last available features
            last_features = df[self.feature_columns].iloc[-1:].copy()
            last_features_scaled = self.scaler.transform(last_features)
            last_features_scaled = pd.DataFrame(last_features_scaled, columns=self.feature_columns)
            
            future_predictions = []
            last_date = df['Date'].iloc[-1]
            future_dates = []
            
            # Find the Close column index for inverse transformation
            close_price_index = self.feature_columns.index('Close')
            
            for day in range(days):
                # Predict next day's price
                next_price_scaled = self.model.predict(last_features_scaled)[0]
                
                # Sanity check: ensure prediction is reasonable
                current_price = df['Close'].iloc[-1]
                
                # If prediction is way off (more than 50% change), cap it
                if abs(next_price_scaled - last_features_scaled.iloc[0, close_price_index]) > 0.5:
                    # Limit to max 10% daily change
                    max_change = 0.1
                    if next_price_scaled > last_features_scaled.iloc[0, close_price_index]:
                        next_price_scaled = last_features_scaled.iloc[0, close_price_index] * (1 + max_change)
                    else:
                        next_price_scaled = last_features_scaled.iloc[0, close_price_index] * (1 - max_change)
                
                # Create dummy array for inverse transformation
                dummy_array = last_features_scaled.values.copy()
                dummy_array[0, close_price_index] = next_price_scaled
                
                # Inverse transform to get actual price
                inverse_transformed = self.scaler.inverse_transform(dummy_array)
                next_price = inverse_transformed[0, close_price_index]
                
                # Additional sanity check on final price
                if next_price > current_price * 2 or next_price < current_price * 0.5:
                    # Cap extreme predictions to reasonable bounds
                    if next_price > current_price:
                        next_price = current_price * 1.1  # Max 10% increase
                    else:
                        next_price = current_price * 0.9  # Max 10% decrease
                
                future_predictions.append(next_price)
                
                # Update for next prediction
                new_date = last_date + timedelta(days=day + 1)
                future_dates.append(new_date)
                
                # Update lagged features for next iteration
                last_features_scaled.iloc[0, close_price_index] = next_price_scaled
                
                # Update lagged Close prices if they exist
                if 'Close_lag_5' in self.feature_columns:
                    close_lag_5_idx = self.feature_columns.index('Close_lag_5')
                    if 'Close_lag_3' in self.feature_columns:
                        close_lag_3_idx = self.feature_columns.index('Close_lag_3')
                        last_features_scaled.iloc[0, close_lag_5_idx] = last_features_scaled.iloc[0, close_lag_3_idx]
                
                if 'Close_lag_3' in self.feature_columns:
                    close_lag_3_idx = self.feature_columns.index('Close_lag_3')
                    if 'Close_lag_1' in self.feature_columns:
                        close_lag_1_idx = self.feature_columns.index('Close_lag_1')
                        last_features_scaled.iloc[0, close_lag_3_idx] = last_features_scaled.iloc[0, close_lag_1_idx]
                
                if 'Close_lag_1' in self.feature_columns:
                    close_lag_1_idx = self.feature_columns.index('Close_lag_1')
                    last_features_scaled.iloc[0, close_lag_1_idx] = next_price_scaled
            
            return {
                "ticker": ticker,
                "current_price": df['Close'].iloc[-1],
                "predictions": [
                    {
                        "date": date.strftime('%Y-%m-%d'),
                        "predicted_price": round(price, 2),
                        "days_ahead": i + 1
                    }
                    for i, (date, price) in enumerate(zip(future_dates, future_predictions))
                ],
                "timestamp": datetime.now().isoformat()
            }
            
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