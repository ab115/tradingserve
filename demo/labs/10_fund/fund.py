# Lab 10: The Fund Manager (Agentic AI)
# Objective: Autonomous Trading with MCP.

import time

def agent_workflow():
    print("🚀 Starting Hedge Fund Pod...")
    
    # Step 1: Analyst
    print("\n🕵️ [Analyst Agent] Reading Market News...")
    time.sleep(1)
    sentiment = "BULLISH"
    print(f"   -> Sentiment Analysis: {sentiment}")
    
    # Step 2: Risk
    print("\n🛡️ [Risk Agent] Checking Volatility...")
    time.sleep(1)
    risk_level = "LOW"
    print(f"   -> Risk Assessment: {risk_level}")
    
    # Step 3: Portfolio Manager
    print("\n💼 [Portfolio Agent] Making Decision...")
    if sentiment == "BULLISH" and risk_level == "LOW":
        decision = "BUY AAPL"
    else:
        decision = "HOLD"
        
    print(f"   -> FINAL DECISION: {decision}")
    
    if decision.startswith("BUY"):
        print("   ✅ Executing Trade on Exchange...")

if __name__ == "__main__":
    agent_workflow()
