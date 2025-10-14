'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Aurora from '@/app/home/Aurora';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../../config/api';

// Dynamically import ApexCharts to avoid SSR issues
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface StockData {
  ticker: string;
  current_price: number;
  change: number;
  change_percent: number;
  volume: number;
  candles: Array<{
    x: string;
    y: [number, number, number, number];
  }>;
}

interface AIData {
  overall_trend: 'BULLISH' | 'BEARISH';
  current_price: number;
  predictions: Array<{
    timeframe: string;
    direction: 'UP' | 'DOWN';
    target_price: number;
    confidence: number;
    change_percent?: number;
  }>;
  model_accuracy?: {
    mean_absolute_percentage_error?: number;
    median_absolute_percentage_error?: number;
    r2_score?: number;
    accuracy_period_days?: number;
  };
  future_predictions?: Array<{
    date: string;
    predicted_price: number;
    days_ahead: number;
  }>;
}

export default function StockPage(): React.ReactElement {
  const params = useParams();
  const ticker = params.ticker as string;
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [aiData, setAIData] = useState<AIData | null>(null);
  const [aiLoading, setAILoading] = useState<boolean>(true);
  const [aiError, setAIError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState<string>('');

  const fetchStockData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/candlestick-data?ticker=${ticker}`);
      if (!response.ok) throw new Error('Failed to fetch stock data');
      const data = await response.json();
      setStockData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stock data');
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  const fetchAIData = useCallback(async () => {
    try {
      setAILoading(true);
      setAIError(null);
      
      const url = `${API_BASE_URL}/ai-prediction/${ticker}`;
      console.log('🚀 Fetching AI predictions from:', url);
      
      const response = await fetch(url);
      console.log('📡 AI prediction response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ AI prediction error:', response.status, errorText);
        throw new Error(`Failed to fetch AI data: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ AI prediction data received:', data);
      setAIData(data);
    } catch (err) {
      console.error('❌ Failed to fetch AI data:', err);
      setAIError(err instanceof Error ? err.message : 'Failed to load AI predictions');
      setAIData(null);
    } finally {
      setAILoading(false);
    }
  }, [ticker]);

  // Handle redirect in useEffect to avoid render-time state updates
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (ticker) {
      fetchStockData();
      fetchAIData();
    }
  }, [ticker, fetchStockData, fetchAIData]);

  // Show loading while auth is loading
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-xl text-white">Loading...</div>
      </div>
    );
  }

  // Show loading while redirecting if not authenticated
  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-xl text-white">Redirecting...</div>
      </div>
    );
  }

  const chartOptions = {
    chart: {
      type: 'candlestick' as const,
      height: 400,
      toolbar: { show: true },
      background: 'transparent',
      foreColor: '#d1d5db'
    },
    theme: { mode: 'dark' as const },
    title: {
      text: `${stockData?.ticker} - 1 Day Chart`,
      align: 'left' as const,
      style: { fontSize: '16px', fontWeight: '600', color: '#ffffff' }
    },
    grid: {
      borderColor: 'rgba(255,255,255,0.08)',
      strokeDashArray: 3
    },
    xaxis: {
      type: 'datetime' as const,
      labels: { format: 'HH:mm', style: { colors: '#94a3b8' } },
      axisBorder: { color: 'rgba(255,255,255,0.15)' },
      axisTicks: { color: 'rgba(255,255,255,0.15)' }
    },
    yaxis: {
      tooltip: { enabled: true },
      labels: {
        formatter: (value: number) => `$${value.toFixed(2)}`,
        style: { colors: '#94a3b8' }
      }
    },
    plotOptions: {
      candlestick: {
        colors: {
          upward: '#4ade80',
          downward: '#ef4444'
        },
        wick: {
          useFillColor: true
        }
      }
    },
    tooltip: {
      theme: 'dark'
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading {ticker} data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className='w-full min-h-screen relative bg-black flex justify-center items-start overflow-hidden'>
      <div style={{ width: "100%", height: "900px", position: "absolute", top: 0, left: 0 }}>
        <Aurora
          colorStops={["#7CFF67", "#B19EEF", "#5227FF"]}
          blend={0.5}
         
          speed={1}
        />
      </div>

      <div className="flex w-full h-[calc(100vh-64px)] relative z-10">
        {/* Left Panel - Stock Chart (75%) */}
        <div className="flex-[3] p-4">
          <div className="h-full rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md p-4 shadow-lg shadow-black/30">
            {/* Stock Header */}
            <div className="mb-4">
              <h1 className="text-3xl font-bold tracking-tight text-white m-0">{stockData?.ticker}</h1>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-2xl font-semibold">${stockData?.current_price}</span>
                <span className={(stockData?.change || 0) >= 0 ? 'text-emerald-400 font-semibold text-sm' : 'text-red-400 font-semibold text-sm'}>
                  {(stockData?.change || 0) >= 0 ? '+' : ''}{stockData?.change}
                  ({(stockData?.change_percent || 0) >= 0 ? '+' : ''}{stockData?.change_percent}%)
                </span>
                <span className="text-xs text-white/70 font-medium">
                  Volume: {stockData?.volume?.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Chart */}
            <div className="h-[calc(100%-120px)]">
              {stockData && (
                <Chart
                  options={chartOptions}
                  series={[{
                    name: 'Price',
                    data: stockData.candles
                  }]}
                  type="candlestick"
                  height="100%"
                />
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - AI Predictions & Chat (25%) */}
        <div className="flex-1 p-4 pr-5 border-l border-white/5 overflow-auto">
          <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md p-4 h-full flex flex-col shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">🤖 <span>AI Predictions</span></h2>

            {/* Loading State */}
            {aiLoading && (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                <span className="ml-3 text-white/70">Loading AI predictions...</span>
              </div>
            )}

            {/* Error State */}
            {aiError && (
              <div className="mb-4 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300">
                <div className="text-sm">❌ {aiError}</div>
                <button 
                  onClick={() => fetchAIData()}
                  className="mt-2 px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 rounded border border-red-500/30 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {/* AI Trend */}
            {!aiLoading && !aiError && aiData && (
              <div className="mb-6">
                <div className={"mb-4 rounded-lg border px-3 py-2 text-sm font-medium " + (aiData.overall_trend === 'BULLISH' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300')}>
                  Overall Trend: {aiData.overall_trend === 'BULLISH' ? '📈 BULLISH' : '📉 BEARISH'}
                </div>

                {/* Model Accuracy Info */}
                {aiData.model_accuracy && (
                  <div className="mb-4 p-3 rounded-lg border border-blue-500/30 bg-blue-500/10">
                    <h4 className="text-xs font-semibold text-blue-300 mb-2 uppercase tracking-wide">Model Accuracy</h4>
                    <div className="text-xs text-blue-200 space-y-1">
                      {aiData.model_accuracy.mean_absolute_percentage_error && (
                        <div>Avg Error: {aiData.model_accuracy.mean_absolute_percentage_error.toFixed(1)}%</div>
                      )}
                      {aiData.model_accuracy.r2_score && (
                        <div>R² Score: {aiData.model_accuracy.r2_score.toFixed(3)}</div>
                      )}
                      {aiData.model_accuracy.accuracy_period_days && (
                        <div>Based on {aiData.model_accuracy.accuracy_period_days} days</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Current vs Predicted Price Comparison */}
                <div className="mb-4 p-3 rounded-lg border border-purple-500/30 bg-purple-500/10">
                  <h4 className="text-xs font-semibold text-purple-300 mb-2 uppercase tracking-wide">Price Analysis</h4>
                  <div className="text-xs text-purple-200 space-y-1">
                    <div className="flex justify-between">
                      <span>Current:</span>
                      <span className="font-semibold">${stockData?.current_price}</span>
                    </div>
                    {aiData.predictions[0] && (
                      <>
                        <div className="flex justify-between">
                          <span>Next Day:</span>
                          <span className={`font-semibold ${aiData.predictions[0].target_price > (stockData?.current_price || 0) ? 'text-emerald-300' : 'text-red-300'}`}>
                            ${aiData.predictions[0].target_price}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Change:</span>
                          <span className={`font-semibold ${aiData.predictions[0].change_percent ? (aiData.predictions[0].change_percent > 0 ? 'text-emerald-300' : 'text-red-300') : 'text-gray-300'}`}>
                            {aiData.predictions[0].change_percent ? `${aiData.predictions[0].change_percent > 0 ? '+' : ''}${aiData.predictions[0].change_percent.toFixed(2)}%` : 'N/A'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Predictions */}
                <div>
                  <h3 className="text-sm font-semibold mb-2 tracking-wide text-white/80 uppercase">Predictions</h3>
                  {aiData.predictions.map((pred, index) => (
                    <div key={index} className="mb-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs">
                      <div className="font-semibold text-white/90">{pred.timeframe}</div>
                      <div className={"font-bold " + (pred.direction === 'UP' ? 'text-emerald-400' : 'text-red-400')}>
                        {pred.direction === 'UP' ? '⬆️' : '⬇️'} {pred.direction}
                      </div>
                      <div className="font-medium text-white/80">Target: ${pred.target_price}</div>
                      <div className="font-medium text-white/70">Confidence: {pred.confidence}%</div>
                      {pred.change_percent !== undefined && (
                        <div className={`font-medium ${pred.change_percent > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {pred.change_percent > 0 ? '+' : ''}{pred.change_percent.toFixed(2)}%
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Future Predictions Timeline */}
                {aiData.future_predictions && aiData.future_predictions.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold mb-2 tracking-wide text-white/80 uppercase">5-Day Forecast</h3>
                    <div className="space-y-1">
                      {aiData.future_predictions.slice(0, 5).map((pred, index) => (
                        <div key={index} className="flex justify-between items-center text-xs px-2 py-1 rounded bg-white/5">
                          <span className="text-white/70">{new Date(pred.date).toLocaleDateString()}</span>
                          <span className={`font-semibold ${pred.predicted_price > (stockData?.current_price || 0) ? 'text-emerald-300' : 'text-red-300'}`}>
                            ${pred.predicted_price}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Simple Chat Interface */}
            <div className="mt-auto">
              <h3 className="text-sm font-semibold mb-2 tracking-wide text-white/80 uppercase flex items-center gap-1">💬 <span>Ask AI</span></h3>
              <div className="border border-white/15 rounded-lg bg-white/5 h-32 overflow-auto p-3 mb-2 text-xs text-white/70 italic font-medium">
                🔮 AI analysis complete! The model shows {aiData?.overall_trend === 'BULLISH' ? 'positive momentum' : 'bearish signals'} for {ticker}.
                {aiData?.model_accuracy?.mean_absolute_percentage_error && (
                  <>
                    <br /><br />
                    📊 Model accuracy: ~{(100 - aiData.model_accuracy.mean_absolute_percentage_error).toFixed(1)}% accurate predictions.
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about the stock..."
                  className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/40"
                />
                <button
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-medium hover:from-purple-700 hover:to-blue-700 transition"
                  onClick={() => {
                    alert('Advanced AI chat feature coming soon!');
                    setChatInput('');
                  }}
                >
                  Send
                </button>
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => {
                fetchStockData();
                fetchAIData();
              }}
              className="mt-4 w-full rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-medium py-3 transition"
            >
              🔄 Refresh Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
