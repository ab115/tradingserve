import os
import time
import random

# Lab 9: The Analyst (Gen AI / RAG)
# Objective: Conversational Finance (RAG).

SCENARIOS = {
    "default": [
        ("What are the primary risks?", "Based on the 10-K, primary risks include **supply chain disruptions** in APAC and **FX volatility** due to the strong dollar."),
        ("How was the Q4 revenue?", "Q4 Revenue was **$90B**, up 5% YoY driven by strong services growth, offsetting a 2% decline in hardware sales."),
    ],
    "fed_minutes": [
        ("Analyze the sentiment of the latest FOMC minutes.", "The sentiment is **Hawkish**. The committee emphasized that 'inflation remains elevated' and further hikes may be necessary."),
        ("What is the impact on Bond Yields?", "Given the hawkish stance, 10-year Treasury yields are projected to **rise to 4.5%**, causing a sell-off in long-duration assets."),
        ("Summarize the outlook for 2024.", "The Fed projects a **'Soft Landing'** scenario, with GDP growth slowing to 1.5% and unemployment ticking up to 4.1%."),
    ],
    "tech_earnings": [
        ("Compare NVDA vs AMD AI revenue.", "**NVDA** reported Data Center revenue of $14B (up 200% YoY). **AMD** is catching up with the MI300 launch but trails with $2B projected AI revenue."),
        ("What are the margin trends?", "Gross margins for NVDA expanded to **75%** due to pricing power. AMD margins are stable at 50% but under pressure from R&D costs."),
        ("Is there an AI bubble?", "Analyst consensus is mixed. While valuations are high (NVDA 40x P/E), the *demand signal* from hyperscalers (Microsoft, Meta) remains robust."),
    ],
    "crypto_reg": [
        ("What is the status of the Bitcoin ETF?", "The SEC has **approved** 11 spot Bitcoin ETFs. BlackRock's IBIT has already attracted $2B in inflows."),
        ("How does this impact Coinbase?", "Coinbase serves as the custodian for 8 of the 11 ETFs, creating a new, stable revenue stream despite lower trading volumes."),
    ]
}

class MockRetrievalQA:
    def run(self, query, scenario_key="default"):
        # Simulate RAG latency
        time.sleep(1.5) 
        
        # Check against scenarios
        scenario_data = SCENARIOS.get(scenario_key, SCENARIOS["default"])
        
        # Simple fuzzy match
        for q, a in scenario_data:
            if query.lower() in q.lower() or q.lower() in query.lower():
                return a
        
        return "I processed the documents but couldn't find a high-confidence answer for that specific question."

def run_rag():
    scenario = os.environ.get("RAG_SCENARIO", "default")
    print(f"📚 Indexing Knowledge Base for **{scenario.upper().replace('_', ' ')}**...")
    time.sleep(1)
    print("✅ Vector Database Ready.")
    time.sleep(0.5)
    
    tasks = SCENARIOS.get(scenario, SCENARIOS["default"])
    
    for q, a in tasks:
        # Simulate User typing
        time.sleep(1)
        print(f"❓ Query: {q}")
        
        # Simulate "Thinking" logs
        print("   > 🔍 Retrieving context chunks...")
        time.sleep(0.5)
        print("   > 🧠 Synthesizing answer with GPT-4...")
        
        # Get Answer
        response = MockRetrievalQA().run(q, scenario)
        print(f"🤖 Answer: {response}")
        print("")

if __name__ == "__main__":
    try:
        run_rag()
        # Keep process alive briefly so frontend catches the last log
        time.sleep(2)
    except KeyboardInterrupt:
        pass
