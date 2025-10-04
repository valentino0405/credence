import React from 'react'
import { MarketSentiment } from '@/app/stores/newsStore'
import { 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon, 
  MinusIcon,
  ChartBarIcon,
  NewspaperIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { formatDistanceToNow } from 'date-fns'

interface SentimentOverviewProps {
  sentiment: MarketSentiment
  onRefreshNews: () => void
  onRefreshReddit: () => void
  isLoading?: boolean
}

export default function SentimentOverview({ 
  sentiment, 
  onRefreshNews, 
  onRefreshReddit, 
  isLoading = false 
}: SentimentOverviewProps) {
  
  const getSentimentIcon = (sentimentValue: string) => {
    switch (sentimentValue) {
      case 'bullish':
        return <ArrowTrendingUpIcon className="w-8 h-8 text-green-400" />
      case 'bearish':
        return <ArrowTrendingDownIcon className="w-8 h-8 text-red-400" />
      default:
        return <MinusIcon className="w-8 h-8 text-yellow-400" />
    }
  }

  const getSentimentColor = (sentimentValue: string) => {
    switch (sentimentValue) {
      case 'bullish':
        return 'from-green-500/20 to-emerald-500/20 border-green-500/30'
      case 'bearish':
        return 'from-red-500/20 to-rose-500/20 border-red-500/30'
      default:
        return 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30'
    }
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'text-green-400 bg-green-500/10 border-green-500/20'
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
      default:
        return 'text-red-400 bg-red-500/10 border-red-500/20'
    }
  }

  return (
    <div className="space-y-6">
      {/* Main Sentiment Card */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br backdrop-blur-sm border p-8 ${getSentimentColor(sentiment.overall_sentiment)}`}>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              {getSentimentIcon(sentiment.overall_sentiment)}
              <div>
                <h2 className="text-3xl font-bold text-white capitalize">
                  {sentiment.overall_sentiment}
                </h2>
                <p className="text-white/60 text-sm">
                  Indian Market Sentiment
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-4xl font-bold text-white mb-1">
                {Math.round(sentiment.sentiment_score * 100)}%
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getConfidenceColor(sentiment.confidence)}`}>
                {sentiment.confidence.toUpperCase()} CONFIDENCE
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Data Points */}
            <div className="bg-white/10 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <ChartBarIcon className="w-5 h-5 text-white/60" />
                <span className="text-white/60 text-sm font-medium">Data Points</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {sentiment.total_data_points}
              </div>
              <div className="text-white/60 text-xs">
                News + Social Media
              </div>
            </div>

            {/* Last Updated */}
            <div className="bg-white/10 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <ClockIcon className="w-5 h-5 text-white/60" />
                <span className="text-white/60 text-sm font-medium">Updated</span>
              </div>
              <div className="text-lg font-semibold text-white">
                {formatDistanceToNow(new Date(sentiment.last_updated), { addSuffix: true })}
              </div>
              <div className="text-white/60 text-xs">
                Real-time Analysis
              </div>
            </div>

            {/* Market Region */}
            <div className="bg-white/10 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-white/60 text-sm font-medium">🇮🇳 Region</span>
              </div>
              <div className="text-lg font-semibold text-white capitalize">
                {sentiment.market_region}
              </div>
              <div className="text-white/60 text-xs">
                NSE/BSE Focus
              </div>
            </div>
          </div>
        </div>

        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
          <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-white/5 blur-2xl" />
        </div>
      </div>

      {/* News vs Reddit Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* News Analysis */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <NewspaperIcon className="w-6 h-6 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">News Analysis</h3>
            </div>
            <button
              onClick={onRefreshNews}
              disabled={isLoading}
              className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-md border border-blue-500/30 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-white/60">Total Articles</span>
              <span className="text-white font-semibold">
                {sentiment.news_analysis.total_articles}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-green-400">Positive</span>
                <span className="text-white">{sentiment.news_analysis.sentiment_breakdown.positive}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-red-400">Negative</span>
                <span className="text-white">{sentiment.news_analysis.sentiment_breakdown.negative}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-yellow-400">Neutral</span>
                <span className="text-white">{sentiment.news_analysis.sentiment_breakdown.neutral}</span>
              </div>
            </div>

            {/* Visual Bar */}
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="flex h-full">
                <div 
                  className="bg-green-500"
                  style={{ 
                    width: `${(sentiment.news_analysis.sentiment_breakdown.positive / sentiment.news_analysis.total_articles) * 100}%` 
                  }}
                />
                <div 
                  className="bg-red-500"
                  style={{ 
                    width: `${(sentiment.news_analysis.sentiment_breakdown.negative / sentiment.news_analysis.total_articles) * 100}%` 
                  }}
                />
                <div 
                  className="bg-yellow-500"
                  style={{ 
                    width: `${(sentiment.news_analysis.sentiment_breakdown.neutral / sentiment.news_analysis.total_articles) * 100}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Reddit Analysis */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <ChatBubbleLeftRightIcon className="w-6 h-6 text-orange-400" />
              <h3 className="text-lg font-semibold text-white">Reddit Sentiment</h3>
            </div>
            <button
              onClick={onRefreshReddit}
              disabled={isLoading}
              className="px-3 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-md border border-orange-500/30 hover:bg-orange-500/30 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-white/60">Total Posts</span>
              <span className="text-white font-semibold">
                {sentiment.reddit_analysis.total_posts}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-green-400">Bullish</span>
                <span className="text-white">{sentiment.reddit_analysis.sentiment_breakdown.bullish}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-red-400">Bearish</span>
                <span className="text-white">{sentiment.reddit_analysis.sentiment_breakdown.bearish}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-yellow-400">Neutral</span>
                <span className="text-white">{sentiment.reddit_analysis.sentiment_breakdown.neutral}</span>
              </div>
            </div>

            {/* Visual Bar */}
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="flex h-full">
                <div 
                  className="bg-green-500"
                  style={{ 
                    width: `${(sentiment.reddit_analysis.sentiment_breakdown.bullish / sentiment.reddit_analysis.total_posts) * 100}%` 
                  }}
                />
                <div 
                  className="bg-red-500"
                  style={{ 
                    width: `${(sentiment.reddit_analysis.sentiment_breakdown.bearish / sentiment.reddit_analysis.total_posts) * 100}%` 
                  }}
                />
                <div 
                  className="bg-yellow-500"
                  style={{ 
                    width: `${(sentiment.reddit_analysis.sentiment_breakdown.neutral / sentiment.reddit_analysis.total_posts) * 100}%` 
                  }}
                />
              </div>
            </div>

            {/* Top Mentioned Stocks */}
            {sentiment.reddit_analysis.top_mentioned_stocks.length > 0 && (
              <div className="mt-4">
                <div className="text-sm text-white/60 mb-2">Top Mentioned:</div>
                <div className="flex flex-wrap gap-1">
                  {sentiment.reddit_analysis.top_mentioned_stocks.slice(0, 4).map((item, index) => (
                    <span 
                      key={index}
                      className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-md border border-orange-500/30"
                    >
                      {item.stock} ({item.mentions})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}