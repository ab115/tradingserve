# Level 7: The Brain (Agentic AI)

> **Job Track**: 🤖 Agentic AI Engineer

## Objective
**Build an AI Analyst that trades on News.**
You will write a client script that uses an LLM (Large Language Model) to analyze text input (news headlines) and send trading signals to the Exchange.

## 🎯 Skills Learned
- `Large Language Models (LLM)`
- `Prompt Engineering`
- `Sentiment Analysis`
- `AI Agents`

## The Mission
Markets move on news. Speed matters, but understanding "Context" matters more. Build a script that asks ChatGPT / Gemini: "Is this headline bullish or bearish for Tech Stocks?"

## Lab Instructions

### Step 1: Define the Prompt
(Function using `openai` or `google.generativeai` SDK)

```python
def analyze_sentiment(headline):
    prompt = f"Analyze sentiment for stock market: '{headline}'. Reply ONLY 'BUY' or 'SELL'."
    # Call LLM API...
    return response.text.strip()
```

### Step 2: The Loop
Make a list of mock headlines.
```python
news = [
    "Tech giant reports record profits!",
    "Central Bank raises interest rates unexpectedly.",
    "CEO steps down amid scandal."
]

for headline in news:
    signal = analyze_sentiment(headline)
    print(f"News: {headline} -> Signal: {signal}")
    
    if signal == "BUY":
        # Call Function from Level 4 to place Order
        place_order("AAPL", "BUY", 100)
    elif signal == "SELL":
        place_order("AAPL", "SELL", 100)
```

## Outcome
You combined **Generative AI** with **Transactional Finance**. This is the bleeding edge of FinTech.
