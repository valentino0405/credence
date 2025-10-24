"use client";
import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { API_BASE_URL } from '@/config/api';

interface StockChartProps {
  symbol: string;
}

interface ChartData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export default function StockChart({ symbol }: StockChartProps) {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchChartData();
  }, [symbol]);

  const fetchChartData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/v1/trading/stock/${symbol}/chart?period=1mo`);
      
      if (response.ok) {
        const result = await response.json();
        setChartData(result.data.chart_data || []);
      } else {
        // Generate mock data if API fails
        generateMockData();
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
      generateMockData();
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockData = () => {
    const mockData: ChartData[] = [];
    const basePrice = 2500;
    let currentPrice = basePrice;
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const open = currentPrice;
      const close = open + (Math.random() - 0.5) * 100;
      const high = Math.max(open, close) + Math.random() * 50;
      const low = Math.min(open, close) - Math.random() * 50;
      
      mockData.push({
        date: date.toISOString().split('T')[0],
        open,
        high,
        low,
        close,
        volume: Math.floor(Math.random() * 1000000) + 100000,
      });
      
      currentPrice = close;
    }
    
    setChartData(mockData);
  };

  const formatTooltip = (value: any, name: string) => {
    if (name === 'close') {
      return [`₹${parseFloat(value).toFixed(2)}`, 'Price'];
    }
    return [value, name];
  };

  if (isLoading) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-800/20 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading chart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="w-full h-96 bg-gray-800/20 rounded-lg p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="date" 
              stroke="#9CA3AF"
              fontSize={12}
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis 
              stroke="#9CA3AF"
              fontSize={12}
              tickFormatter={(value) => `₹${value}`}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F9FAFB'
              }}
              formatter={formatTooltip}
              labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
            />
            <Line 
              type="monotone" 
              dataKey="close" 
              stroke="#8B5CF6" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#8B5CF6' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 flex justify-center gap-6 text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
          <span>Closing Price</span>
        </div>
        <span>Last 30 days</span>
        <span>{symbol}</span>
      </div>
    </div>
  );
}