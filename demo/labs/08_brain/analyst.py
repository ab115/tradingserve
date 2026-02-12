import random
import time
import sys

# Lab 8: The Brain (Agentic AI)
# Objective: Build an AI Analyst that trades on News.

SECTORS = {
    "Technology": ["AAPL", "MSFT", "NVDA", "GOOGL"],
    "Finance": ["JPM", "BAC", "GS", "MS"],
    "Energy": ["XOM", "CVX", "COP", "SLB"],
    "Healthcare": ["JNJ", "PFE", "MRK", "LLY"],
    "Consumer": ["AMZN", "TSLA", "WMT", "KO"]
}

SENTIMENTS = ["BUY", "SELL", "HOLD"]

TEMPLATES = {
    "BUY": [
        "{symbol} reports record breaking Q3 earnings, beating estimates.",
        "{symbol} unveils revolutionary AI product, stock surges.",
        "Analyst upgrades {symbol} to Overweight, cites strong growth.",
        "{symbol} expands into new markets, revenue projections raised.",
        "Major hedge fund accumulates position in {symbol}."
    ],
    "SELL": [
        "{symbol} misses revenue targets, CEO expresses caution.",
        "Regulatory probe launched against {symbol} for antitrust concerns.",
        "{symbol} product recall causes share price to plummet.",
        "Analyst downgrades {symbol} citing headwinds in {sector}.",
        "Insider selling detected at {symbol}, investors wary."
    ],
    "HOLD": [
        "{symbol} releases stable quarterly guidance, market neutral.",
        "{symbol} announces strategic review, timeline unclear.",
        "Merger talks involving {symbol} stall, shares flat.",
        "{symbol} declares dividend in line with previous quarters.",
        "Mixed analyst reactions for {symbol} ahead of investor day."
    ]
}

def analyze_sentiment(headline):
    # Mock LLM Call
    # In reality: openai.ChatCompletion.create(...)
    print(f"🤖 AI Reading: '{headline}'")
    time.sleep(0.5) # Simulate processing time
    
    if "earning" in headline.lower() and "beating" in headline.lower(): return "BUY"
    if "surges" in headline.lower(): return "BUY"
    if "upgrades" in headline.lower(): return "BUY"
    if "accumulates" in headline.lower(): return "BUY"
    if "raised" in headline.lower(): return "BUY"

    if "misses" in headline.lower(): return "SELL"
    if "probe" in headline.lower(): return "SELL"
    if "recall" in headline.lower(): return "SELL"
    if "downgrades" in headline.lower(): return "SELL"
    if "selling" in headline.lower(): return "SELL"

    return "HOLD"

def run_analyst():
    print("AI Analyst Agent Started...", flush=True)
    
    while True:
        try:
            # 1. Randomize Context
            sector_name = random.choice(list(SECTORS.keys()))
            symbol = random.choice(SECTORS[sector_name])
            
            # 2. Pick Sentiment
            # Weighted random to make market more interesting (more activity)
            true_sentiment = random.choices(SENTIMENTS, weights=[40, 40, 20])[0]
            
            # 3. Generate Headline
            template = random.choice(TEMPLATES[true_sentiment])
            headline = f"[{symbol}] " + template.format(symbol=symbol, sector=sector_name)
            
            # 4. Analyze (Process)
            print(f"📰 News: {headline}", flush=True)
            
            # Simulate "Reading" and decision lag
            time.sleep(1) 
            
            signal = analyze_sentiment(headline)
            
            # Verify our logic matches (the mock analyze function should agree with our intent)
            # In a real agent, this is where the LLM might hallucinate or disagree
            
            print(f"💡 AI Signal: {signal}", flush=True)
            print("-" * 40, flush=True)
            
            # 5. Wait for next cycle
            time.sleep(random.uniform(3, 6))
            
        except KeyboardInterrupt:
            print("Analyst stopping...")
            break
        except Exception as e:
            print(f"Error in analyst loop: {e}", file=sys.stderr)
            time.sleep(1)

if __name__ == "__main__":
    run_analyst()
