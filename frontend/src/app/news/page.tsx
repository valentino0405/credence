"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import Aurora from '@/app/home/Aurora';
import { useNewsStore } from '@/app/stores/newsStore';
import SentimentOverview from '@/app/components/SentimentOverview';
import NewsCard from '@/app/components/NewsCard';
import { 
  NewspaperIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import toast, { Toaster } from 'react-hot-toast';

export default function NewsAndSentimentPage(): React.ReactElement {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'news' | 'reddit'>('overview');
  
  const {
    marketSentiment,
    latestNews,
    redditSentiment,
    isLoading,
    error,
    lastUpdated,
    fetchMarketSentiment,
    fetchLatestNews,
    fetchRedditSentiment,
    refreshNews,
    refreshReddit,
    clearError
  } = useNewsStore();

  // Handle authentication redirect
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  // Initial data fetch
  useEffect(() => {
    if (isSignedIn) {
      fetchMarketSentiment();
      fetchLatestNews(30);
      fetchRedditSentiment();
    }
  }, [isSignedIn]);

  // Handle errors with toast
  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  // Show loading while auth is loading
  if (!isLoaded) {
    return (
      <div className="w-full h-screen relative bg-black flex justify-center items-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Show loading while redirecting if not authenticated
  if (!isSignedIn) {
    return (
      <div className="w-full h-screen relative bg-black flex justify-center items-center">
        <div className="text-white text-xl">Redirecting...</div>
      </div>
    );
  }

  const handleRefreshAll = async () => {
    toast.promise(
      Promise.all([
        refreshNews(),
        refreshReddit(),
        fetchMarketSentiment()
      ]),
      {
        loading: 'Refreshing all data...',
        success: 'Data refreshed successfully!',
        error: 'Failed to refresh data'
      }
    );
  };

  const handleRefreshNews = async () => {
    toast.promise(
      refreshNews(),
      {
        loading: 'Refreshing news data...',
        success: 'News data refreshed!',
        error: 'Failed to refresh news'
      }
    );
  };

  const handleRefreshReddit = async () => {
    toast.promise(
      refreshReddit(),
      {
        loading: 'Refreshing Reddit data...',
        success: 'Reddit data refreshed!',
        error: 'Failed to refresh Reddit data'
      }
    );
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Aurora Background */}
      <div className="fixed inset-0 z-0">
        <Aurora
          colorStops={["#1a365d", "#2d3748", "#4a5568"]}
          blend={0.3}
          amplitude={0.8}
          speed={0.3}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen">
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30">
                <NewspaperIcon className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  News & Sentiment Analysis
                </h1>
                <p className="text-white/60 text-lg">
                  AI-powered Indian market sentiment from news and social media
                </p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {lastUpdated && (
                  <div className="text-sm text-white/60">
                    Last updated: {new Date(lastUpdated).toLocaleString()}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-sm text-green-400">Live Data</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefreshAll}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-blue-400 rounded-lg hover:from-blue-500/30 hover:to-purple-500/30 transition-all duration-200 disabled:opacity-50"
                >
                  <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span className="text-sm font-medium">Refresh All</span>
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mb-8">
            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
              {[
                { key: 'overview', label: 'Overview', icon: ChartBarIcon },
                { key: 'news', label: 'Latest News', icon: NewspaperIcon },
                { key: 'reddit', label: 'Social Sentiment', icon: SparklesIcon }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === key
                      ? 'bg-white/20 text-white border border-white/20'
                      : 'text-white/60 hover:text-white/80 hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Loading State */}
          {isLoading && !marketSentiment && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <ArrowPathIcon className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
                <p className="text-white/60">Loading Indian market sentiment...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mb-8">
              <div className="flex items-center gap-3">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
                <div>
                  <h3 className="text-red-400 font-semibold">Error Loading Data</h3>
                  <p className="text-red-300/80 text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Content Tabs */}
          {marketSentiment && activeTab === 'overview' && (
            <SentimentOverview
              sentiment={marketSentiment}
              onRefreshNews={handleRefreshNews}
              onRefreshReddit={handleRefreshReddit}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'news' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Latest Indian Financial News</h2>
                <div className="text-sm text-white/60">
                  {latestNews.length} articles
                </div>
              </div>

              {latestNews.length === 0 && !isLoading ? (
                <div className="text-center py-20">
                  <NewspaperIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
                  <p className="text-white/60">No news articles available</p>
                  <button
                    onClick={() => fetchLatestNews(30)}
                    className="mt-4 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
                  >
                    Load News
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {latestNews.map((article, index) => (
                    <NewsCard
                      key={`${article.url}-${index}`}
                      article={article}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'reddit' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Reddit Social Sentiment</h2>
                {redditSentiment && (
                  <div className="text-sm text-white/60">
                    {redditSentiment.total_posts} posts analyzed
                  </div>
                )}
              </div>

              {redditSentiment ? (
                <div className="space-y-6">
                  {/* Reddit Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Overall Sentiment</h3>
                      <div className="text-3xl font-bold text-white capitalize mb-2">
                        {redditSentiment.overall_sentiment}
                      </div>
                      <div className="text-white/60 text-sm">
                        From {redditSentiment.total_posts} discussions
                      </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Top Stocks</h3>
                      <div className="space-y-2">
                        {redditSentiment.top_mentioned_stocks.slice(0, 3).map((stock: any, index: number) => (
                          <div key={index} className="flex justify-between">
                            <span className="text-white/80">{stock.stock}</span>
                            <span className="text-white/60">{stock.mentions}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Sentiment Breakdown</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-green-400">Bullish</span>
                          <span className="text-white">{redditSentiment.sentiment_breakdown.bullish}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-400">Bearish</span>
                          <span className="text-white">{redditSentiment.sentiment_breakdown.bearish}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-yellow-400">Neutral</span>
                          <span className="text-white">{redditSentiment.sentiment_breakdown.neutral}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sample Posts */}
                  {redditSentiment.posts_sample && redditSentiment.posts_sample.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4">Recent Discussions</h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {redditSentiment.posts_sample.slice(0, 6).map((post: any, index: number) => (
                          <div 
                            key={`${post.reddit_id}-${index}`}
                            className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-4"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-orange-400 text-sm">r/{post.subreddit}</span>
                              <span className="text-white/40">•</span>
                              <span className="text-white/60 text-sm">{post.score} upvotes</span>
                            </div>
                            <h4 className="text-white font-medium mb-2 line-clamp-2">
                              {post.title}
                            </h4>
                            {post.sentiment_analysis && (
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-md text-xs ${
                                  post.sentiment_analysis.overall_sentiment === 'bullish' 
                                    ? 'bg-green-500/20 text-green-400'
                                    : post.sentiment_analysis.overall_sentiment === 'bearish'
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                  {post.sentiment_analysis.overall_sentiment}
                                </span>
                                <span className="text-white/60 text-xs">
                                  {Math.round(post.sentiment_analysis.confidence_score * 100)}% confidence
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-20">
                  <SparklesIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
                  <p className="text-white/60">No Reddit sentiment data available</p>
                  <button
                    onClick={fetchRedditSentiment}
                    className="mt-4 px-4 py-2 bg-orange-500/20 text-orange-400 rounded-lg border border-orange-500/30 hover:bg-orange-500/30 transition-colors"
                  >
                    Load Reddit Data
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)'
          }
        }}
      />
    </div>
  );
}