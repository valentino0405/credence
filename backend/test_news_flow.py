"""
Test the complete RSS news flow with sentiment analysis
"""
import asyncio
import requests
import json

async def test_complete_flow():
    print("Testing complete RSS news flow...")
    
    # Step 1: Fetch RSS news with sentiment analysis
    print("\n1. Fetching RSS news...")
    try:
        response = requests.post("http://localhost:8000/api/v1/news/fetch-rss-news", timeout=30)
        if response.status_code == 200:
            result = response.json()
            print(f"RSS Fetch: {result.get('message', 'Success')}")
            print(f"Articles found: {result.get('data', {}).get('articles_found', 0)}")
            print(f"Articles saved: {result.get('data', {}).get('articles_saved', 0)}")
        else:
            print(f"RSS Fetch failed: {response.status_code}")
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"RSS Fetch error: {e}")
    
    # Step 2: Get latest news to see if sentiment is working
    print("\n2. Getting latest news...")
    try:
        response = requests.get("http://localhost:8000/api/v1/news/latest-news?limit=5", timeout=10)
        if response.status_code == 200:
            result = response.json()
            articles = result.get('data', {}).get('articles', [])
            print(f"Latest News: Found {len(articles)} articles")
            
            for i, article in enumerate(articles[:3], 1):
                print(f"\nArticle {i}:")
                print(f"   Title: {article.get('title', 'No title')[:80]}...")
                print(f"   Source: {article.get('source', 'Unknown')}")
                
                sentiment = article.get('sentiment_analysis', {})
                if sentiment:
                    print(f"   Sentiment: {sentiment.get('overall_sentiment', 'Unknown')}")
                    print(f"   Market Impact: {sentiment.get('market_impact', 'Unknown')}")
                    print(f"   Confidence: {sentiment.get('confidence_score', 0):.2f}")
                else:
                    print(f"   No sentiment analysis found!")
                    
        else:
            print(f"Latest News failed: {response.status_code}")
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Latest News error: {e}")

if __name__ == "__main__":
    asyncio.run(test_complete_flow())