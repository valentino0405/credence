"use client";
import React from 'react';

const PredictionPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="container mx-auto">
        <h1 className="text-4xl font-bold mb-8">AI Predictions</h1>
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <p className="text-gray-300">AI-powered market predictions will be displayed here.</p>
        </div>
      </div>
    </div>
  );
};

export default PredictionPage;
