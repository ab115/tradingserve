# Level 10: The Fund Manager (Agentic AI)

> **Job Track**: 🕵️ Agentic AI Engineer

## Objective
**Autonomous Trading with MCP.**
RAG is passive (it answers questions). Agents are active (they take actions). You will build a **LangGraph** workflow that connects your Analyst (from Level 9) to a Trader Agent using the **Model Context Protocol (MCP)** standard for tools.

## 🎯 Skills Learned
- `LangGraph / LangChain Agents`
- `Model Context Protocol (MCP)`
- `Tool Calling`
- `Multi-Agent Orchestration`

## The Mission
Build an autonomous pod:
1.  **Analyst Agent**: Reads news/reports (RAG).
2.  **Risk Agent**: Checks market volatility.
3.  **Portfolio Agent**: Decides "BUY" or "HOLD" based on the other two.

## Lab Instructions

### Step 1: Define Tools (MCP Style)
Create `tools.py`. We wrap our previous functions as "Tools".

```python
from langchain.tools import tool

@tool
def get_analyst_opinion(ticker: str) -> str:
    """Consults the RAG model for a sentiment on the ticker."""
    # Call your Level 9 logic here
    return "Bullish based on recent growth."

@tool
def get_risk_level() -> str:
    """Checks current market volatility."""
    return "LOW" if random.randint(0,100) < 50 else "HIGH"

@tool
def execute_trade(ticker: str, action: str) -> str:
    """Executes a trade on the server."""
    return f"Executed {action} on {ticker}"
```

### Step 2: Build the Graph
Create `fund_manager.py` using `langgraph`.

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict

class AgentState(TypedDict):
    messages: list
    decision: str

def analyst_node(state):
    # Simulating LLM calling the analyst tool
    print("🕵️ Analyst: Market looks good.")
    return {"messages": ["Analyst says bullish"]}

def risk_node(state):
    print("🛡️ Risk: Volatility is dropping.")
    return {"messages": ["Risk is Low"]}

def trader_node(state):
    # Logic: If Bullish AND Low Risk -> Buy
    print("💰 Trader: Conditions met. BUYING.")
    return {"decision": "BUY"}

workflow = StateGraph(AgentState)
workflow.add_node("analyst", analyst_node)
workflow.add_node("risk", risk_node)
workflow.add_node("trader", trader_node)

workflow.set_entry_point("analyst")
workflow.add_edge("analyst", "risk")
workflow.add_edge("risk", "trader")
workflow.add_edge("trader", END)

app = workflow.compile()
```

### Step 3: Run the Hedge Fund
```python
result = app.invoke({"messages": []})
print(f"Final Decision: {result['decision']}")
```

## Outcome
You moved beyond simple chatbots to **Agentic Workflows**, where AI models collaborate to solve complex, multi-step problems autonomously.
