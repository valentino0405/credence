import { create } from 'zustand'

interface NewsArticle {
  title: string
  description: string
  content: string
  url: string
  source: string
  published_at: string
  url_to_image: string | null
  sentiment_analysis: {
    overall_sentiment: 'positive' | 'negative' | 'neutral'
    confidence_score: number
    market_impact: 'bullish' | 'bearish' | 'neutral'
    key_entities: string[]
    impact_score: number
    reasoning: string
    indian_context: string
  }
  created_at: string
}

interface RedditPost {
  reddit_id: string
  title: string
  subreddit: string
  score: number
  upvote_ratio: number
  num_comments: number
  permalink: string
  sentiment_analysis: {
    overall_sentiment: 'bullish' | 'bearish' | 'neutral'
    confidence_score: number
    market_impact: 'positive' | 'negative' | 'neutral'
    mentioned_stocks: string[]
    key_themes: string[]
    sentiment_score: number
    community_mood: string
    indian_market_relevance: 'high' | 'medium' | 'low'
  }
}

interface MarketSentiment {
  overall_sentiment: 'bullish' | 'bearish' | 'neutral'
  sentiment_score: number
  confidence: 'high' | 'medium' | 'low'
  news_analysis: {
    total_articles: number
    overall_sentiment: string
    sentiment_breakdown: {
      positive: number
      negative: number
      neutral: number
    }
    articles: NewsArticle[]
    last_updated: string
  }
  reddit_analysis: {
    total_posts: number
    overall_sentiment: string
    sentiment_breakdown: {
      bullish: number
      bearish: number
      neutral: number
    }
    top_mentioned_stocks: Array<{
      stock: string
      mentions: number
    }>
    posts_sample: RedditPost[]
    last_updated: string
  }
  total_data_points: number
  last_updated: string
  market_region: string
}

interface NewsStore {
  // State
  marketSentiment: MarketSentiment | null
  latestNews: NewsArticle[]
  redditSentiment: any
  isLoading: boolean
  error: string | null
  lastUpdated: string | null

  // Actions
  fetchMarketSentiment: () => Promise<void>
  fetchLatestNews: (limit?: number) => Promise<void>
  fetchRedditSentiment: () => Promise<void>
  refreshNews: () => Promise<void>
  refreshReddit: () => Promise<void>
  clearError: () => void
}

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-backend-url.com' 
  : 'http://localhost:8000'

export const useNewsStore = create<NewsStore>((set, get) => ({
  // Initial state
  marketSentiment: null,
  latestNews: [],
  redditSentiment: null,
  isLoading: false,
  error: null,
  lastUpdated: null,

  // Actions
  fetchMarketSentiment: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/news/indian-market-sentiment`)
      if (!response.ok) throw new Error('Failed to fetch market sentiment')
      
      const result = await response.json()
      set({ 
        marketSentiment: result.data,
        lastUpdated: new Date().toISOString(),
        isLoading: false 
      })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false 
      })
    }
  },

  fetchLatestNews: async (limit = 20) => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/news/latest-news?limit=${limit}`)
      if (!response.ok) throw new Error('Failed to fetch latest news')
      
      const result = await response.json()
      set({ 
        latestNews: result.data.articles,
        lastUpdated: new Date().toISOString(),
        isLoading: false 
      })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false 
      })
    }
  },

  fetchRedditSentiment: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/news/reddit-sentiment`)
      if (!response.ok) throw new Error('Failed to fetch Reddit sentiment')
      
      const result = await response.json()
      set({ 
        redditSentiment: result.data,
        lastUpdated: new Date().toISOString(),
        isLoading: false 
      })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false 
      })
    }
  },

  refreshNews: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/news/refresh-news`, {
        method: 'POST'
      })
      if (!response.ok) throw new Error('Failed to refresh news')
      
      // Optionally refetch data after refresh
      setTimeout(() => {
        get().fetchLatestNews()
        get().fetchMarketSentiment()
      }, 5000) // Wait 5 seconds for background task
      
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to refresh news'
      })
    }
  },

  refreshReddit: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/news/refresh-reddit`, {
        method: 'POST'
      })
      if (!response.ok) throw new Error('Failed to refresh Reddit data')
      
      // Optionally refetch data after refresh
      setTimeout(() => {
        get().fetchRedditSentiment()
        get().fetchMarketSentiment()
      }, 5000) // Wait 5 seconds for background task
      
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to refresh Reddit data'
      })
    }
  },

  clearError: () => set({ error: null })
}))

export type { NewsArticle, RedditPost, MarketSentiment }