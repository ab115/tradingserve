import random

# Lab 8: The Brain (Agentic AI)
# Objective: Build an AI Analyst that trades on News.

def analyze_sentiment(headline):
    # Mock LLM Call
    # In reality: openai.ChatCompletion.create(...)
    print(f"🤖 AI Reading: '{headline}'")
    
    # Deterministic mock for demo
    if "profit" in headline.lower() or "surges" in headline.lower():
        return "BUY"
    if "misses" in headline.lower() or "crash" in headline.lower():
        return "SELL"
    return "HOLD"

def run_analyst():
    news = [
        "Tech giant reports record profits!",
        "Central Bank raises interest rates unexpectedly.",
        "Market crashes after data leak.",
        "New AI model surges in popularity."
    ]
    
    for headline in news:
        signal = analyze_sentiment(headline)
        print(f"📰 News: {headline}")
        print(f"💡 AI Signal: {signal}")
        print("-" * 20)

if __name__ == "__main__":
    run_analyst()
