"use client";
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Aurora from '@/app/home/Aurora';
import { API_BASE_URL } from '../../config/api';

// Dynamically import ApexCharts to avoid SSR issues
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface PredictionData {
  ticker: string;
  current_price: number;
  predictions: Array<{
    date: string;
    predicted_price: number;
    days_ahead: number;
  }>;
}

interface AccuracyData {
  mean_absolute_percentage_error: number;
  median_absolute_percentage_error: number;
  r2_score: number;
  accuracy_period_days: number;
}

const PredictionPage: React.FC = () => {
  const [ticker, setTicker] = useState<string>('AAPL');
  const [predictionData, setPredictionData] = useState<PredictionData | null>(null);
  const [accuracyData, setAccuracyData] = useState<AccuracyData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<number>(5);

  const fetchPredictions = async () => {
    if (!ticker) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/advanced-prediction/${ticker}?days=${selectedDays}`);
      if (!response.ok) throw new Error('Failed to fetch predictions');
      
      const data = await response.json();
      setPredictionData(data.predictions);
      setAccuracyData(data.accuracy_metrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch predictions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, [ticker, selectedDays]);

  const chartOptions = {
    chart: {
      type: 'line' as const,
      height: 400,
      toolbar: { show: true },
      background: 'transparent',
      foreColor: '#d1d5db'
    },
    theme: { mode: 'dark' as const },
    title: {
      text: `${ticker} - ${selectedDays} Day Price Prediction`,
      align: 'center' as const,
      style: { fontSize: '18px', fontWeight: '600', color: '#ffffff' }
    },
    grid: {
      borderColor: 'rgba(255,255,255,0.08)',
      strokeDashArray: 3
    },
    xaxis: {
      type: 'datetime' as const,
      labels: { 
        format: 'MMM dd',
        style: { colors: '#94a3b8' }
      },
      axisBorder: { color: 'rgba(255,255,255,0.15)' },
      axisTicks: { color: 'rgba(255,255,255,0.15)' }
    },
    yaxis: {
      title: {
        text: 'Price ($)',
        style: { color: '#94a3b8' }
      },
      labels: {
        formatter: (value: number) => `$${value.toFixed(2)}`,
        style: { colors: '#94a3b8' }
      }
    },
    stroke: {
      width: 3,
      curve: 'smooth' as const
    },
    colors: ['#4ade80', '#f59e0b'],
    markers: {
      size: 6,
      strokeWidth: 2,
      fillOpacity: 1
    },
    tooltip: {
      theme: 'dark'
    },
    legend: {
      position: 'top' as const,
      labels: {
        colors: '#ffffff'
      }
    }
  };

  const prepareChartData = () => {
    if (!predictionData) return [];

    const currentDate = new Date();
    const currentData = [{
      x: currentDate.getTime(),
      y: predictionData.current_price
    }];

    const predictionChartData = predictionData.predictions.map(pred => ({
      x: new Date(pred.date).getTime(),
      y: pred.predicted_price
    }));

    return [
      {
        name: 'Current Price',
        data: currentData
      },
      {
        name: 'Predicted Prices',
        data: predictionChartData
      }
    ];
  };

  const popularStocks = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META', 'NFLX'];

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
            🔮 AI Stock Predictions
          </h1>
          <p className="text-xl text-white/70">Advanced XGBoost machine learning predictions</p>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-6 mb-8 justify-center items-center">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-white/80">Stock Ticker</label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="Enter ticker (e.g., AAPL)"
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/40 focus:outline-none text-white placeholder-white/40"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-white/80">Prediction Days</label>
            <select
              value={selectedDays}
              onChange={(e) => setSelectedDays(Number(e.target.value))}
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/40 focus:outline-none text-white"
            >
              <option value={3}>3 Days</option>
              <option value={5}>5 Days</option>
              <option value={7}>1 Week</option>
              <option value={14}>2 Weeks</option>
              <option value={30}>1 Month</option>
            </select>
          </div>

          <button
            onClick={fetchPredictions}
            disabled={loading}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-500 hover:to-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Get Predictions'}
          </button>
        </div>

        {/* Popular Stocks */}
        <div className="mb-8 text-center">
          <h3 className="text-lg font-semibold mb-4 text-white/90">Popular Stocks</h3>
          <div className="flex flex-wrap justify-center gap-2">
            {popularStocks.map((stock) => (
              <button
                key={stock}
                onClick={() => setTicker(stock)}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  ticker === stock 
                    ? 'bg-purple-600 border-purple-500 text-white' 
                    : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/20'
                }`}
              >
                {stock}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-6 py-4 rounded-xl mb-8 text-center">
            <p className="font-medium">Error: {error}</p>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart Section */}
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              {predictionData && !loading ? (
                <Chart
                  options={chartOptions}
                  series={prepareChartData()}
                  type="line"
                  height={400}
                />
              ) : loading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-xl text-white/70">Loading predictions...</div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-96">
                  <div className="text-xl text-white/70">Enter a ticker symbol to see predictions</div>
                </div>
              )}
            </div>
          </div>

          {/* Stats and Accuracy */}
          <div className="space-y-6">
            {/* Current Stats */}
            {predictionData && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold mb-4 text-white">📊 Current Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-white/70">Ticker:</span>
                    <span className="font-semibold text-white">{predictionData.ticker}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Current Price:</span>
                    <span className="font-semibold text-white">${predictionData.current_price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Predictions:</span>
                    <span className="font-semibold text-white">{predictionData.predictions.length} days</span>
                  </div>
                  {predictionData.predictions.length > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-white/70">Final Price:</span>
                        <span className={`font-semibold ${
                          predictionData.predictions[predictionData.predictions.length - 1].predicted_price > predictionData.current_price 
                            ? 'text-emerald-400' 
                            : 'text-red-400'
                        }`}>
                          ${predictionData.predictions[predictionData.predictions.length - 1].predicted_price.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Total Change:</span>
                        <span className={`font-semibold ${
                          predictionData.predictions[predictionData.predictions.length - 1].predicted_price > predictionData.current_price 
                            ? 'text-emerald-400' 
                            : 'text-red-400'
                        }`}>
                          {((predictionData.predictions[predictionData.predictions.length - 1].predicted_price - predictionData.current_price) / predictionData.current_price * 100).toFixed(2)}%
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Model Accuracy */}
            {accuracyData && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold mb-4 text-white">🎯 Model Accuracy</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-white/70">Avg Error:</span>
                    <span className="font-semibold text-white">{accuracyData.mean_absolute_percentage_error.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Median Error:</span>
                    <span className="font-semibold text-white">{accuracyData.median_absolute_percentage_error.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">R² Score:</span>
                    <span className="font-semibold text-white">{accuracyData.r2_score.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Accuracy:</span>
                    <span className="font-semibold text-emerald-400">
                      ~{(100 - accuracyData.mean_absolute_percentage_error).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Test Period:</span>
                    <span className="font-semibold text-white">{accuracyData.accuracy_period_days} days</span>
                  </div>
                </div>
              </div>
            )}

            {/* Prediction List */}
            {predictionData && predictionData.predictions.length > 0 && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold mb-4 text-white">📅 Daily Predictions</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {predictionData.predictions.map((pred, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <div className="text-sm">
                        <div className="text-white/90 font-medium">{new Date(pred.date).toLocaleDateString()}</div>
                        <div className="text-white/60 text-xs">Day +{pred.days_ahead}</div>
                      </div>
                      <div className={`font-semibold text-lg ${
                        pred.predicted_price > predictionData.current_price ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        ${pred.predicted_price.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 px-6 py-4 rounded-xl text-center">
          <p className="text-sm">
            ⚠️ <strong>Disclaimer:</strong> These predictions are generated by machine learning models and should not be considered as financial advice. 
            Stock markets are inherently unpredictable and past performance does not guarantee future results.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PredictionPage;
