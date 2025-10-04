import React from 'react'
import { NewsArticle } from '@/app/stores/newsStore'
import { formatDistanceToNow } from 'date-fns'
import { 
  ChartBarIcon, 
  NewspaperIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon
} from '@heroicons/react/24/outline'

interface NewsCardProps {
  article: NewsArticle
  className?: string
}

export default function NewsCard({ article, className = '' }: NewsCardProps) {
  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <ArrowTrendingUpIcon className="w-5 h-5 text-green-400" />
      case 'negative':
        return <ArrowTrendingDownIcon className="w-5 h-5 text-red-400" />
      default:
        return <MinusIcon className="w-5 h-5 text-yellow-400" />
    }
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'border-green-500/30 bg-green-500/5'
      case 'negative':
        return 'border-red-500/30 bg-red-500/5'
      default:
        return 'border-yellow-500/30 bg-yellow-500/5'
    }
  }

  const getMarketImpactColor = (impact: string) => {
    switch (impact) {
      case 'bullish':
        return 'text-green-400 bg-green-500/10 border-green-500/20'
      case 'bearish':
        return 'text-red-400 bg-red-500/10 border-red-500/20'
      default:
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
    }
  }

  return (
    <div className={`group relative overflow-hidden rounded-xl border backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-black/20 hover:scale-[1.02] ${getSentimentColor(article.sentiment_analysis.overall_sentiment)} ${className}`}>
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <NewspaperIcon className="w-4 h-4" />
            <span>{article.source}</span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}</span>
          </div>
          {getSentimentIcon(article.sentiment_analysis.overall_sentiment)}
        </div>

        <h3 className="text-lg font-semibold text-white mb-3 line-clamp-2 group-hover:text-white/90 transition-colors">
          {article.title}
        </h3>

        <p className="text-white/70 text-sm line-clamp-3 mb-4">
          {article.description}
        </p>
      </div>

      {/* Sentiment Analysis */}
      <div className="px-6 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ChartBarIcon className="w-4 h-4 text-white/60" />
            <span className="text-xs text-white/60 uppercase tracking-wide font-medium">
              Analysis
            </span>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getMarketImpactColor(article.sentiment_analysis.market_impact)}`}>
            {article.sentiment_analysis.market_impact.toUpperCase()}
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">Confidence</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${article.sentiment_analysis.confidence_score * 100}%` }}
                />
              </div>
              <span className="text-white/80 text-xs">
                {Math.round(article.sentiment_analysis.confidence_score * 100)}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">Impact Score</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${article.sentiment_analysis.impact_score * 100}%` }}
                />
              </div>
              <span className="text-white/80 text-xs">
                {Math.round(article.sentiment_analysis.impact_score * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Key Entities */}
        {article.sentiment_analysis.key_entities.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-white/60 uppercase tracking-wide font-medium mb-2">
              Key Entities
            </div>
            <div className="flex flex-wrap gap-1">
              {article.sentiment_analysis.key_entities.slice(0, 4).map((entity, index) => (
                <span 
                  key={index}
                  className="px-2 py-1 bg-white/10 text-white/80 text-xs rounded-md border border-white/10"
                >
                  {entity}
                </span>
              ))}
              {article.sentiment_analysis.key_entities.length > 4 && (
                <span className="px-2 py-1 text-white/60 text-xs">
                  +{article.sentiment_analysis.key_entities.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* AI Reasoning */}
        <div className="mb-4">
          <div className="text-xs text-white/60 uppercase tracking-wide font-medium mb-2">
            AI Analysis
          </div>
          <p className="text-xs text-white/70 italic">
            "{article.sentiment_analysis.reasoning}"
          </p>
        </div>

        {/* Indian Context */}
        {article.sentiment_analysis.indian_context && (
          <div className="mb-4">
            <div className="text-xs text-white/60 uppercase tracking-wide font-medium mb-2">
              Indian Market Context
            </div>
            <p className="text-xs text-white/70 bg-white/5 p-2 rounded-md border border-white/10">
              {article.sentiment_analysis.indian_context}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 pb-6">
        <a 
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          <span>Read Full Article</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {/* Article Image */}
      {article.url_to_image && (
        <div className="absolute top-0 right-0 w-24 h-24 overflow-hidden rounded-bl-xl opacity-20 group-hover:opacity-30 transition-opacity">
          <img 
            src={article.url_to_image}
            alt={article.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        </div>
      )}
    </div>
  )
}