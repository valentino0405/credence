"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  EyeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  XMarkIcon
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

interface AvailableStock {
  symbol: string;
  name: string;
  exchange: string;
}

interface WatchlistProps {
  watchlist: StockData[];
  selectedStock: StockData | null;
  onStockSelect: (symbol: string) => void;
  onAddToWatchlist?: (symbol: string) => void;
}

export default function Watchlist({ watchlist, selectedStock, onStockSelect, onAddToWatchlist }: WatchlistProps) {
  const [showAddStock, setShowAddStock] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AvailableStock[]>([]);
  const [availableStocks, setAvailableStocks] = useState<AvailableStock[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch available stocks on component mount
  useEffect(() => {
    fetchAvailableStocks();
  }, []);

  const fetchAvailableStocks = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/trading/available-stocks`);
      if (response.ok) {
        const data = await response.json();
        setAvailableStocks(data.data.stocks);
      }
    } catch (error) {
      console.error('Error fetching available stocks:', error);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      // Filter available stocks locally for faster search
      const filtered = availableStocks.filter(
        stock => 
          stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
          stock.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10);
      
      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching stocks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStock = (symbol: string) => {
    if (onAddToWatchlist) {
      onAddToWatchlist(symbol);
    }
    setShowAddStock(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <EyeIcon className="h-6 w-6 text-purple-500" />
          Watchlist
        </h3>
        <button
          onClick={() => setShowAddStock(!showAddStock)}
          className="p-2 rounded-lg bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 transition-colors"
        >
          {showAddStock ? <XMarkIcon className="h-5 w-5" /> : <PlusIcon className="h-5 w-5" />}
        </button>
      </div>

      {/* Add Stock Search */}
      <AnimatePresence>
        {showAddStock && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search Indian stocks (e.g., Reliance, TCS, HDFC)..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-3 max-h-60 overflow-y-auto bg-gray-700/30 rounded-lg border border-gray-600">
                {searchResults.map((stock) => (
                  <div
                    key={stock.symbol}
                    onClick={() => handleAddStock(stock.symbol)}
                    className="p-3 hover:bg-gray-600/50 cursor-pointer border-b border-gray-600/50 last:border-b-0"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-white">{stock.symbol.replace('.NS', '')}</p>
                        <p className="text-sm text-gray-400">{stock.name}</p>
                      </div>
                      <span className="text-xs text-purple-400">{stock.exchange}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && searchResults.length === 0 && !isLoading && (
              <div className="mt-3 p-4 text-center text-gray-400">
                No stocks found for "{searchQuery}"
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Watchlist Items */}
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

      {watchlist.length === 0 && !showAddStock && (
        <div className="text-center py-8">
          <EyeIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No stocks in watchlist</p>
          <p className="text-gray-500 text-sm mt-2">Click + to add Indian stocks to track</p>
        </div>
      )}
    </div>
  );
}