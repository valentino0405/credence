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
        self.min_order_value = 100  # Minimum ₹100 order

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
            logger.error(f"❌ Error getting portfolio for {user_id}: {e}")
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
                return {"success": False, "message": f"Minimum order value is ₹{self.min_order_value}"}
            
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
                    "message": f"Insufficient funds. Need ₹{total_cost:.2f}, available ₹{portfolio['cash_balance']:.2f}"
                }
            
            # Execute buy order
            trade_result = await self._execute_buy_order(user_id, symbol, quantity, current_price, trading_fee)
            
            if trade_result["success"]:
                logger.info(f"✅ Buy order executed: {user_id} bought {quantity} shares of {symbol} at ₹{current_price}")
            
            return trade_result
            
        except Exception as e:
            logger.error(f"❌ Error placing buy order: {e}")
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
                logger.info(f"✅ Sell order executed: {user_id} sold {quantity} shares of {symbol} at ₹{current_price}")
            
            return trade_result
            
        except Exception as e:
            logger.error(f"❌ Error placing sell order: {e}")
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
            logger.error(f"❌ Error executing buy order: {e}")
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
            logger.error(f"❌ Error executing sell order: {e}")
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
            logger.error(f"❌ Error getting trade history: {e}")
            return []

    async def _create_default_portfolio(self, user_id: str) -> Dict:
        """Create default portfolio for new user"""
        try:
            db = await get_database()
            if not db:
                return self._get_default_portfolio(user_id)
            
            portfolio_doc = {
                "user_id": user_id,
                "cash_balance": 1000000.0,  # ₹10 lakh starting money
                "holdings": [],
                "total_trades": 0,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            await db[COLLECTIONS["user_portfolios"]].insert_one(portfolio_doc)
            logger.info(f"✅ Created default portfolio for user {user_id}")
            
            return portfolio_doc
            
        except Exception as e:
            logger.error(f"❌ Error creating default portfolio: {e}")
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

# Global instance
trading_service = TradingService()