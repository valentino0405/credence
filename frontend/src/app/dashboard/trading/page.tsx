"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  CurrencyRupeeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PlusIcon,
  MinusIcon,
  EyeIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import toast, { Toaster } from 'react-hot-toast';

// Components
import StockChart from '@/app/components/trading/StockChart';
import OrderPanel from '@/app/components/trading/OrderPanel';
import Portfolio from '@/app/components/trading/Portfolio';
import Watchlist from '@/app/components/trading/Watchlist';
import MarketOverview from '@/app/components/trading/MarketOverview';
import { API_BASE_URL } from '@/config/api';

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
}

interface PortfolioData {
  user_id: string;
  cash_balance: number;
  holdings: any[];
  total_invested: number;
  current_value: number;
  total_pnl: number;
  total_pnl_percent: number;
  total_portfolio_value: number;
  total_trades: number;
}

export default function TradingDashboard(): React.ReactElement | null {
  const { userId, isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [watchlist, setWatchlist] = useState<StockData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chart' | 'portfolio' | 'orders'>('chart');

  // Authentication check
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  // Load initial data
  useEffect(() => {
    if (isSignedIn && userId) {
      loadInitialData();
    }
  }, [isSignedIn, userId]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      
      // Load portfolio, watchlist, and select default stock
      await Promise.all([
        loadPortfolio(),
        loadWatchlist(),
        loadDefaultStock()
      ]);
      
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('Failed to load trading data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPortfolio = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/trading/portfolio-performance/${userId}`);
      if (response.ok) {
        const result = await response.json();
        setPortfolio({
          user_id: userId || '',
          cash_balance: 100000, // Mock initial balance
          holdings: result.holdings || [],
          total_invested: result.total_invested || 0,
          current_value: result.total_value || 0,
          total_pnl: result.profit_loss || 0,
          total_pnl_percent: result.profit_loss_percentage || 0,
          total_portfolio_value: result.total_value || 100000,
          total_trades: result.holdings?.length || 0
        });
      }
    } catch (error) {
      console.error('Error loading portfolio:', error);
    }
  };

  const loadWatchlist = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/trading/watchlist/${userId}`);
      if (response.ok) {
        const result = await response.json();
        setWatchlist(result.data.watchlist);
      }
    } catch (error) {
      console.error('Error loading watchlist:', error);
    }
  };

  const loadDefaultStock = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/trading/stock/RELIANCE.NS`);
      if (response.ok) {
        const result = await response.json();
        setSelectedStock(result.data);
      }
    } catch (error) {
      console.error('Error loading default stock:', error);
    }
  };

  const handleStockSelect = async (symbol: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/trading/stock/${symbol}`);
      if (response.ok) {
        const result = await response.json();
        setSelectedStock(result.data);
      }
    } catch (error) {
      console.error('Error loading stock:', error);
      toast.error('Failed to load stock data');
    }
  };

  const handleTradeComplete = () => {
    // Refresh portfolio after trade
    loadPortfolio();
    toast.success('Trade executed successfully!');
  };

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p>Loading Trading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="border-b border-gray-800 bg-black/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <ChartBarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
                Trading Dashboard
              </h1>
              <p className="text-gray-400 mt-1 text-sm sm:text-base">Mock trading with real market data</p>
            </div>
            
            {/* Portfolio Summary */}
            {portfolio && (
              <div className="flex gap-4 sm:gap-6 text-xs sm:text-sm w-full sm:w-auto">
                <div className="text-center flex-1 sm:flex-none">
                  <p className="text-gray-400">Portfolio Value</p>
                  <p className="text-white font-bold text-base sm:text-lg">
                    ₹{portfolio.total_portfolio_value.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="text-center flex-1 sm:flex-none">
                  <p className="text-gray-400">P&L</p>
                  <p className={`font-bold text-base sm:text-lg ${portfolio.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {portfolio.total_pnl >= 0 ? '+' : ''}₹{portfolio.total_pnl.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="text-center flex-1 sm:flex-none">
                  <p className="text-gray-400">Cash</p>
                  <p className="text-white font-bold text-base sm:text-lg">
                    ₹{portfolio.cash_balance.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          
          {/* Left Sidebar - Watchlist */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            <Watchlist 
              watchlist={watchlist}
              selectedStock={selectedStock}
              onStockSelect={handleStockSelect}
            />
          </div>
          
          {/* Main Content Area */}
          <div className="lg:col-span-6 order-1 lg:order-2">
            {/* Tab Navigation */}
            <div className="flex bg-gray-800/50 rounded-lg p-1 mb-4 sm:mb-6 overflow-x-auto">
              <button
                onClick={() => setActiveTab('chart')}
                className={`flex-1 py-2 px-2 sm:px-4 rounded-md transition-colors whitespace-nowrap text-sm sm:text-base ${
                  activeTab === 'chart' 
                    ? 'bg-purple-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <ChartBarIcon className="h-4 w-4 sm:h-5 sm:w-5 inline mr-1 sm:mr-2" />
                Chart
              </button>
              <button
                onClick={() => setActiveTab('portfolio')}
                className={`flex-1 py-2 px-2 sm:px-4 rounded-md transition-colors whitespace-nowrap text-sm sm:text-base ${
                  activeTab === 'portfolio' 
                    ? 'bg-purple-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <EyeIcon className="h-4 w-4 sm:h-5 sm:w-5 inline mr-1 sm:mr-2" />
                Portfolio
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`flex-1 py-2 px-2 sm:px-4 rounded-md transition-colors whitespace-nowrap text-sm sm:text-base ${
                  activeTab === 'orders' 
                    ? 'bg-purple-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <ClockIcon className="h-4 w-4 sm:h-5 sm:w-5 inline mr-1 sm:mr-2" />
                Orders
              </button>
            </div>

            {/* Tab Content */}
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'chart' && selectedStock && (
                <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700 p-4 sm:p-6">
                  <div className="mb-4 sm:mb-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white">{selectedStock.name}</h2>
                        <p className="text-gray-400 text-sm sm:text-base">{selectedStock.symbol}</p>
                      </div>
                      <div className="text-left sm:text-right w-full sm:w-auto">
                        <p className="text-2xl sm:text-3xl font-bold text-white">₹{selectedStock.price.toFixed(2)}</p>
                        <p className={`flex items-center text-sm sm:text-base ${selectedStock.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {selectedStock.change >= 0 ? (
                            <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                          ) : (
                            <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
                          )}
                          {selectedStock.change >= 0 ? '+' : ''}₹{selectedStock.change.toFixed(2)} ({selectedStock.change_percent.toFixed(2)}%)
                        </p>
                      </div>
                    </div>
                  </div>
                  <StockChart symbol={selectedStock.symbol} />
                </div>
              )}

              {activeTab === 'portfolio' && (
                <Portfolio 
                  portfolio={portfolio}
                  onRefresh={loadPortfolio}
                />
              )}

              {activeTab === 'orders' && (
                <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700 p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Order History</h3>
                  <p className="text-gray-400 text-sm sm:text-base">Order history will be displayed here...</p>
                </div>
              )}
            </motion.div>
          </div>
          
          {/* Right Sidebar - Order Panel */}
          <div className="lg:col-span-3 order-3">
            <div className="space-y-4 sm:space-y-6">
              {selectedStock && (
                <OrderPanel 
                  stock={selectedStock}
                  portfolio={portfolio}
                  onTradeComplete={handleTradeComplete}
                />
              )}
              
              <MarketOverview />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}