"""
Mock data generator for testing the News & Sentiment system
"""
from datetime import datetime, timedelta
import json
import random

def generate_mock_indian_news():
    """Generate mock Indian financial news articles"""
    indian_companies = ["Reliance", "TCS", "Infosys", "HDFC", "ICICI", "Adani", "Tata", "Wipro", "ITC", "HUL"]
    market_terms = ["NIFTY", "SENSEX", "BSE", "NSE", "RBI", "rupee", "Indian market"]
    
    news_templates = [
        "{company} reports strong Q2 results, shares surge {percent}%",
        "RBI policy meeting: Interest rates {action}, impact on {sector} sector",
        "NIFTY {direction} {percent}% as {company} leads {trend}",  
        "Indian rupee {rupee_action} against dollar amid {reason}",
        "Foreign investors {fii_action} Indian markets, {impact} on indices",
        "{company} announces major acquisition worth ₹{amount} crores",
        "Monsoon impact: {sector} sector sees {impact} in rural demand",
        "Budget 2025: Government announces {policy} for {sector} sector"
    ]
    
    articles = []
    
    for i in range(30):  # Generate 30 mock articles
        company = random.choice(indian_companies)
        market_term = random.choice(market_terms)
        percent = round(random.uniform(1, 8), 1)
        
        # Choose template and fill variables
        template = random.choice(news_templates)
        
        title = template.format(
            company=company,
            percent=percent,
            action=random.choice(["maintained", "raised", "cut"]),
            sector=random.choice(["banking", "IT", "pharma", "auto", "FMCG"]),
            direction=random.choice(["gains", "falls", "closes"]),
            trend=random.choice(["gainers", "recovery", "selloff"]),
            rupee_action=random.choice(["strengthens", "weakens", "stable"]),
            reason=random.choice(["global cues", "FII flows", "crude oil prices"]),
            fii_action=random.choice(["buy", "sell", "remain bullish on"]),
            impact=random.choice(["positive", "negative", "mixed"]),
            amount=random.randint(500, 5000),
            policy=random.choice(["tax relief", "subsidies", "reforms"])
        )
        
        # Generate sentiment
        sentiment_options = ["positive", "negative", "neutral"]
        sentiment = random.choice(sentiment_options)
        
        article = {
            "title": title,
            "description": f"Detailed analysis of {title.lower()} and its impact on Indian markets.",
            "content": f"Market experts believe this development will have significant implications for the Indian stock market. {company} has been a key player in driving market sentiment.",
            "url": f"https://example-news.com/article-{i+1}",
            "source": random.choice(["Economic Times", "Business Standard", "Mint", "MoneyControl"]),
            "published_at": (datetime.now() - timedelta(hours=random.randint(1, 48))).isoformat(),
            "url_to_image": None,
            "sentiment_analysis": {
                "overall_sentiment": sentiment,
                "confidence_score": round(random.uniform(0.6, 0.95), 2),
                "market_impact": "bullish" if sentiment == "positive" else "bearish" if sentiment == "negative" else "neutral",
                "key_entities": [company, market_term],
                "impact_score": round(random.uniform(0.5, 0.9), 2),
                "reasoning": f"The news about {company} is expected to {'positively' if sentiment == 'positive' else 'negatively' if sentiment == 'negative' else 'neutrally'} impact market sentiment",
                "indian_context": f"This development is particularly relevant for Indian markets as {company} is a major constituent of key indices"
            },
            "created_at": datetime.utcnow(),
            "market_region": "india",
            "processed": True
        }
        
        articles.append(article)
    
    return articles

def generate_mock_reddit_posts():
    """Generate mock Reddit posts about Indian stocks"""
    posts = [
        {
            "reddit_id": f"mock_{i}",
            "title": f"What do you think about {random.choice(['RELIANCE', 'TCS', 'INFY', 'HDFC'])} at current levels?",
            "subreddit": random.choice(["IndiaInvestments", "IndianStreetBets"]),
            "score": random.randint(10, 200),
            "upvote_ratio": round(random.uniform(0.7, 0.95), 2),
            "num_comments": random.randint(5, 50),
            "permalink": f"/r/IndiaInvestments/comments/mock_{i}/",
            "sentiment_analysis": {
                "overall_sentiment": random.choice(["bullish", "bearish", "neutral"]),
                "confidence_score": round(random.uniform(0.6, 0.9), 2),
                "market_impact": random.choice(["positive", "negative", "neutral"]),
                "mentioned_stocks": [random.choice(['RELIANCE', 'TCS', 'INFY', 'HDFC'])],
                "key_themes": ["earnings", "valuation", "market outlook"],
                "sentiment_score": round(random.uniform(-1, 1), 2),
                "community_mood": random.choice(["optimistic", "cautious", "bearish"]),
                "indian_market_relevance": "high"
            },
            "created_at": datetime.utcnow(),
            "market_region": "india"
        }
        for i in range(15)
    ]
    
    return posts

if __name__ == "__main__":
    # Generate and save mock data
    news_data = generate_mock_indian_news()
    reddit_data = generate_mock_reddit_posts()
    
    print(f"Generated {len(news_data)} mock news articles")
    print(f"Generated {len(reddit_data)} mock Reddit posts")
    
    # Save to files for inspection
    with open("mock_news.json", "w") as f:
        json.dump(news_data, f, indent=2)
    
    with open("mock_reddit.json", "w") as f:
        json.dump(reddit_data, f, indent=2)
    
    print("Mock data saved to mock_news.json and mock_reddit.json")