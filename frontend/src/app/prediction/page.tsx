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
    confidence_level?: number;
  }>;
}

interface ExtendedPredictionData {
  ticker: string;
  current_price: number;
  extended_predictions: {
    base_scenario: Array<{
      date: string;
      predicted_price: number;
      days_ahead: number;
      confidence_level: number;
    }>;
    optimistic_scenario: Array<{
      date: string;
      predicted_price: number;
      days_ahead: number;
      confidence_level: number;
    }>;
    pessimistic_scenario: Array<{
      date: string;
      predicted_price: number;
      days_ahead: number;
      confidence_level: number;
    }>;
  };
  summary: {
    prediction_horizon: number;
    average_confidence: number;
    volatility_estimate: number;
    trend_direction: string;
    risk_level: string;
  };
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
  const [extendedData, setExtendedData] = useState<ExtendedPredictionData | null>(null);
  const [accuracyData, setAccuracyData] = useState<AccuracyData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<number>(5);
  const [predictionType, setPredictionType] = useState<'standard' | 'extended'>('standard');

  const fetchPredictions = async () => {
    if (!ticker) return;
    
    setLoading(true);
    setError(null);
    
    try {
      if (predictionType === 'extended' && selectedDays === 30) {
        // Use extended 30-day prediction API
  const response = await fetch(`${API_BASE_URL}/extended-prediction/${ticker}`);
        if (!response.ok) throw new Error('Failed to fetch extended predictions');
        
  const data = await response.json();
  setExtendedData(data);
        setPredictionData(null);
      } else {
        // Use standard prediction API
        const response = await fetch(`${API_BASE_URL}/advanced-prediction/${ticker}?days=${selectedDays}`);
        if (!response.ok) throw new Error('Failed to fetch predictions');
        
        const data = await response.json();
        // Backend returns detailed structure; normalize to match component expectations
        const detailed = data.detailed_predictions || data;
        const base = detailed?.prediction_scenarios?.base || {};
        const preds = detailed?.predictions || base?.predictions || detailed?.future_predictions || [];
        setPredictionData({
          ticker: (data.summary?.ticker || '').toString() || ticker,
          current_price: detailed.current_price || 0,
          predictions: preds.map((p: any, idx: number) => ({
            date: p.date || p.timestamp || '',
            predicted_price: p.predicted_price || p.target_price || p.price || 0,
            days_ahead: p.days_ahead ?? idx + 1,
            confidence_level: p.confidence || p.confidence_level
          }))
        } as any);
        setAccuracyData(data.accuracy_metrics || data.model_accuracy || null);
        setExtendedData(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch predictions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, [ticker, selectedDays, predictionType]);

  useEffect(() => {
    // Auto-switch to extended mode when 30 days is selected
    if (selectedDays === 30) {
      setPredictionType('extended');
    } else {
      setPredictionType('standard');
    }
  }, [selectedDays]);

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
      text: `${ticker} - ${selectedDays} Day Price Prediction ${predictionType === 'extended' ? '(Multi-Scenario)' : ''}`,
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
      width: predictionType === 'extended' ? [4, 3, 3, 3] : [3, 3],
      curve: 'smooth' as const
    },
    colors: predictionType === 'extended' 
      ? ['#4ade80', '#10b981', '#f59e0b', '#ef4444'] 
      : ['#4ade80', '#f59e0b'],
    markers: {
      size: predictionType === 'extended' ? [8, 6, 6, 6] : [6, 6],
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
    if (extendedData) {
      // Extended prediction chart data
      const currentDate = new Date();
      const currentData = [{
        x: currentDate.getTime(),
        y: extendedData.current_price
      }];

      const baseData = extendedData.extended_predictions.base_scenario.map(pred => ({
        x: new Date(pred.date).getTime(),
        y: pred.predicted_price
      }));

      const optimisticData = extendedData.extended_predictions.optimistic_scenario.map(pred => ({
        x: new Date(pred.date).getTime(),
        y: pred.predicted_price
      }));

      const pessimisticData = extendedData.extended_predictions.pessimistic_scenario.map(pred => ({
        x: new Date(pred.date).getTime(),
        y: pred.predicted_price
      }));

      return [
        { name: 'Current Price', data: currentData },
        { name: 'Base Scenario', data: baseData },
        { name: 'Optimistic Scenario', data: optimisticData },
        { name: 'Pessimistic Scenario', data: pessimisticData }
      ];
    } else if (predictionData) {
      // Standard prediction chart data
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
        { name: 'Current Price', data: currentData },
        { name: 'Predicted Prices', data: predictionChartData }
      ];
    }
    return [];
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
            AI Stock Predictions
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
              <option value={30}>30 Days (Multi-Scenario)</option>
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

        {/* Extended Prediction Summary */}
        {extendedData && (
          <div className="mb-8 bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-2xl font-semibold mb-4 text-white">30-Day Extended Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white/10 rounded-lg p-4 text-center">
                <div className="text-sm text-white/70">Trend Direction</div>
                <div className={`text-xl font-bold ${
                  extendedData.summary.trend_direction === 'Bullish' ? 'text-green-400' :
                  extendedData.summary.trend_direction === 'Bearish' ? 'text-red-400' : 'text-yellow-400'
                }`}>
                  {extendedData.summary.trend_direction}
                </div>
              </div>
              <div className="bg-white/10 rounded-lg p-4 text-center">
                <div className="text-sm text-white/70">Risk Level</div>
                <div className={`text-xl font-bold ${
                  extendedData.summary.risk_level === 'Low' ? 'text-green-400' :
                  extendedData.summary.risk_level === 'Medium' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {extendedData.summary.risk_level}
                </div>
              </div>
              <div className="bg-white/10 rounded-lg p-4 text-center">
                <div className="text-sm text-white/70">Avg Confidence</div>
                <div className="text-xl font-bold text-white">
                  {(extendedData.summary.average_confidence * 100).toFixed(1)}%
                </div>
              </div>
              <div className="bg-white/10 rounded-lg p-4 text-center">
                <div className="text-sm text-white/70">Volatility</div>
                <div className="text-xl font-bold text-white">
                  {(extendedData.summary.volatility_estimate * 100).toFixed(1)}%
                </div>
              </div>
              <div className="bg-white/10 rounded-lg p-4 text-center">
                <div className="text-sm text-white/70">Horizon</div>
                <div className="text-xl font-bold text-white">
                  {extendedData.summary.prediction_horizon} Days
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart Section */}
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              {(predictionData || extendedData) && !loading ? (
                <Chart
                  options={chartOptions}
                  series={prepareChartData()}
                  type="line"
                  height={450}
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
            {(predictionData || extendedData) && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold mb-4 text-white">Current Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-white/70">Ticker:</span>
                    <span className="font-semibold text-white">
                      {predictionData?.ticker || extendedData?.ticker}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Current Price:</span>
                    <span className="font-semibold text-white">
                      ${(predictionData?.current_price || extendedData?.current_price || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Prediction Type:</span>
                    <span className="font-semibold text-white">
                      {predictionType === 'extended' ? 'Multi-Scenario' : 'Standard'}
                    </span>
                  </div>
                  {extendedData && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-white/70">Base Scenario (30d):</span>
                        <span className={`font-semibold ${
                          extendedData.extended_predictions.base_scenario[29].predicted_price > extendedData.current_price 
                            ? 'text-emerald-400' 
                            : 'text-red-400'
                        }`}>
                          ${extendedData.extended_predictions.base_scenario[29].predicted_price.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Expected Change:</span>
                        <span className={`font-semibold ${
                          extendedData.extended_predictions.base_scenario[29].predicted_price > extendedData.current_price 
                            ? 'text-emerald-400' 
                            : 'text-red-400'
                        }`}>
                          {((extendedData.extended_predictions.base_scenario[29].predicted_price - extendedData.current_price) / extendedData.current_price * 100).toFixed(2)}%
                        </span>
                      </div>
                    </>
                  )}
                  {predictionData && predictionData.predictions.length > 0 && (
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
                <h3 className="text-xl font-semibold mb-4 text-white">Model Accuracy</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-white/70">Avg Error:</span>
                    <span className="font-semibold text-white">{accuracyData?.mean_absolute_percentage_error?.toFixed(2) ?? 'N/A'}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Median Error:</span>
                    <span className="font-semibold text-white">{accuracyData?.median_absolute_percentage_error?.toFixed(2) ?? 'N/A'}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">R² Score:</span>
                    <span className="font-semibold text-white">{accuracyData?.r2_score?.toFixed(3) ?? 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Accuracy:</span>
                    <span className="font-semibold text-emerald-400">
                      ~{accuracyData?.mean_absolute_percentage_error ? (100 - accuracyData.mean_absolute_percentage_error).toFixed(1) : 'N/A'}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Test Period:</span>
                    <span className="font-semibold text-white">{accuracyData?.accuracy_period_days ?? 'N/A'} days</span>
                  </div>
                </div>
              </div>
            )}

            {/* Scenario Predictions for Extended Mode */}
            {extendedData && extendedData.extended_predictions && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold mb-4 text-white">Scenario Outcomes (30 days)</h3>
                <div className="space-y-4">
                  {extendedData.extended_predictions.optimistic_scenario && extendedData.extended_predictions.optimistic_scenario.length > 0 && (
                    <div className="p-3 bg-green-500/20 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-green-300 font-medium">Optimistic</span>
                        <span className="text-green-300 font-bold">
                          ${extendedData.extended_predictions.optimistic_scenario[extendedData.extended_predictions.optimistic_scenario.length - 1]?.predicted_price?.toFixed(2) || 'N/A'}
                        </span>
                      </div>
                      <div className="text-green-300/70 text-sm">
                        {extendedData.extended_predictions.optimistic_scenario[extendedData.extended_predictions.optimistic_scenario.length - 1]?.predicted_price 
                          ? `+${((extendedData.extended_predictions.optimistic_scenario[extendedData.extended_predictions.optimistic_scenario.length - 1].predicted_price - extendedData.current_price) / extendedData.current_price * 100).toFixed(1)}%`
                          : 'N/A'}
                      </div>
                    </div>
                  )}
                  {extendedData.extended_predictions.base_scenario && extendedData.extended_predictions.base_scenario.length > 0 && (
                    <div className="p-3 bg-blue-500/20 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-blue-300 font-medium">Base Case</span>
                        <span className="text-blue-300 font-bold">
                          ${extendedData.extended_predictions.base_scenario[extendedData.extended_predictions.base_scenario.length - 1]?.predicted_price?.toFixed(2) || 'N/A'}
                        </span>
                      </div>
                      <div className="text-blue-300/70 text-sm">
                        {extendedData.extended_predictions.base_scenario[extendedData.extended_predictions.base_scenario.length - 1]?.predicted_price 
                          ? `${((extendedData.extended_predictions.base_scenario[extendedData.extended_predictions.base_scenario.length - 1].predicted_price - extendedData.current_price) / extendedData.current_price * 100) >= 0 ? '+' : ''}${((extendedData.extended_predictions.base_scenario[extendedData.extended_predictions.base_scenario.length - 1].predicted_price - extendedData.current_price) / extendedData.current_price * 100).toFixed(1)}%`
                          : 'N/A'}
                      </div>
                    </div>
                  )}
                  {extendedData.extended_predictions.pessimistic_scenario && extendedData.extended_predictions.pessimistic_scenario.length > 0 && (
                    <div className="p-3 bg-red-500/20 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-red-300 font-medium">Pessimistic</span>
                        <span className="text-red-300 font-bold">
                          ${extendedData.extended_predictions.pessimistic_scenario[extendedData.extended_predictions.pessimistic_scenario.length - 1]?.predicted_price?.toFixed(2) || 'N/A'}
                        </span>
                      </div>
                      <div className="text-red-300/70 text-sm">
                        {extendedData.extended_predictions.pessimistic_scenario[extendedData.extended_predictions.pessimistic_scenario.length - 1]?.predicted_price 
                          ? `${((extendedData.extended_predictions.pessimistic_scenario[extendedData.extended_predictions.pessimistic_scenario.length - 1].predicted_price - extendedData.current_price) / extendedData.current_price * 100).toFixed(1)}%`
                          : 'N/A'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Prediction List */}
            {predictionData && predictionData.predictions.length > 0 && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold mb-4 text-white">Daily Predictions</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {predictionData.predictions.map((pred, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <div className="text-sm">
                        <div className="text-white/90 font-medium">{new Date(pred.date).toLocaleDateString()}</div>
                        <div className="text-white/60 text-xs">
                          Day +{pred.days_ahead}
                          {pred.confidence_level && (
                            <span className="ml-2 text-purple-300">
                              {(pred.confidence_level * 100).toFixed(0)}% confidence
                            </span>
                          )}
                        </div>
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
            <strong>Disclaimer:</strong> These predictions are generated by machine learning models and should not be considered as financial advice. 
            Stock markets are inherently unpredictable and past performance does not guarantee future results. Extended predictions have decreasing confidence levels over time.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PredictionPage;
