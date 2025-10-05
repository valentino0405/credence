"use client";
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '@/config/api';
import {
  GlobeAltIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
}

interface MarketOverviewData {
  indices: MarketData[];
  top_stocks: MarketData[];
  market_status: string;
}

export default function MarketOverview() {
  const [marketData, setMarketData] = useState<MarketOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMarketOverview();
    
    // Update every 30 seconds
    const interval = setInterval(fetchMarketOverview, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMarketOverview = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/trading/market-overview`);
      if (response.ok) {
        const result = await response.json();
        setMarketData(result.data);
      } else {
        // Use mock data if API fails
        setMarketData(getMockMarketData());
      }
    } catch (error) {
      console.error('Error fetching market overview:', error);
      setMarketData(getMockMarketData());
    } finally {
      setIsLoading(false);
    }
  };

  const getMockMarketData = (): MarketOverviewData => ({
    indices: [
      {
        symbol: '^NSEI',
        name: 'NIFTY 50',
        price: 19450.25,
        change: 125.30,
        change_percent: 0.65
      },
      {
        symbol: '^BSESN',
        name: 'BSE SENSEX',
        price: 65432.10,
        change: -89.45,
        change_percent: -0.14
      }
    ],
    top_stocks: [
      {
        symbol: 'RELIANCE.NS',
        name: 'Reliance Industries',
        price: 2850.75,
        change: 15.25,
        change_percent: 0.54
      },
      {
        symbol: 'TCS.NS',
        name: 'Tata Consultancy Services',
        price: 4200.50,
        change: -28.30,
        change_percent: -0.67
      }
    ],
    market_status: 'open'
  });

  if (isLoading) {
    return (
      <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-12 bg-gray-700 rounded"></div>
            <div className="h-12 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <GlobeAltIcon className="h-6 w-6 text-purple-500" />
        Market Overview
      </h3>

      {/* Market Status */}
      <div className="mb-6 p-3 bg-green-600/20 border border-green-600/30 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-green-200">Market Status</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-white font-semibold capitalize">
              {marketData?.market_status || 'Open'}
            </span>
          </div>
        </div>
      </div>

      {/* Indices */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <ChartBarIcon className="h-5 w-5 text-blue-400" />
          Indices
        </h4>
        <div className="space-y-3">
          {marketData?.indices.map((index, i) => (
            <motion.div
              key={index.symbol}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-gray-700/20 rounded-lg p-3"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h5 className="font-semibold text-white text-sm">{index.name}</h5>
                  <p className="text-gray-400 text-xs">{index.symbol}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold">
                    {index.price.toLocaleString('en-IN')}
                  </p>
                  <div className={`flex items-center text-sm ${
                    index.change >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {index.change >= 0 ? (
                      <ArrowTrendingUpIcon className="h-3 w-3 mr-1" />
                    ) : (
                      <ArrowTrendingDownIcon className="h-3 w-3 mr-1" />
                    )}
                    {index.change_percent.toFixed(2)}%
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Top Stocks */}
      <div>
        <h4 className="text-lg font-semibold text-white mb-3">Top Stocks</h4>
        <div className="space-y-3">
          {marketData?.top_stocks.slice(0, 3).map((stock, i) => (
            <motion.div
              key={stock.symbol}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: (i + 2) * 0.1 }}
              className="bg-gray-700/20 rounded-lg p-3"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h5 className="font-semibold text-white text-sm">
                    {stock.name.length > 20 ? stock.name.substring(0, 20) + '...' : stock.name}
                  </h5>
                  <p className="text-gray-400 text-xs">{stock.symbol.replace('.NS', '')}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold">₹{stock.price.toFixed(2)}</p>
                  <div className={`flex items-center text-sm ${
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
            </motion.div>
          ))}
        </div>
      </div>

      {/* Last Updated */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <p className="text-gray-400 text-xs text-center">
          Last updated: {new Date().toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}