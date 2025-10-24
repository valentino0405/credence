"use client";
import React, { useState, useEffect } from 'react';
import Aurora from '@/app/home/Aurora';
import { API_BASE_URL } from '../../config/api';

interface MarketData {
  ticker: string;
  current_price: number;
  change: number;
  change_percent: number;
  overall_trend: 'BULLISH' | 'BEARISH';
  next_day_prediction: number;
  confidence: number;
  loading?: boolean;
  error?: string;
}

const MarketPage: React.FC = () => {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  const popularStocks = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META', 'NFLX'];

  const fetchMarketData = async () => {
    setLoading(true);
    const promises = popularStocks.map(async (ticker) => {
      try {
        // Fetch current stock data
        const stockResponse = await fetch(`${API_BASE_URL}/candlestick-data?ticker=${ticker}`);
        if (!stockResponse.ok) {
          throw new Error(`Stock fetch failed ${stockResponse.status} ${stockResponse.statusText}`);
        }
        const stockData = await stockResponse.json();
        
        // Fetch AI prediction
        const aiResponse = await fetch(`${API_BASE_URL}/ai-prediction/${ticker}`);
        if (!aiResponse.ok) {
          throw new Error(`AI fetch failed ${aiResponse.status} ${aiResponse.statusText}`);
        }
        const aiData = await aiResponse.json();
        
        return {
          ticker,
          current_price: stockData.current_price,
          change: stockData.change,
          change_percent: stockData.change_percent,
          overall_trend: aiData.overall_trend,
          next_day_prediction: aiData.predictions[0]?.target_price || stockData.current_price,
          confidence: aiData.predictions[0]?.confidence || 0,
          loading: false
        };
      } catch (error) {
        console.error(`Error fetching data for ${ticker}:`, error);
        return {
          ticker,
          current_price: 0,
          change: 0,
          change_percent: 0,
          overall_trend: 'BEARISH' as const,
          next_day_prediction: 0,
          confidence: 0,
          loading: false,
          error: 'Failed to load'
        };
      }
    });
    
    const results = await Promise.all(promises);
    setMarketData(results);
    setLoading(false);
  };

  useEffect(() => {
    fetchMarketData();
    
    // Refresh data every 5 minutes
    const interval = setInterval(fetchMarketData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getMarketSentiment = () => {
    if (marketData.length === 0) return { sentiment: 'NEUTRAL', percentage: 0 };
    
    const bullishCount = marketData.filter(stock => stock.overall_trend === 'BULLISH').length;
    const percentage = (bullishCount / marketData.length) * 100;
    
    let sentiment = 'NEUTRAL';
    if (percentage >= 70) sentiment = 'VERY_BULLISH';
    else if (percentage >= 55) sentiment = 'BULLISH';
    else if (percentage >= 45) sentiment = 'NEUTRAL';
    else if (percentage >= 30) sentiment = 'BEARISH';
    else sentiment = 'VERY_BEARISH';
    
    return { sentiment, percentage };
  };

  const marketSentiment = getMarketSentiment();

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'VERY_BULLISH': return 'text-emerald-400';
      case 'BULLISH': return 'text-emerald-300';
      case 'NEUTRAL': return 'text-yellow-400';
      case 'BEARISH': return 'text-red-300';
      case 'VERY_BEARISH': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getSentimentEmoji = (sentiment: string) => {
    switch (sentiment) {
      case 'VERY_BULLISH': return 'VERY BULLISH';
      case 'BULLISH': return 'BULLISH';
      case 'NEUTRAL': return 'NEUTRAL';
      case 'BEARISH': return 'BEARISH';
      case 'VERY_BEARISH': return 'VERY BEARISH';
      default: return 'UNKNOWN';
    }
  };

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
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">
            Market Overview
          </h1>
          <p className="text-xl text-white/70">Real-time market data with AI-powered insights</p>
        </div>

        {/* Market Sentiment Card */}
        <div className="mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 text-center">
            <h2 className="text-2xl font-semibold mb-4 text-white">Overall Market Sentiment</h2>
            <div className="flex items-center justify-center gap-4 mb-4">
              <div>
                <div className={`text-3xl font-bold ${getSentimentColor(marketSentiment.sentiment)}`}>
                  {getSentimentEmoji(marketSentiment.sentiment)}
                </div>
                <div className="text-white/70">
                  {marketSentiment.percentage.toFixed(1)}% Bullish Stocks
                </div>
              </div>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${marketSentiment.percentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center mb-8">
          <button
            onClick={fetchMarketData}
            disabled={loading}
            className="cursor-target px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-500 hover:to-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Refreshing...' : 'Refresh Market Data'}
          </button>
        </div>

        {/* Market Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {popularStocks.map((ticker) => (
              <div key={ticker} className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 animate-pulse">
                <div className="h-6 bg-white/20 rounded mb-4"></div>
                <div className="h-8 bg-white/20 rounded mb-2"></div>
                <div className="h-4 bg-white/20 rounded mb-4"></div>
                <div className="h-16 bg-white/20 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {marketData.map((stock) => (
              <div 
                key={stock.ticker} 
                className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all cursor-pointer group"
                onClick={() => window.open(`/stocks/${stock.ticker}`, '_blank')}
              >
                {stock.error ? (
                  <div className="text-center text-red-400">
                    <h3 className="text-xl font-bold mb-2">{stock.ticker}</h3>
                    <p className="text-sm">Failed to load</p>
                  </div>
                ) : (
                  <>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
                        {stock.ticker}
                      </h3>
                      <div className={`px-2 py-1 rounded text-xs font-semibold ${
                        stock.overall_trend === 'BULLISH' 
                          ? 'bg-emerald-500/20 text-emerald-300' 
                          : 'bg-red-500/20 text-red-300'
                      }`}>
                        {stock.overall_trend === 'BULLISH' ? '' : ''} {stock.overall_trend}
                      </div>
                    </div>

                    {/* Current Price */}
                    <div className="mb-4">
                      <div className="text-2xl font-bold text-white">
                        ${stock.current_price.toFixed(2)}
                      </div>
                      <div className={`text-sm font-medium ${
                        stock.change >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)} ({stock.change >= 0 ? '+' : ''}{stock.change_percent.toFixed(2)}%)
                      </div>
                    </div>

                    {/* Prediction */}
                    <div className="border-t border-white/10 pt-4">
                      <div className="text-sm text-white/70 mb-1">Next Day Prediction</div>
                      <div className="flex justify-between items-center">
                        <div className={`text-lg font-semibold ${
                          stock.next_day_prediction > stock.current_price ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          ${stock.next_day_prediction.toFixed(2)}
                        </div>
                        <div className="text-sm text-white/60">
                          {stock.confidence.toFixed(0)}% confidence
                        </div>
                      </div>
                      <div className={`text-xs mt-1 ${
                        stock.next_day_prediction > stock.current_price ? 'text-emerald-300' : 'text-red-300'
                      }`}>
                        {stock.next_day_prediction > stock.current_price ? '↗' : '↘'} {
                          ((stock.next_day_prediction - stock.current_price) / stock.current_price * 100).toFixed(2)
                        }% predicted change
                      </div>
                    </div>

                    {/* Confidence Bar */}
                    <div className="mt-3">
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            stock.confidence >= 80 ? 'bg-emerald-500' :
                            stock.confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${stock.confidence}%` }}
                        ></div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-xl font-semibold mb-4 text-white">Market Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-emerald-400">
                  {marketData.filter(s => s.overall_trend === 'BULLISH').length}
                </div>
                <div className="text-white/70">Bullish Stocks</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">
                  {marketData.filter(s => s.overall_trend === 'BEARISH').length}
                </div>
                <div className="text-white/70">Bearish Stocks</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400">
                  {marketData.length > 0 ? (marketData.reduce((sum, s) => sum + s.confidence, 0) / marketData.length).toFixed(0) : 0}%
                </div>
                <div className="text-white/70">Avg Confidence</div>
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 px-6 py-4 rounded-xl text-center">
          <p className="text-sm">
            <strong>Disclaimer:</strong> All predictions are generated by AI models and should not be considered as financial advice. 
            Please do your own research before making investment decisions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MarketPage;
