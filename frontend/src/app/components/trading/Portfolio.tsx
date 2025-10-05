"use client";
import React from 'react';
import { motion } from 'framer-motion';
import {
  BriefcaseIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyRupeeIcon,
  ChartPieIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { API_BASE_URL } from '@/config/api';

interface Holding {
  symbol: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  current_value: number;
  invested_value: number;
  pnl: number;
  pnl_percent: number;
  stock_name: string;
}

interface PortfolioData {
  user_id: string;
  cash_balance: number;
  holdings: Holding[];
  total_invested: number;
  current_value: number;
  total_pnl: number;
  total_pnl_percent: number;
  total_portfolio_value: number;
  total_trades: number;
}

interface PortfolioProps {
  portfolio: PortfolioData | null;
  onRefresh: () => void;
}

export default function Portfolio({ portfolio, onRefresh }: PortfolioProps) {
  if (!portfolio) {
    return (
      <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-700 rounded"></div>
            <div className="h-16 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <BriefcaseIcon className="h-6 w-6 text-purple-500" />
          Portfolio
        </h3>
        <button
          onClick={onRefresh}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowPathIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-700/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CurrencyRupeeIcon className="h-5 w-5 text-blue-400" />
            <span className="text-sm text-gray-400">Total Value</span>
          </div>
          <p className="text-xl font-bold text-white">
            ₹{portfolio.total_portfolio_value.toLocaleString('en-IN')}
          </p>
        </div>
        
        <div className="bg-gray-700/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <ChartPieIcon className="h-5 w-5 text-purple-400" />
            <span className="text-sm text-gray-400">P&L</span>
          </div>
          <p className={`text-xl font-bold ${portfolio.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {portfolio.total_pnl >= 0 ? '+' : ''}₹{portfolio.total_pnl.toLocaleString('en-IN')}
          </p>
          <p className={`text-sm ${portfolio.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ({portfolio.total_pnl_percent.toFixed(2)}%)
          </p>
        </div>
      </div>

      {/* Cash Balance */}
      <div className="bg-purple-600/20 border border-purple-600/30 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-purple-200">Available Cash</span>
          <span className="text-white font-semibold text-lg">
            ₹{portfolio.cash_balance.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Holdings */}
      <div>
        <h4 className="text-lg font-semibold text-white mb-4">
          Holdings ({portfolio.holdings.length})
        </h4>
        
        {portfolio.holdings.length > 0 ? (
          <div className="space-y-3">
            {portfolio.holdings.map((holding, index) => (
              <motion.div
                key={holding.symbol}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-700/20 rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h5 className="font-semibold text-white">{holding.stock_name}</h5>
                    <p className="text-gray-400 text-sm">{holding.symbol.replace('.NS', '')}</p>
                    <p className="text-gray-400 text-xs">
                      {holding.quantity} shares @ ₹{holding.avg_price.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold">₹{holding.current_price.toFixed(2)}</p>
                    <div className={`flex items-center text-sm ${
                      holding.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {holding.pnl >= 0 ? (
                        <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                      ) : (
                        <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
                      )}
                      {holding.pnl_percent.toFixed(2)}%
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Invested</p>
                    <p className="text-white font-medium">₹{holding.invested_value.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Current</p>
                    <p className="text-white font-medium">₹{holding.current_value.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">P&L</p>
                    <p className={`font-medium ${holding.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {holding.pnl >= 0 ? '+' : ''}₹{holding.pnl.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <BriefcaseIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No holdings yet</p>
            <p className="text-gray-500 text-sm mt-2">Start trading to build your portfolio</p>
          </div>
        )}
      </div>

      {/* Portfolio Stats */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-center">
            <p className="text-gray-400">Total Trades</p>
            <p className="text-white font-semibold text-lg">{portfolio.total_trades}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-400">Invested Amount</p>
            <p className="text-white font-semibold text-lg">₹{portfolio.total_invested.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}