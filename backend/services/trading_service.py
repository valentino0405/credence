"""
Trading Service for Mock Trading Simulation
Handles buy/sell orders, portfolio management, and P&L calculations
"""
from datetime import datetime
from database.config import get_database, COLLECTIONS
from services.stock_data_service import indian_stock_service
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

class TradingService:
    def __init__(self):
        self.trading_fee = 0.001  # 0.1% trading fee
        self.min_order_value = 100  # Minimum INR 100 order

    async def get_user_portfolio(self, user_id: str) -> Dict:
        """Get user's complete portfolio"""
        try:
            db = await get_database()
            if not db:
                return self._get_default_portfolio(user_id)
            
            # Get portfolio
            portfolio = await db[COLLECTIONS["user_portfolios"]].find_one({"user_id": user_id})
            if not portfolio:
                # Create default portfolio
                portfolio = await self._create_default_portfolio(user_id)
            
            # Get current stock prices for holdings
            holdings_with_current_prices = []
            total_invested = 0
            current_value = 0
            
            for holding in portfolio.get("holdings", []):
                stock_data = await indian_stock_service.get_real_time_price(holding["symbol"])
                current_price = stock_data.get("price", holding["avg_price"])
                
                holding_value = holding["quantity"] * current_price
                invested_value = holding["quantity"] * holding["avg_price"]
                pnl = holding_value - invested_value
                pnl_percent = (pnl / invested_value) * 100 if invested_value > 0 else 0
                
                holding_data = {
                    **holding,
                    "current_price": current_price,
                    "current_value": holding_value,
                    "invested_value": invested_value,
                    "pnl": pnl,
                    "pnl_percent": pnl_percent,
                    "stock_name": stock_data.get("name", holding["symbol"])
                }
                
                holdings_with_current_prices.append(holding_data)
                total_invested += invested_value
                current_value += holding_value
            
            total_pnl = current_value - total_invested
            total_pnl_percent = (total_pnl / total_invested) * 100 if total_invested > 0 else 0
            
            portfolio_data = {
                "user_id": user_id,
                "cash_balance": portfolio.get("cash_balance", 1000000),
                "holdings": holdings_with_current_prices,
                "total_invested": total_invested,
                "current_value": current_value,
                "total_pnl": total_pnl,
                "total_pnl_percent": total_pnl_percent,
                "total_portfolio_value": current_value + portfolio.get("cash_balance", 1000000),
                "total_trades": portfolio.get("total_trades", 0),
                "created_at": portfolio.get("created_at"),
                "updated_at": portfolio.get("updated_at")
            }
            
            return portfolio_data
            
        except Exception as e:
            logger.error(f"Error getting portfolio for {user_id}: {e}")
            return self._get_default_portfolio(user_id)

    async def place_buy_order(self, user_id: str, symbol: str, quantity: int) -> Dict:
        """Place a buy order"""
        try:
            # Get current stock price
            stock_data = await indian_stock_service.get_real_time_price(symbol)
            current_price = stock_data.get("price")
            
            if not current_price:
                return {"success": False, "message": "Unable to get stock price"}
            
            # Calculate order value
            order_value = quantity * current_price
            trading_fee = order_value * self.trading_fee
            total_cost = order_value + trading_fee
            
            if total_cost < self.min_order_value:
                return {"success": False, "message": f"Minimum order value is INR {self.min_order_value}"}
            
            # Get user portfolio
            db = await get_database()
            if not db:
                return {"success": False, "message": "Database not available"}
            
            portfolio = await db[COLLECTIONS["user_portfolios"]].find_one({"user_id": user_id})
            if not portfolio:
                return {"success": False, "message": "Portfolio not found"}
            
            # Check if user has enough cash
            if portfolio["cash_balance"] < total_cost:
                return {
                    "success": False, 
                    "message": f"Insufficient funds. Need INR {total_cost:.2f}, available INR {portfolio['cash_balance']:.2f}"
                }
            
            # Execute buy order
            trade_result = await self._execute_buy_order(user_id, symbol, quantity, current_price, trading_fee)
            
            if trade_result["success"]:
                logger.info(f"Buy order executed: {user_id} bought {quantity} shares of {symbol} at INR {current_price}")
            
            return trade_result
            
        except Exception as e:
            logger.error(f"Error placing buy order: {e}")
            return {"success": False, "message": str(e)}

    async def place_sell_order(self, user_id: str, symbol: str, quantity: int) -> Dict:
        """Place a sell order"""
        try:
            # Get current stock price
            stock_data = await indian_stock_service.get_real_time_price(symbol)
            current_price = stock_data.get("price")
            
            if not current_price:
                return {"success": False, "message": "Unable to get stock price"}
            
            # Get user portfolio
            db = await get_database()
            if not db:
                return {"success": False, "message": "Database not available"}
            
            portfolio = await db[COLLECTIONS["user_portfolios"]].find_one({"user_id": user_id})
            if not portfolio:
                return {"success": False, "message": "Portfolio not found"}
            
            # Check if user has enough shares
            user_holding = None
            for holding in portfolio.get("holdings", []):
                if holding["symbol"] == symbol:
                    user_holding = holding
                    break
            
            if not user_holding or user_holding["quantity"] < quantity:
                available_qty = user_holding["quantity"] if user_holding else 0
                return {
                    "success": False,
                    "message": f"Insufficient shares. You have {available_qty} shares of {symbol}"
                }
            
            # Calculate order value
            order_value = quantity * current_price
            trading_fee = order_value * self.trading_fee
            net_proceeds = order_value - trading_fee
            
            # Execute sell order
            trade_result = await self._execute_sell_order(user_id, symbol, quantity, current_price, trading_fee)
            
            if trade_result["success"]:
                logger.info(f"Sell order executed: {user_id} sold {quantity} shares of {symbol} at INR {current_price}")
            
            return trade_result
            
        except Exception as e:
            logger.error(f"Error placing sell order: {e}")
            return {"success": False, "message": str(e)}

    async def _execute_buy_order(self, user_id: str, symbol: str, quantity: int, price: float, fee: float) -> Dict:
        """Execute buy order and update portfolio"""
        try:
            db = await get_database()
            portfolio_collection = db[COLLECTIONS["user_portfolios"]]
            trades_collection = db[COLLECTIONS["user_trades"]]
            
            # Calculate costs
            order_value = quantity * price
            total_cost = order_value + fee
            
            # Record trade
            trade_doc = {
                "user_id": user_id,
                "symbol": symbol,
                "action": "buy",
                "quantity": quantity,
                "price": price,
                "order_value": order_value,
                "trading_fee": fee,
                "total_cost": total_cost,
                "timestamp": datetime.utcnow(),
                "status": "completed"
            }
            
            await trades_collection.insert_one(trade_doc)
            
            # Update portfolio
            portfolio = await portfolio_collection.find_one({"user_id": user_id})
            
            # Update cash balance
            new_cash_balance = portfolio["cash_balance"] - total_cost
            
            # Update holdings
            holdings = portfolio.get("holdings", [])
            existing_holding = None
            holding_index = -1
            
            for i, holding in enumerate(holdings):
                if holding["symbol"] == symbol:
                    existing_holding = holding
                    holding_index = i
                    break
            
            if existing_holding:
                # Update existing holding (average price calculation)
                total_quantity = existing_holding["quantity"] + quantity
                total_value = (existing_holding["quantity"] * existing_holding["avg_price"]) + order_value
                new_avg_price = total_value / total_quantity
                
                holdings[holding_index] = {
                    "symbol": symbol,
                    "quantity": total_quantity,
                    "avg_price": new_avg_price,
                    "first_buy_date": existing_holding["first_buy_date"],
                    "last_updated": datetime.utcnow()
                }
            else:
                # Add new holding
                holdings.append({
                    "symbol": symbol,
                    "quantity": quantity,
                    "avg_price": price,
                    "first_buy_date": datetime.utcnow(),
                    "last_updated": datetime.utcnow()
                })
            
            # Update portfolio document
            await portfolio_collection.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "cash_balance": new_cash_balance,
                        "holdings": holdings,
                        "total_trades": portfolio.get("total_trades", 0) + 1,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            return {
                "success": True,
                "message": f"Successfully bought {quantity} shares of {symbol}",
                "trade_details": {
                    "symbol": symbol,
                    "quantity": quantity,
                    "price": price,
                    "total_cost": total_cost,
                    "remaining_cash": new_cash_balance
                }
            }
            
        except Exception as e:
            logger.error(f"Error executing buy order: {e}")
            return {"success": False, "message": str(e)}

    async def _execute_sell_order(self, user_id: str, symbol: str, quantity: int, price: float, fee: float) -> Dict:
        """Execute sell order and update portfolio"""
        try:
            db = await get_database()
            portfolio_collection = db[COLLECTIONS["user_portfolios"]]
            trades_collection = db[COLLECTIONS["user_trades"]]
            
            # Calculate proceeds
            order_value = quantity * price
            net_proceeds = order_value - fee
            
            # Record trade
            trade_doc = {
                "user_id": user_id,
                "symbol": symbol,
                "action": "sell",
                "quantity": quantity,
                "price": price,
                "order_value": order_value,
                "trading_fee": fee,
                "net_proceeds": net_proceeds,
                "timestamp": datetime.utcnow(),
                "status": "completed"
            }
            
            await trades_collection.insert_one(trade_doc)
            
            # Update portfolio
            portfolio = await portfolio_collection.find_one({"user_id": user_id})
            
            # Update cash balance
            new_cash_balance = portfolio["cash_balance"] + net_proceeds
            
            # Update holdings
            holdings = portfolio.get("holdings", [])
            updated_holdings = []
            
            for holding in holdings:
                if holding["symbol"] == symbol:
                    remaining_quantity = holding["quantity"] - quantity
                    if remaining_quantity > 0:
                        # Keep holding with reduced quantity
                        updated_holdings.append({
                            **holding,
                            "quantity": remaining_quantity,
                            "last_updated": datetime.utcnow()
                        })
                    # If quantity becomes 0, don't add to updated_holdings (removes the holding)
                else:
                    updated_holdings.append(holding)
            
            # Update portfolio document
            await portfolio_collection.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "cash_balance": new_cash_balance,
                        "holdings": updated_holdings,
                        "total_trades": portfolio.get("total_trades", 0) + 1,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            return {
                "success": True,
                "message": f"Successfully sold {quantity} shares of {symbol}",
                "trade_details": {
                    "symbol": symbol,
                    "quantity": quantity,
                    "price": price,
                    "net_proceeds": net_proceeds,
                    "new_cash_balance": new_cash_balance
                }
            }
            
        except Exception as e:
            logger.error(f"Error executing sell order: {e}")
            return {"success": False, "message": str(e)}

    async def get_trade_history(self, user_id: str, limit: int = 50) -> List[Dict]:
        """Get user's trade history"""
        try:
            db = await get_database()
            if not db:
                return []
            
            trades = await db[COLLECTIONS["user_trades"]].find(
                {"user_id": user_id}
            ).sort("timestamp", -1).limit(limit).to_list(length=limit)
            
            # Convert ObjectId to string
            for trade in trades:
                trade["_id"] = str(trade["_id"])
            
            return trades
            
        except Exception as e:
            logger.error(f"Error getting trade history: {e}")
            return []

    async def _create_default_portfolio(self, user_id: str) -> Dict:
        """Create default portfolio for new user"""
        try:
            db = await get_database()
            if not db:
                return self._get_default_portfolio(user_id)
            
            portfolio_doc = {
                "user_id": user_id,
                "cash_balance": 1000000.0,  # INR 10 lakh starting money
                "holdings": [],
                "total_trades": 0,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            await db[COLLECTIONS["user_portfolios"]].insert_one(portfolio_doc)
            logger.info(f"Created default portfolio for user {user_id}")
            
            return portfolio_doc
            
        except Exception as e:
            logger.error(f"Error creating default portfolio: {e}")
            return self._get_default_portfolio(user_id)

    def _get_default_portfolio(self, user_id: str) -> Dict:
        """Get default portfolio structure"""
        return {
            "user_id": user_id,
            "cash_balance": 1000000.0,
            "holdings": [],
            "total_invested": 0,
            "current_value": 0,
            "total_pnl": 0,
            "total_pnl_percent": 0,
            "total_portfolio_value": 1000000.0,
            "total_trades": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

    async def calculate_portfolio_performance(self, user_id: str) -> Dict:
        """Calculate detailed portfolio performance metrics"""
        try:
            portfolio = await self.get_user_portfolio(user_id)
            trades = await self.get_trade_history(user_id, limit=1000)
            
            if not trades:
                return {
                    "total_return": 0,
                    "daily_return": 0,
                    "win_rate": 0,
                    "profit_factor": 0,
                    "sharpe_ratio": 0,
                    "max_drawdown": 0,
                    "best_trade": None,
                    "worst_trade": None
                }
            
            # Calculate trade statistics
            profitable_trades = []
            losing_trades = []
            all_returns = []
            
            for trade in trades:
                if trade["action"] == "sell":
                    # Find corresponding buy trade
                    buy_trades = [t for t in trades if t["symbol"] == trade["symbol"] and t["action"] == "buy" and t["timestamp"] < trade["timestamp"]]
                    if buy_trades:
                        avg_buy_price = sum(t["price"] for t in buy_trades) / len(buy_trades)
                        trade_return = (trade["price"] - avg_buy_price) / avg_buy_price * 100
                        all_returns.append(trade_return)
                        
                        if trade_return > 0:
                            profitable_trades.append(trade_return)
                        else:
                            losing_trades.append(abs(trade_return))
            
            # Performance metrics
            win_rate = len(profitable_trades) / len(all_returns) * 100 if all_returns else 0
            profit_factor = (sum(profitable_trades) / sum(losing_trades)) if losing_trades else float('inf') if profitable_trades else 0
            
            # Total return
            initial_value = 1000000.0  # Starting amount
            current_value = portfolio["total_portfolio_value"]
            total_return = ((current_value - initial_value) / initial_value) * 100
            
            # Best and worst trades
            best_trade = max(all_returns) if all_returns else 0
            worst_trade = min(all_returns) if all_returns else 0
            
            return {
                "total_return": round(total_return, 2),
                "win_rate": round(win_rate, 2),
                "profit_factor": round(profit_factor, 2),
                "total_trades": len(trades),
                "profitable_trades": len(profitable_trades),
                "losing_trades": len(losing_trades),
                "best_trade": round(best_trade, 2),
                "worst_trade": round(worst_trade, 2),
                "average_return": round(sum(all_returns) / len(all_returns), 2) if all_returns else 0
            }
            
        except Exception as e:
            logger.error(f"Error calculating portfolio performance: {e}")
            return {}

    async def risk_assessment(self, user_id: str, symbol: str, quantity: int) -> Dict:
        """Assess risk for a potential trade"""
        try:
            portfolio = await self.get_user_portfolio(user_id)
            stock_data = await indian_stock_service.get_real_time_price(symbol)
            
            if not stock_data:
                return {"risk_level": "HIGH", "message": "Unable to assess risk - no stock data"}
            
            current_price = stock_data.get("price", 0)
            order_value = quantity * current_price
            portfolio_value = portfolio["total_portfolio_value"]
            
            # Risk factors
            position_size = (order_value / portfolio_value) * 100
            cash_utilization = (order_value / portfolio["cash_balance"]) * 100
            
            # Existing position check
            existing_position = 0
            for holding in portfolio["holdings"]:
                if holding["symbol"] == symbol:
                    existing_position = holding["quantity"] * current_price
                    break
            
            total_exposure = (order_value + existing_position) / portfolio_value * 100
            
            # Risk assessment
            risk_factors = []
            risk_level = "LOW"
            
            if position_size > 20:
                risk_factors.append("Large position size (>20% of portfolio)")
                risk_level = "HIGH"
            elif position_size > 10:
                risk_factors.append("Moderate position size (>10% of portfolio)")
                risk_level = "MEDIUM"
            
            if cash_utilization > 80:
                risk_factors.append("High cash utilization (>80%)")
                risk_level = "HIGH"
            
            if total_exposure > 25:
                risk_factors.append("High concentration risk in single stock")
                risk_level = "HIGH"
            
            # Diversification check
            unique_stocks = len(set(h["symbol"] for h in portfolio["holdings"]))
            if unique_stocks < 3 and order_value > 100000:
                risk_factors.append("Low diversification")
                risk_level = "MEDIUM" if risk_level == "LOW" else risk_level
            
            return {
                "risk_level": risk_level,
                "position_size_percent": round(position_size, 2),
                "cash_utilization_percent": round(cash_utilization, 2),
                "total_exposure_percent": round(total_exposure, 2),
                "risk_factors": risk_factors,
                "recommendation": self._get_risk_recommendation(risk_level, risk_factors)
            }
            
        except Exception as e:
            logger.error(f"Error in risk assessment: {e}")
            return {"risk_level": "HIGH", "message": "Error assessing risk"}

    def _get_risk_recommendation(self, risk_level: str, risk_factors: List[str]) -> str:
        """Get risk-based recommendation"""
        if risk_level == "HIGH":
            return "High risk trade. Consider reducing position size or diversifying."
        elif risk_level == "MEDIUM":
            return "Moderate risk. Monitor position size and market conditions."
        else:
            return "Low risk trade. Good diversification opportunity."

    async def generate_trading_insights(self, user_id: str) -> Dict:
        """Generate personalized trading insights"""
        try:
            portfolio = await self.get_user_portfolio(user_id)
            performance = await self.calculate_portfolio_performance(user_id)
            
            insights = []
            recommendations = []
            
            # Portfolio analysis
            if portfolio["total_pnl_percent"] > 10:
                insights.append("Excellent portfolio performance! You're beating market averages.")
            elif portfolio["total_pnl_percent"] < -10:
                insights.append("Portfolio underperforming. Consider reviewing your strategy.")
            
            # Cash management
            cash_percent = (portfolio["cash_balance"] / portfolio["total_portfolio_value"]) * 100
            if cash_percent > 50:
                recommendations.append("High cash position. Consider investing for better returns.")
            elif cash_percent < 5:
                recommendations.append("Low cash reserves. Keep some cash for opportunities.")
            
            # Diversification analysis
            holdings_count = len(portfolio["holdings"])
            if holdings_count < 3:
                recommendations.append("Consider diversifying across more stocks to reduce risk.")
            elif holdings_count > 15:
                recommendations.append("High number of positions. Consider consolidating top performers.")
            
            # Performance insights
            if performance.get("win_rate", 0) < 40:
                insights.append("Low win rate detected. Focus on better entry timing.")
            elif performance.get("win_rate", 0) > 70:
                insights.append("Great win rate! You're picking winners consistently.")
            
            return {
                "insights": insights,
                "recommendations": recommendations,
                "portfolio_score": self._calculate_portfolio_score(portfolio, performance),
                "next_action": self._suggest_next_action(portfolio, performance)
            }
            
        except Exception as e:
            logger.error(f"Error generating trading insights: {e}")
            return {"insights": [], "recommendations": []}

    def _calculate_portfolio_score(self, portfolio: Dict, performance: Dict) -> int:
        """Calculate portfolio health score out of 100"""
        score = 50  # Base score
        
        # Performance component (30 points)
        if portfolio["total_pnl_percent"] > 15:
            score += 30
        elif portfolio["total_pnl_percent"] > 5:
            score += 20
        elif portfolio["total_pnl_percent"] > 0:
            score += 10
        elif portfolio["total_pnl_percent"] < -15:
            score -= 20
        
        # Diversification component (20 points)
        holdings_count = len(portfolio["holdings"])
        if 5 <= holdings_count <= 12:
            score += 20
        elif 3 <= holdings_count <= 15:
            score += 10
        
        # Cash management (20 points)
        cash_percent = (portfolio["cash_balance"] / portfolio["total_portfolio_value"]) * 100
        if 10 <= cash_percent <= 30:
            score += 20
        elif 5 <= cash_percent <= 50:
            score += 10
        
        # Win rate (30 points)
        win_rate = performance.get("win_rate", 0)
        if win_rate > 60:
            score += 30
        elif win_rate > 45:
            score += 20
        elif win_rate > 30:
            score += 10
        
        return max(0, min(100, score))

    def _suggest_next_action(self, portfolio: Dict, performance: Dict) -> str:
        """Suggest next trading action"""
        cash_percent = (portfolio["cash_balance"] / portfolio["total_portfolio_value"]) * 100
        holdings_count = len(portfolio["holdings"])
        
        if cash_percent > 50:
            return "Consider investing excess cash in diversified stocks"
        elif holdings_count < 3:
            return "Focus on building a diversified portfolio with 3-5 quality stocks"
        elif portfolio["total_pnl_percent"] < -5:
            return "Review underperforming positions and consider rebalancing"
        else:
            return "Monitor current positions and look for new opportunities"

# Global instance
trading_service = TradingService()