"use client";
import React, { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { API_BASE_URL } from '@/config/api';
import { motion } from 'framer-motion';
import {
  CurrencyRupeeIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ShoppingCartIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
}

interface Portfolio {
  cash_balance: number;
  holdings: any[];
}

interface OrderPanelProps {
  stock: Stock;
  portfolio: Portfolio | null;
  onTradeComplete: () => void;
}

export default function OrderPanel({ stock, portfolio, onTradeComplete }: OrderPanelProps) {
  const { userId } = useAuth();
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState<number>(1);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const orderValue = quantity * stock.price;
  const tradingFee = orderValue * 0.001; // 0.1% fee
  const totalCost = orderValue + tradingFee;
  const netProceeds = orderValue - tradingFee;

  // Check if user has enough shares to sell
  const userHolding = portfolio?.holdings.find(h => h.symbol === stock.symbol);
  const availableShares = userHolding?.quantity || 0;

  const canBuy = portfolio && portfolio.cash_balance >= totalCost && quantity > 0;
  const canSell = userHolding && availableShares >= quantity && quantity > 0;

  const handlePlaceOrder = async () => {
    if (!userId || !canBuy && orderType === 'buy' || !canSell && orderType === 'sell') {
      return;
    }

    setIsPlacingOrder(true);
    
    try {
      const endpoint = orderType === 'buy' ? `${API_BASE_URL}/api/v1/trading/buy` : `${API_BASE_URL}/api/v1/trading/sell`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          symbol: stock.symbol,
          quantity: quantity
        })
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message);
        onTradeComplete();
        setQuantity(1); // Reset quantity
      } else {
        toast.error(result.detail || 'Order failed');
      }
    } catch (error) {
      console.error('Order error:', error);
      toast.error('Failed to place order');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <ShoppingCartIcon className="h-6 w-6 text-purple-500" />
        Place Order
      </h3>

      {/* Stock Info */}
      <div className="mb-6 p-4 bg-gray-700/30 rounded-lg">
        <h4 className="font-semibold text-white">{stock.name}</h4>
        <p className="text-gray-400 text-sm">{stock.symbol}</p>
        <div className="flex justify-between items-center mt-2">
          <span className="text-xl font-bold text-white">₹{stock.price.toFixed(2)}</span>
          <span className={`flex items-center text-sm ${stock.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {stock.change >= 0 ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />}
            {stock.change >= 0 ? '+' : ''}₹{stock.change.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Order Type Toggle */}
      <div className="flex bg-gray-700/50 rounded-lg p-1 mb-6">
        <button
          onClick={() => setOrderType('buy')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${
            orderType === 'buy' 
              ? 'bg-green-600 text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <ArrowUpIcon className="h-4 w-4 inline mr-1" />
          Buy
        </button>
        <button
          onClick={() => setOrderType('sell')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${
            orderType === 'sell' 
              ? 'bg-red-600 text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <ArrowDownIcon className="h-4 w-4 inline mr-1" />
          Sell
        </button>
      </div>

      {/* Quantity Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Quantity
        </label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
          >
            -
          </button>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="flex-1 p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-center"
            min="1"
          />
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
          >
            +
          </button>
        </div>
        
        {/* Available shares for sell orders */}
        {orderType === 'sell' && (
          <p className="text-sm text-gray-400 mt-1">
            Available: {availableShares} shares
          </p>
        )}
      </div>

      {/* Order Summary */}
      <div className="mb-6 p-4 bg-gray-700/20 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Order Value:</span>
          <span className="text-white">₹{orderValue.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Trading Fee (0.1%):</span>
          <span className="text-white">₹{tradingFee.toFixed(2)}</span>
        </div>
        <div className="border-t border-gray-600 pt-2">
          <div className="flex justify-between font-semibold">
            <span className="text-gray-300">
              {orderType === 'buy' ? 'Total Cost:' : 'Net Proceeds:'}
            </span>
            <span className="text-white">
              ₹{(orderType === 'buy' ? totalCost : netProceeds).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Cash Balance */}
      <div className="mb-6 p-3 bg-purple-600/20 border border-purple-600/30 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-purple-200 flex items-center gap-1">
            <BanknotesIcon className="h-4 w-4" />
            Available Cash:
          </span>
          <span className="text-white font-semibold">
            ₹{(portfolio?.cash_balance || 0).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Place Order Button */}
      <motion.button
        onClick={handlePlaceOrder}
        disabled={isPlacingOrder || (orderType === 'buy' && !canBuy) || (orderType === 'sell' && !canSell)}
        className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
          orderType === 'buy'
            ? canBuy
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : canSell
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
        }`}
        whileTap={{ scale: 0.98 }}
      >
        {isPlacingOrder ? (
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Placing Order...
          </div>
        ) : (
          `${orderType === 'buy' ? 'Buy' : 'Sell'} ${quantity} Share${quantity > 1 ? 's' : ''}`
        )}
      </motion.button>

      {/* Order Validation Messages */}
      {orderType === 'buy' && !canBuy && portfolio && (
        <p className="text-red-400 text-sm mt-2 text-center">
          {portfolio.cash_balance < totalCost 
            ? 'Insufficient funds' 
            : 'Invalid quantity'
          }
        </p>
      )}
      
      {orderType === 'sell' && !canSell && (
        <p className="text-red-400 text-sm mt-2 text-center">
          {!userHolding 
            ? 'You don\'t own this stock' 
            : availableShares < quantity 
              ? 'Insufficient shares' 
              : 'Invalid quantity'
          }
        </p>
      )}
    </div>
  );
}