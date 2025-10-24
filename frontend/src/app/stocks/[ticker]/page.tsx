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
  const [thirtyDayData, setThirtyDayData] = useState<any>(null);
  const [thirtyDayLoading, setThirtyDayLoading] = useState<boolean>(false);
  const [showThirtyDay, setShowThirtyDay] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
      console.log('Fetching AI predictions from:', url);
      
      const response = await fetch(url);
      console.log('AI prediction response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI prediction error:', response.status, errorText);
        throw new Error(`Failed to fetch AI data: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('AI prediction data received:', data);
      setAIData(data);
    } catch (err) {
      console.error('Failed to fetch AI data:', err);
      setAIError(err instanceof Error ? err.message : 'Failed to load AI predictions');
      setAIData(null);
    } finally {
      setAILoading(false);
    }
  }, [ticker]);

  const fetch30DayData = useCallback(async () => {
    try {
      setThirtyDayLoading(true);
      
      const url = `${API_BASE_URL}/prediction-30day/${ticker}`;
      console.log('Fetching 30-day predictions from:', url);
      
      const response = await fetch(url);
      console.log('30-day prediction response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('30-day prediction error:', response.status, errorText);
        throw new Error(`Failed to fetch 30-day data: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('30-day prediction data received:', data);
      setThirtyDayData(data);
      setShowThirtyDay(true);
    } catch (err) {
      console.error('Failed to fetch 30-day data:', err);
      setThirtyDayData(null);
    } finally {
      setThirtyDayLoading(false);
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
      toolbar: { 
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        }
      },
      background: 'transparent',
      foreColor: '#d1d5db'
    },
    theme: { mode: 'dark' as const },
    title: {
      text: `${stockData?.ticker} - 1 Day Chart`,
      align: 'left' as const,
      style: { 
        fontSize: typeof window !== 'undefined' && window.innerWidth < 640 ? '14px' : '16px', 
        fontWeight: '600', 
        color: '#ffffff' 
      }
    },
    responsive: [{
      breakpoint: 640,
      options: {
        chart: {
          toolbar: {
            show: false
          }
        },
        title: {
          style: {
            fontSize: '12px'
          }
        }
      }
    }],
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
    <div className='w-full min-h-screen relative bg-black flex justify-center items-start overflow-x-hidden'>
      <div style={{ width: "100%", height: "900px", position: "absolute", top: 0, left: 0 }}>
        <Aurora
          colorStops={["#7CFF67", "#B19EEF", "#5227FF"]}
          blend={0.5}
         
          speed={1}
        />
      </div>

      <div className="flex flex-col lg:flex-row w-full min-h-screen relative z-10 pt-16 sm:pt-20">
        {/* Left Panel - Stock Chart */}
        <div className="w-full lg:flex-[3] p-3 sm:p-4 lg:p-6">
          <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md p-3 sm:p-4 shadow-lg shadow-black/30 h-[500px] sm:h-[600px] lg:h-[calc(100vh-140px)]">
            {/* Stock Header */}
            <div className="mb-3 sm:mb-4">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white m-0">{stockData?.ticker}</h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:gap-4 mt-2">
                <span className="text-lg sm:text-xl lg:text-2xl font-semibold">${stockData?.current_price}</span>
                <span className={(stockData?.change || 0) >= 0 ? 'text-emerald-400 font-semibold text-xs sm:text-sm' : 'text-red-400 font-semibold text-xs sm:text-sm'}>
                  {(stockData?.change || 0) >= 0 ? '+' : ''}{stockData?.change}
                  ({(stockData?.change_percent || 0) >= 0 ? '+' : ''}{stockData?.change_percent}%)
                </span>
                <span className="text-xs sm:text-sm text-white/70 font-medium">
                  Volume: {stockData?.volume?.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Chart */}
            <div className="h-[400px] sm:h-[500px] lg:h-[calc(100%-100px)]">
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

        {/* Right Panel - AI Predictions */}
        <div className="w-full lg:flex-1 p-3 sm:p-4 lg:p-6 lg:border-l border-white/5 flex flex-col">
          <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md p-4 sm:p-5 lg:p-6 shadow-lg shadow-black/30 overflow-y-auto max-h-[600px] lg:max-h-[calc(100vh-140px)]">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2 text-white">🤖 <span>AI Predictions</span></h2>

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
                <div className="text-sm">{aiError}</div>
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
                  Overall Trend: {aiData.overall_trend === 'BULLISH' ? 'BULLISH' : 'BEARISH'}
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
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold mb-4 tracking-wide text-white/80 uppercase">Predictions</h3>
                  {aiData.predictions.map((pred, index) => (
                    <div key={index} className="rounded-xl border border-white/15 bg-white/5 p-4 hover:bg-white/10 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-white/90 text-sm">{pred.timeframe}</div>
                        <div className={`text-xs px-2 py-1 rounded-full font-medium ${pred.direction === 'UP' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                          {pred.direction === 'UP' ? '⬆️ UP' : '⬇️ DOWN'}
                        </div>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-white/70">Target Price:</span>
                          <span className="font-semibold text-white/90">${pred.target_price}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-white/70">Confidence:</span>
                          <span className="font-semibold text-blue-300">{pred.confidence}%</span>
                        </div>
                        {pred.change_percent !== undefined && (
                          <div className="flex justify-between items-center">
                            <span className="text-white/70">Expected Change:</span>
                            <span className={`font-semibold ${pred.change_percent > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {pred.change_percent > 0 ? '+' : ''}{pred.change_percent.toFixed(2)}%
                            </span>
                          </div>
                        )}
                      </div>
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

            {/* AI Analysis Summary */}
            {!aiLoading && !aiError && aiData && (
              <div className="mt-6 p-4 rounded-lg border border-white/15 bg-white/5">
                <h3 className="text-sm font-semibold mb-3 tracking-wide text-white/90 uppercase">� Analysis Summary</h3>
                <div className="text-xs text-white/70 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-white/80">Overall Trend:</span>
                    <span className={`font-semibold ${aiData.overall_trend === 'BULLISH' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {aiData.overall_trend === 'BULLISH' ? 'BULLISH' : 'BEARISH'}
                    </span>
                  </div>
                  {aiData.model_accuracy?.mean_absolute_percentage_error && (
                    <div className="flex items-center gap-2">
                      <span className="text-white/80">Model Accuracy:</span>
                      <span className="font-semibold text-blue-400">
                        ~{(100 - aiData.model_accuracy.mean_absolute_percentage_error).toFixed(1)}%
                      </span>
                    </div>
                  )}
                  <div className="text-white/60 text-xs italic mt-3">
                    Predictions based on XGBoost ML model. Past performance doesn't guarantee future results.
                  </div>
                </div>
              </div>
            )}

            {/* 30-Day Prediction Button */}
            <div className="mt-6 space-y-3">
              <button
                onClick={fetch30DayData}
                disabled={thirtyDayLoading}
                className="w-full rounded-lg bg-purple-600/80 hover:bg-purple-600 disabled:bg-purple-600/40 text-white text-sm font-medium py-3 transition-colors flex items-center justify-center gap-2"
              >
                {thirtyDayLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Loading 30-Day...
                  </>
                ) : (
                  <>
                    Get 30-Day Forecast
                  </>
                )}
              </button>

              {/* 30-Day Predictions Display */}
              {showThirtyDay && thirtyDayData && (
                <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
                  <h3 className="text-sm font-semibold mb-3 text-purple-300 uppercase tracking-wide">30-Day Forecast</h3>
                  
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-white/70">Final Price:</span>
                      <span className="font-semibold text-white">${thirtyDayData.final_predicted_price}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-white/70">Total Change:</span>
                      <span className={`font-semibold ${thirtyDayData.total_expected_change > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {thirtyDayData.total_expected_change > 0 ? '+' : ''}{thirtyDayData.total_expected_change}%
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-white/70">Overall Trend:</span>
                      <span className={`font-semibold ${thirtyDayData.overall_trend === 'BULLISH' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {thirtyDayData.overall_trend === 'BULLISH' ? 'BULLISH' : 'BEARISH'}
                      </span>
                    </div>

                    {thirtyDayData.key_milestones && (
                      <div className="mt-4 space-y-2">
                        <div className="text-white/80 font-medium">Key Milestones:</div>
                        {thirtyDayData.key_milestones.next_week && (
                          <div className="flex justify-between text-xs">
                            <span className="text-white/60">1 Week:</span>
                            <span className="text-white/80">${thirtyDayData.key_milestones.next_week.predicted_price}</span>
                          </div>
                        )}
                        {thirtyDayData.key_milestones.two_weeks && (
                          <div className="flex justify-between text-xs">
                            <span className="text-white/60">2 Weeks:</span>
                            <span className="text-white/80">${thirtyDayData.key_milestones.two_weeks.predicted_price}</span>
                          </div>
                        )}
                        {thirtyDayData.key_milestones.one_month && (
                          <div className="flex justify-between text-xs">
                            <span className="text-white/60">1 Month:</span>
                            <span className="text-white/80">${thirtyDayData.key_milestones.one_month.predicted_price}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      onClick={() => setShowThirtyDay(false)}
                      className="mt-3 w-full text-xs text-purple-300 hover:text-purple-200 transition-colors"
                    >
                      Hide 30-Day Forecast
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => {
                fetchStockData();
                fetchAIData();
              }}
              className="mt-4 w-full rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white text-sm font-medium py-3 transition-colors flex items-center justify-center gap-2"
            >
              Refresh Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
