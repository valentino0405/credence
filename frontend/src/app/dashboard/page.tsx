"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Aurora from '@/app/home/Aurora';
import { useAuth } from '@clerk/nextjs';

// Adjust this value to move the hero content vertically.
// Negative = move up, Positive = move down.
const HERO_VERTICAL_OFFSET_PX = -30; // match home page offset

export default function Dashboard(): React.ReactElement {
  const [ticker, setTicker] = useState<string>('');
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  // Handle redirect in useEffect to avoid render-time state updates
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

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
    <div className='w-full h-screen relative bg-black flex justify-center items-center'>
      {/* Aurora hero */}
      <div style={{ width: "100%", height: "900px", position: "relative" }}>
        <Aurora
          colorStops={["#7CFF67", "#B19EEF", "#5227FF"]}
          blend={0.5}
          amplitude={1.0}
          speed={0.5}
        />
      </div>

      {/* Main content centered over the Aurora */}
      <div className='absolute flex flex-col justify-center items-center w-full'>
        <div
          className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6"
          style={{ transform: `translateY(${HERO_VERTICAL_OFFSET_PX}px)` }}
        >
          <div className="backdrop-blur-md bg-white/5 rounded-3xl border border-white/20 shadow-2xl p-12 max-w-4xl mx-auto text-center">
            <header>
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4">
                <span className="bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">🚀 AI Trading Dashboard</span>
              </h1>
              <p className="text-lg md:text-xl text-white/70 font-medium">Real-time stock analysis with AI-powered predictions</p>
            </header>

            <section className="mt-6">
              <h2 className="text-2xl font-semibold mb-4 text-white/90">Enter Stock Ticker</h2>
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 justify-center">
                <input
                  type="text"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  placeholder="Enter ticker (e.g., AAPL)"
                  className="px-6 py-3 text-lg rounded-lg bg-white/10 border border-white/20 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/40 focus:outline-none w-full sm:w-64 placeholder-white/40 text-white"
                />
                <button
                  type="submit"
                  className="cursor-target px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-lg font-semibold rounded-lg hover:from-purple-500 hover:to-blue-500 transition-colors shadow-lg shadow-black/30"
                >
                  Analyze Stock
                </button>
              </form>
            </section>

            <section className="mt-8">
              <h3 className="text-xl font-semibold mb-4 text-white/90">Popular Stocks</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {popularStocks.map((stock) => (
                  <button
                    key={stock}
                    onClick={() => router.push(`/stocks/${stock}`)}
                    className="cursor-target p-4 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all duration-200 font-semibold text-white/90 hover:text-white shadow-sm"
                  >
                    {stock}
                  </button>
                ))}
              </div>
            </section>

            <footer className="mt-6">
              <p className="text-xs md:text-sm font-medium text-white/50 tracking-wide">Powered by Yahoo Finance • Real-time data • AI Predictions</p>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
