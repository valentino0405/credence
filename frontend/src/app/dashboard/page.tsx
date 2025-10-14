"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Aurora from '@/app/home/Aurora';
import { useAuth, useUser } from '@clerk/nextjs';
import dynamic from 'next/dynamic';
import { API_BASE_URL } from '../../config/api';

// Dynamically import ApexCharts to avoid SSR issues
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface PortfolioData {
  total_value: number;
  total_invested: number;
  profit_loss: number;
  profit_loss_percentage: number;
  holdings: Array<{
    ticker: string;
    shares: number;
    avg_price: number;
    current_value: number;
    profit_loss: number;
    profit_loss_percentage: number;
  }>;
}

interface TradingInsight {
  insight_type: string;
  message: string;
  confidence: number;
  timestamp: string;
}

// Adjust this value to move the hero content vertically.
// Negative = move up, Positive = move down.
const HERO_VERTICAL_OFFSET_PX = -30; // match home page offset

export default function Dashboard(): React.ReactElement {
  const [ticker, setTicker] = useState<string>('');
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [insights, setInsights] = useState<TradingInsight[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();

  const fetchPortfolioData = async () => {
    if (!user?.id) return;
    
    try {
      const [portfolioRes, insightsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/trading/portfolio-performance/${user.id}`),
        fetch(`${API_BASE_URL}/trading/insights/${user.id}`)
      ]);
      
      if (portfolioRes.ok) {
        const portfolioData = await portfolioRes.json();
        setPortfolioData(portfolioData);
      }
      
      if (insightsRes.ok) {
        const insightsData = await insightsRes.json();
        setInsights(insightsData.insights || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle redirect in useEffect to avoid render-time state updates
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (isSignedIn && user?.id) {
      fetchPortfolioData();
    }
  }, [isSignedIn, user?.id]);

  // Show loading while auth is loading
  if (!isLoaded) {
    return (
      <div className='w-full h-screen relative bg-black flex justify-center items-center'>
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Show loading while redirecting if not authenticated
  if (!isSignedIn) {
    return (
      <div className='w-full h-screen relative bg-black flex justify-center items-center'>
        <div className="text-white text-xl">Redirecting...</div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (ticker.trim()) {
      router.push(`/stocks/${ticker.toUpperCase()}`);
    }
  };

  const popularStocks = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META'];

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Aurora Background */}
      <div style={{ width: "100%", height: "100vh", position: "absolute", top: 0, left: 0, zIndex: 0 }}>
        <Aurora
          colorStops={["#7CFF67", "#B19EEF", "#5227FF"]}
          blend={0.3}
          amplitude={0.8}
          speed={0.4}
        />
      </div>

      <div className="relative z-10 container mx-auto p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">
            🚀 AI Trading Dashboard
          </h1>
          <p className="text-xl text-white/70">Welcome back, {user?.firstName || 'Trader'}!</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-xl text-white/70">Loading your dashboard...</div>
          </div>
        ) : (
          <>
            {/* Portfolio Overview */}
            {portfolioData && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                  <h3 className="text-lg font-semibold text-white/80 mb-2">Portfolio Value</h3>
                  <div className="text-3xl font-bold text-white">
                    ${portfolioData.total_value.toLocaleString()}
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                  <h3 className="text-lg font-semibold text-white/80 mb-2">Total Invested</h3>
                  <div className="text-3xl font-bold text-white">
                    ${portfolioData.total_invested.toLocaleString()}
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                  <h3 className="text-lg font-semibold text-white/80 mb-2">P&L</h3>
                  <div className={`text-3xl font-bold ${
                    portfolioData.profit_loss >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    ${Math.abs(portfolioData.profit_loss).toLocaleString()}
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                  <h3 className="text-lg font-semibold text-white/80 mb-2">P&L %</h3>
                  <div className={`text-3xl font-bold ${
                    portfolioData.profit_loss_percentage >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {portfolioData.profit_loss_percentage >= 0 ? '+' : ''}{portfolioData.profit_loss_percentage.toFixed(2)}%
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
              {/* Stock Analysis */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-4">📊 Stock Analysis</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    type="text"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value)}
                    placeholder="Enter ticker (e.g., AAPL)"
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/40 focus:outline-none text-white placeholder-white/40"
                  />
                  <button
                    type="submit"
                    className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-500 hover:to-blue-500 transition-colors"
                  >
                    Analyze Stock
                  </button>
                </form>
              </div>

            {/* Trading Platform */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-semibold text-white mb-4">💰 Mock Trading</h3>
              <p className="text-white/70 mb-4">Practice trading with real market data and AI insights</p>
              <button
                onClick={() => router.push('/dashboard/trading')}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-500 hover:to-emerald-500 transition-colors"
              >
                Start Trading
              </button>
            </div>

            {/* AI Chat */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-semibold text-white mb-4">🤖 AI Assistant</h3>
              <p className="text-white/70 mb-4">Get AI-powered market insights and trading advice</p>
              <button
                onClick={() => router.push('/chatbot')}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-500 hover:to-purple-500 transition-colors"
              >
                Start AI Chat
              </button>
            </div>              {/* Predictions */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-4">🔮 Predictions</h3>
                <p className="text-white/70 mb-4">Advanced ML predictions up to 30 days</p>
                <button
                  onClick={() => router.push('/prediction')}
                  className="w-full px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-lg hover:from-orange-500 hover:to-amber-500 transition-colors"
                >
                  View Predictions
                </button>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Holdings */}
              {portfolioData && portfolioData.holdings.length > 0 && (
                <div className="lg:col-span-2 bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                  <h3 className="text-xl font-semibold text-white mb-6">📈 Your Holdings</h3>
                  <div className="space-y-4">
                    {portfolioData.holdings.map((holding, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-semibold text-white">{holding.ticker}</span>
                            <span className="text-sm text-white/60">{holding.shares} shares</span>
                          </div>
                          <div className="text-sm text-white/70">
                            Avg: ${holding.avg_price.toFixed(2)} • Value: ${holding.current_value.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-semibold ${
                            holding.profit_loss >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {holding.profit_loss >= 0 ? '+' : ''}${holding.profit_loss.toFixed(2)}
                          </div>
                          <div className={`text-sm ${
                            holding.profit_loss_percentage >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {holding.profit_loss_percentage >= 0 ? '+' : ''}{holding.profit_loss_percentage.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Trading Insights */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-6">🧠 AI Insights</h3>
                {insights.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {insights.map((insight, index) => (
                      <div key={index} className="p-4 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-purple-300">
                            {insight.insight_type}
                          </span>
                          <span className="text-xs text-white/60">
                            {(insight.confidence * 100).toFixed(0)}% confidence
                          </span>
                        </div>
                        <p className="text-white/80 text-sm">{insight.message}</p>
                        <div className="text-xs text-white/50 mt-2">
                          {new Date(insight.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-white/60 py-8">
                    <p>Start trading to get AI-powered insights!</p>
                  </div>
                )}
              </div>

              {/* Popular Stocks - Show when no holdings */}
              {(!portfolioData || portfolioData.holdings.length === 0) && (
                <div className="lg:col-span-2 bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                  <h3 className="text-xl font-semibold text-white mb-6">🔥 Popular Stocks</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {popularStocks.map((stock) => (
                      <button
                        key={stock}
                        onClick={() => router.push(`/stocks/${stock}`)}
                        className="p-4 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all duration-200 font-semibold text-white/90 hover:text-white"
                      >
                        {stock}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Getting Started Section for New Users */}
            {(!portfolioData || portfolioData.holdings.length === 0) && (
              <div className="mt-8 bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <h3 className="text-2xl font-semibold text-white mb-4">🎯 Get Started with AI Trading</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-4xl mb-3">📊</div>
                    <h4 className="text-lg font-semibold text-white mb-2">Analyze Stocks</h4>
                    <p className="text-white/70 text-sm">Research stocks with real-time data and AI insights</p>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl mb-3">🔮</div>
                    <h4 className="text-lg font-semibold text-white mb-2">AI Predictions</h4>
                    <p className="text-white/70 text-sm">Get 30-day price predictions with confidence levels</p>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl mb-3">🤖</div>
                    <h4 className="text-lg font-semibold text-white mb-2">Chat with AI</h4>
                    <p className="text-white/70 text-sm">Ask questions and get trading recommendations</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
