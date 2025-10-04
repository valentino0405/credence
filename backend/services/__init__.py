"""
Services initialization
"""
from .news_service import indian_news_service
from .reddit_service import indian_reddit_service

__all__ = [
    'indian_news_service',
    'indian_reddit_service'
]