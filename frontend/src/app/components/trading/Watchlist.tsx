"use client";
import React from 'react';
import { motion } from 'framer-motion';
import {
  EyeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { API_BASE_URL } from '@/config/api';

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
}

interface WatchlistProps {
  watchlist: StockData[];
  selectedStock: StockData | null;
  onStockSelect: (symbol: string) => void;
}

export default function Watchlist({ watchlist, selectedStock, onStockSelect }: WatchlistProps) {
  return (
    <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <EyeIcon className="h-6 w-6 text-purple-500" />
        Watchlist
      </h3>

      <div className="space-y-3">
        {watchlist.map((stock, index) => (
          <motion.div
            key={stock.symbol}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onStockSelect(stock.symbol)}
            className={`p-4 rounded-lg cursor-pointer transition-all hover:bg-gray-700/50 ${
              selectedStock?.symbol === stock.symbol 
                ? 'bg-purple-600/20 border border-purple-600/30' 
                : 'bg-gray-700/20 hover:bg-gray-700/40'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-semibold text-white text-sm truncate">
                  {stock.name}
                </h4>
                <p className="text-gray-400 text-xs">{stock.symbol.replace('.NS', '')}</p>
              </div>
              <div className="text-right">
                <p className="text-white font-semibold">₹{stock.price.toFixed(2)}</p>
                <div className={`flex items-center text-xs ${
                  stock.change >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {stock.change >= 0 ? (
                    <ArrowTrendingUpIcon className="h-3 w-3 mr-1" />
                  ) : (
                    <ArrowTrendingDownIcon className="h-3 w-3 mr-1" />
                  )}
                  {stock.change_percent.toFixed(2)}%
                </div>
              </div>
            </div>
            
            {/* Mini chart placeholder */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <ChartBarIcon className="h-3 w-3" />
                Vol: {(stock.volume / 1000).toFixed(0)}K
              </div>
              
              {/* Simple trend indicator */}
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full ${
                      stock.change >= 0 ? 'bg-green-400' : 'bg-red-400'
                    }`}
                    style={{ 
                      height: `${Math.random() * 12 + 4}px`,
                      opacity: 0.7 - (i * 0.1)
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {watchlist.length === 0 && (
        <div className="text-center py-8">
          <EyeIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No stocks in watchlist</p>
          <p className="text-gray-500 text-sm mt-2">Add stocks to track them here</p>
        </div>
      )}
    </div>
  );
}