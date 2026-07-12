import os
import time
import json
import requests
import feedparser
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from logzero import logger

# Add custom financial words to VADER lexicon
finance_words = {
    'upgrade': 2.0,
    'downgrade': -2.0,
    'bullish': 2.0,
    'bearish': -2.0,
    'beat': 1.5,
    'missed': -1.5,
    'surged': 1.5,
    'plunged': -1.5,
    'slumped': -1.5,
    'soared': 1.5,
    'dividend': 1.0,
    'buyback': 1.5,
    'profit': 1.0,
    'loss': -1.0,
    'growth': 1.0,
    'decline': -1.0
}

analyzer = SentimentIntensityAnalyzer()
analyzer.lexicon.update(finance_words)

# Common words to ignore when matching company names
IGNORE_WORDS = {'The', 'India', 'Bank', 'Technologies', 'Systems', 'Global', 'Limited', 'Ltd', 'Corp', 'Corporation', 'Company', 'And', 'Of', 'Industry', 'Industries'}

def load_universe():
    universe_path = os.path.join(os.path.dirname(__file__), 'stock_universe.json')
    if os.path.exists(universe_path):
        with open(universe_path, 'r') as f:
            return json.load(f)
    return []

def get_company_keywords(stock):
    name = stock.get('name', '')
    symbol = stock.get('symbol', '').replace('-EQ', '')
    
    # Split name and take the first highly identifying word (e.g., "Reliance Industries" -> "Reliance")
    words = [w for w in name.split() if w not in IGNORE_WORDS and len(w) > 3]
    first_word = words[0] if words else symbol
    
    return [symbol, first_word]

def scrape_and_analyze():
    feeds = [
        'https://www.moneycontrol.com/rss/MCtopnews.xml',
        'https://www.moneycontrol.com/rss/latestnews.xml',
        'https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms'
    ]
    
    logger.info("Scraping news feeds...")
    headlines = []
    for url in feeds:
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries:
                headlines.append(entry.title + ". " + getattr(entry, 'description', ''))
        except Exception as e:
            logger.error(f"Failed to parse {url}: {e}")
            
    if not headlines:
        logger.warning("No headlines found.")
        return
        
    logger.info(f"Found {len(headlines)} headlines.")
    
    universe = load_universe()
    sentiment_map = {}
    
    for headline in headlines:
        score = analyzer.polarity_scores(headline)['compound']
        
        # Determine which stocks are mentioned in this headline
        # This is a naive substring match. In production, Named Entity Recognition (NER) is better.
        for stock in universe:
            symbol = stock['symbol']
            keywords = get_company_keywords(stock)
            
            for keyword in keywords:
                if keyword.lower() in headline.lower():
                    if symbol not in sentiment_map:
                        sentiment_map[symbol] = {
                            "symbol": symbol,
                            "score": 0.0,
                            "bullish_mentions": 0,
                            "bearish_mentions": 0,
                            "count": 0
                        }
                    
                    sentiment_map[symbol]["score"] += score
                    sentiment_map[symbol]["count"] += 1
                    
                    if score > 0.05:
                        sentiment_map[symbol]["bullish_mentions"] += 1
                    elif score < -0.05:
                        sentiment_map[symbol]["bearish_mentions"] += 1
                        
                    break # Found a match for this stock in this headline, move to next stock
                    
    # Average the scores
    final_sentiments = []
    for symbol, data in sentiment_map.items():
        avg_score = data["score"] / data["count"]
        final_sentiments.append({
            "symbol": symbol,
            "score": avg_score,
            "bullish_mentions": data["bullish_mentions"],
            "bearish_mentions": data["bearish_mentions"]
        })
        
    logger.info(f"Analyzed sentiments for {len(final_sentiments)} stocks.")
    
    # Send to Node.js backend
    if final_sentiments:
        try:
            res = requests.post(
                'http://localhost:3002/internal/sentiments',
                json={
                    "secret": "super_secret_python_worker",
                    "sentiments": final_sentiments
                },
                timeout=10
            )
            logger.info(f"Backend response: {res.text}")
        except Exception as e:
            logger.error(f"Failed to send sentiments to backend: {e}")

if __name__ == "__main__":
    logger.info("Starting sentiment worker...")
    while True:
        scrape_and_analyze()
        logger.info("Sleeping for 15 minutes...")
        time.sleep(15 * 60)
