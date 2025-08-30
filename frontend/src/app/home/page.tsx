"use client";
import React, { useEffect } from "react";
import Link from "next/link";
import Aurora from "@/app/home/Aurora";
import RotatingText from "@/app/components/RotatingText";
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

// Adjust this value to move the hero content vertically.
// Negative = move up, Positive = move down.
const HERO_VERTICAL_OFFSET_PX = -30; // tweak this later as you like

const HomePage: React.FC = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  // Handle redirect in useEffect to avoid render-time state updates
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
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
  
  return (
    <div className='w-full h-screen relative bg-black flex justify-center items-center'>
      <div style={{ width: "100%", height: "900px", position: "relative" }}>
        <Aurora
          colorStops={["#7CFF67", "#B19EEF", "#5227FF"]}
          blend={0.5}
          speed={1}
        />
      </div>
      {/* Main content */}
      <div className='absolute flex flex-col justify-center items-center'>
        <div
          className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6"
          style={{ transform: `translateY(${HERO_VERTICAL_OFFSET_PX}px)` }}
        >
          {/* Glass card container */}
          <div className="backdrop-blur-md bg-white/10 rounded-3xl border border-white/20 shadow-2xl p-12 max-w-4xl mx-auto text-center">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-6xl font-bold mb-4 flex flex-wrap justify-center gap-3">
                <span className="bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">AI</span>
                <RotatingText
                  texts={["Finance", "Trading", "Marketing"]}
                  // Blue pill box for rotating word
                  mainClassName="px-4 py-1 rounded-md bg-[#0818A8] text-white shadow-lg shadow-black/30"
                  staggerFrom="last"
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "-120%", opacity: 0 }}
                  staggerDuration={0.025}
                  splitLevelClassName="overflow-hidden pb-1"
                  elementLevelClassName="drop-shadow-sm"
                  transition={{ type: "spring", damping: 30, stiffness: 400 }}
                  rotationInterval={2500}
                />
              </h1>
              <p className="text-xl text-gray-200 font-medium">
                Next-Generation Algorithmic Trading Platform
              </p>
            </div>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-6 mb-10">
              <div className="backdrop-blur-sm bg-white/5 rounded-2xl p-6 border border-white/10">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Real-Time Data</h3>
                <p className="text-gray-300 text-sm">Live market data powered by Yahoo Finance API</p>
              </div>

              <div className="backdrop-blur-sm bg-white/5 rounded-2xl p-6 border border-white/10">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">AI Predictions</h3>
                <p className="text-gray-300 text-sm">Advanced machine learning algorithms for market insights</p>
              </div>

              <div className="backdrop-blur-sm bg-white/5 rounded-2xl p-6 border border-white/10">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Interactive Charts</h3>
                <p className="text-gray-300 text-sm">Professional candlestick charts with technical indicators</p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard">
                <button className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105">
                  Explore Dashboard
                </button>
              </Link>
              <Link href="/stocks/AAPL">
                <button className="px-8 py-4 backdrop-blur-sm bg-white/10 text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105">
                  View Stocks
                </button>
              </Link>
            </div>
          </div>

          {/* Footer text */}
          <div className="mt-8 text-center">
            <p className="text-gray-300 text-sm">
              Powered by FastAPI & Next.js • Real-time market data
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
