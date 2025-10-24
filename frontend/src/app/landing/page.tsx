"use client";
import React from "react";
import Link from "next/link";
import Aurora from "@/app/home/Aurora";
import RotatingText from "@/app/components/RotatingText";
import { useAuth } from '@clerk/nextjs';

export default function LandingPage(): React.ReactElement {
  const { isSignedIn, isLoaded } = useAuth();

  // Show loading while auth is loading
  if (!isLoaded) {
    return (
      <div className='w-full h-screen relative bg-black flex justify-center items-center'>
        <div className="text-white text-xl">Loading...</div>
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
      <div className='absolute flex flex-col justify-center items-center w-full px-4'>
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6" style={{ transform: `translateY(-30px)` }}>
          {/* Glass card container */}
          <div className="backdrop-blur-md bg-white/10 rounded-3xl border border-white/20 shadow-2xl p-6 sm:p-8 lg:p-12 max-w-4xl mx-auto text-center w-full">
            {/* Header */}
            <div className="mb-6 sm:mb-8">
              <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold mb-4 flex flex-wrap justify-center gap-2 sm:gap-3">
                <span className="bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">AI</span>
                <RotatingText
                  texts={["Finance", "Trading", "Marketing"]}
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
              <p className="text-base sm:text-lg lg:text-xl text-gray-200 font-medium">
                Next-Generation Algorithmic Trading Platform
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-10">
              <div className="backdrop-blur-sm bg-white/5 rounded-2xl p-4 sm:p-6 border border-white/10">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Real-Time Data</h3>
                <p className="text-gray-300 text-xs sm:text-sm">Live market data powered by Yahoo Finance API</p>
              </div>

              <div className="backdrop-blur-sm bg-white/5 rounded-2xl p-4 sm:p-6 border border-white/10">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-white mb-2">AI Predictions</h3>
                <p className="text-gray-300 text-xs sm:text-sm">Advanced machine learning algorithms for market insights</p>
              </div>

              <div className="backdrop-blur-sm bg-white/5 rounded-2xl p-4 sm:p-6 border border-white/10">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Interactive Charts</h3>
                <p className="text-gray-300 text-xs sm:text-sm">Professional candlestick charts with technical indicators</p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isSignedIn ? (
                <>
                  <Link href="/home" className="cursor-target">
                    <button className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105">
                      Go to Dashboard
                    </button>
                  </Link>
                  <Link href="/stocks/AAPL" className="cursor-target">
                    <button className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 backdrop-blur-sm bg-white/10 text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105">
                      View Stocks
                    </button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/sign-up" className="cursor-target">
                    <button className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105">
                      Get Started Free
                    </button>
                  </Link>
                  <Link href="/sign-in" className="cursor-target">
                    <button className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 backdrop-blur-sm bg-white/10 text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105">
                      Sign In
                    </button>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Footer text */}
          <div className="mt-6 sm:mt-8 text-center">
            <p className="text-gray-300 text-xs sm:text-sm">
              Powered by FastAPI & Next.js • Real-time market data
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
