import { Share2, Box, Activity, Disc, Zap, Monitor, Shield, Brain, Sparkles, Building2, Cloud, Layout } from 'lucide-react';

export interface LabContent {
    id: string;
    title: string;
    role: string;
    icon: any;
    skills: string[];
    md: string;
    videoUrl?: string; // Optional YouTube ID
}

export const labContent: LabContent[] = [
    {
        id: '01',
        title: "The Build Pipeline",
        role: "DevOps Engineer",
        icon: Share2,
        skills: ["GitHub Actions", "YAML", "CI/CD"],
        md: `# Level 1: The Build Pipeline (CI/CD)

> **Job Track**: 🛠️ DevOps Engineer

## Objective
**Master the path from code commit to production deployment.**
In this lab, you will learn the fundamentals of Version Control and CI/CD pipelines. You will create a simple trading bot and automate its testing using GitHub Actions.

## 🎯 Skills Learned
- \`Git Fundamentals\`
- \`GitHub Collaboration\`
- \`GitHub Actions\`
- \`Python Testing\`

## Practicals Checklist
1. Why Git Exists
2. GitHub Collaboration
3. Branching & Merging
4. CI Basics
5. Test Automation
6. Continuous Delivery

## Lab Instructions

### Step 1: Initialize Git (Practical 1)
Open your terminal. We will create a project and track it.
\`\`\`bash
mkdir algo-bot
cd algo-bot
git init
\`\`\`

### Step 2: Write "The Bot" (Practical 5)
Create a file named \`bot.py\` and paste this code:
\`\`\`python
import sys

def strategy(price):
    if price < 100:
        return "BUY"
    return "HOLD"

if __name__ == "__main__":
    # Test the function locally
    signal = strategy(99)
    print(f"Signal: {signal}")
\`\`\`

### Step 3: Track Changes
\`\`\`bash
git add bot.py
git commit -m "Created trading bot logic"
\`\`\`

### Step 4: Define CI Pipeline (Practical 4)
We want to test this automatically.
1. Create a folder named \`.github\`.
2. Inside it, create a folder named \`workflows\`.
3. Create a file \`.github/workflows/ci.yml\` with this content:

\`\`\`yaml
name: Bot CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'
    - name: Run Logic Test
      run: |
        # This runs your bot.py logic in the cloud
        python -c "from bot import strategy; assert strategy(99) == 'BUY'"
\`\`\`

### Step 5: Push to GitHub (Practical 2)
1. Go to GitHub.com and create a new repository named \`algo-bot\`.
2. Run these commands (replace YOUR_USER):
\`\`\`bash
git remote add origin https://github.com/YOUR_USER/algo-bot.git
git branch -M main
git push -u origin main
\`\`\`

### Step 6: Verify Automation
1. Go to your GitHub Repo page.
2. Click the **Actions** tab.
3. You should see a workflow run named "Bot CI" with a ✅ Green Checkmark.

## Outcome
You now have a professional CI pipeline. Every time you change your code, GitHub will automatically verify it works.`
    },
    {
        id: '02',
        title: "The Container",
        role: "DevOps Engineer",
        icon: Box,
        skills: ["Dockerfile", "Docker Compose", "Containers"],
        md: `# Level 2: The Container (Docker)

> **Job Track**: 📦 DevOps / Platform Engineer

## Objective
**Containerize your Bot.**
In Level 1, you ran code on your laptop. But "It works on my machine" is not good enough for Finance.
You must package your bot into a **Docker Container** - a standardized unit that runs the same way everywhere (Laptop, Server, Cloud).

## 🎯 Skills Learned
- \`Dockerfile Structure\`
- \`Docker Build & Run\`
- \`Environment Variables\`
- \`Docker Compose\`

## Lab Instructions

### Step 1: Create a Dockerfile
1. Open your code editor (VS Code) to your \`algo-bot\` folder.
2. Create a NEW file named \`Dockerfile\` (no file extension!).
3. Paste the following exact content:

\`\`\`dockerfile
# 1. Use a lightweight Python image as base
FROM python:3.9-slim

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Copy your specific bot code files into the container
COPY bot.py .

# 4. Define the command to run when the container starts
CMD ["python", "bot.py"]
\`\`\`

### Step 2: Build the Image
Open your terminal (Command Prompt or Terminal) and run:

\`\`\`bash
# 'docker build' tells Docker to create an image
# '-t my-algo-bot' names the image
# '.' tells it to look in the CURRENT folder
docker build -t my-algo-bot .
\`\`\`

*Wait for the process to finish. It implies it is downloading the python base image.*

### Step 3: Run Your Container
Now that you have the image, run it as a container:

\`\`\`bash
docker run --rm my-algo-bot
\`\`\`
*You should see your bot's output (e.g., "Signal: BUY") printed to the screen.*

### Step 4: Using Docker Compose
Running long commands is annoying. Let's automate it using \`docker-compose.yml\`.
1. Create a file named \`docker-compose.yml\`.
2. Paste this:

\`\`\`yaml
version: '3.8'
services:
  bot:
    build: .             # Build from current directory
    environment:         # Inject secrets / config
      - SIGNAL_THRESHOLD=100
    command: python -c "import time; print('Bot Started'); time.sleep(3600)"
\`\`\`

3. Run it in background mode:
\`\`\`bash
docker compose up -d
\`\`\`

4. Check if it's running:
\`\`\`bash
docker compose ps
\`\`\`

## Outcome
You have "Containerized" your application. You can now ship this code to any server in the world, and it is guaranteed to run exactly as it did here.`
    },
    {
        id: '03',
        title: "The Cockpit",
        role: "SRE Engineer",
        icon: Activity,
        skills: ["PromQL", "Grafana", "Observability"],
        md: `# Level 3: The Cockpit (Observability)

> **Job Track**: 🚨 Site Reliability Engineer (SRE)

## Objective
**Investigate Market Anomalies using Grafana.**
You are an SRE (Site Reliability Engineer). The server provides internal health metrics. Your job is to access the **Grafana Dashboard** to visualize these metrics and identify why the exchange is slowing down.

## 🎯 Skills Learned
- \`Accessing Grafana\`
- \`Building Dashboards\`
- \`PromQL Queries\`
- \`Correlating Metrics\`

## Lab Instructions

### Step 1: Access Grafana
Grafana is a web-based dashboard tool running on your server.
1. Open your web browser (Chrome/Edge).
2. Type the following URL: \`http://localhost:3000\` (or http://<SERVER_IP>:3000).
3. You will see a login screen.
   - **Username**: \`admin\`
   - **Password**: \`admin\` (Skip password change if prompted).

### Step 2: Create a New Dashboard
1. On the left sidebar, verify you see an icon with 4 squares "Dashboards".
2. Click **New** -> **New Dashboard**.
3. Click **+ Add Visualization**.

### Step 3: Query the Data (Prometheus)
1. In the "Data source" dropdown, ensure **Prometheus** is selected.
2. In the query box, enter this PromQL query to see the Order Rate:
   \`rate(exchange_orders_total[1m])\`
3. Click **Run Queries** (blue button). You should see a line chart appear.
4. On the right panel, find "Panel options" -> "Title" and name it **"Global Order Rate"**.
5. Click **Apply** (top right corner).

### Step 4: Detect Latency Spikes
1. Add another panel (Click the + icon in top navbar -> Add visualization).
2. Enter query:
   \`histogram_quantile(0.99, rate(exchange_latency_bucket[1m]))\`
3. Name this panel **"99th Percentile Latency"**.
4. **Compare**: Look at both charts. Do you see the latency Go UP when the Order Rate goes UP?

## Outcome
You have successfully monitored a production system without looking at a single line of code.`
    },
    {
        id: '04',
        title: "The Tape Reader",
        role: "Data Engineer",
        icon: Disc,
        skills: ["Redis", "Pub/Sub", "Data Streams"],
        md: `# Level 4: The Tape Reader (Redis)

> **Job Track**: 💾 Data Engineer

## Objective
**Tap into the raw data feed using Redis.**
Web UIs are slow. Pro traders connect directly to the data pipe. The exchange publishes every trade to **Redis** (a super-fast in-memory database). You will use the Redis CLI to inspect this raw feed.

## 🎯 Skills Learned
- \`Redis CLI Standards\`
- \`Identifying Pub/Sub Channels\`
- \`Subscribing to Real-Time Data\`

## Lab Instructions

### Step 1: Open Terminal
You need a command line interface that has \`redis-cli\` installed.
*If using our Docker setup, you can exec into the redis container:*
\`docker exec -it tradingserver-redis-1 redis-cli\`

### Step 2: Ping the Server
1. In the terminal, verify connection:
   \`ping\`
   *Response should be: PONG*

### Step 3: Subscribe to Market Data
1. Type the following command to listen to the feed:
   \`SUBSCRIBE market_data\`
   
2. Press Enter.
3. Wait... if the market is active, you will see JSON text scrolling rapidly:
   \`1) "message"\`
   \`2) "market_data"\`
   \`3) "{\"symbol\": \"AAPL\", \"price\": 150.23, ...}"\`

### Challenge: Filter with Script
Manual reading is hard. Let's write a python script.
1. Create \`tape_reader.py\`:

\`\`\`python
import redis
import json

# Connect to Redis (localhost, port 6379, db 0)
r = redis.Redis(host='localhost', port=6379, db=0)

# Create a Pub/Sub object
p = r.pubsub()
p.subscribe('market_data')

print("Listening for AAPL trades > $150...")

for message in p.listen():
    if message['type'] == 'message':
        data = json.loads(message['data'])
        if data['symbol'] == 'AAPL' and data['price'] > 150:
            print(f"💰 BIG TRADE: {data['symbol']} @ {data['price']}")
\`\`\`

## Outcome
You bypassed the slow UI and connected directly to the high-speed backend data bus.`
    },
    {
        id: '05',
        title: "The Algo Trader",
        role: "Quant Developer",
        icon: Zap,
        skills: ["REST API", "WebSocket", "AsyncIO"],
        md: `# Level 5: The Algo Trader (REST & WebSocket)

> **Job Track**: ⚡ Quantitative Developer

## Objective
**Build an automated Trading Client.**
Humans are too slow. You will write a Python script that automatically decides when to buy or sell based on price data. This is "Algorithmic Trading".

## 🎯 Skills Learned
- \`Fetching Data (REST GET)\`
- \`Streaming Data (WebSocket)\`
- \`Placing Orders (REST POST)\`
- \`Async Python\`

## Lab Instructions

### Step 1: Get the Current Price (Snapshot)
REST APIs are like loading a web page. You ask for data, you get data.
1. Create \`trader.py\`.
2. Add code to get the Order Book for AAPL:

\`\`\`python
import requests

# 1. Define the URL
url = "http://localhost:8000/marketdata/api/book/AAPL"

# 2. Make the request
response = requests.get(url)

# 3. Print the result
print("Current Order Book:")
print(response.json())
\`\`\`

### Step 2: Listen for Live Updates (WebSocket)
WebSockets are like a phone call. The connection stays open.
Add this logic (needs \`pip install websockets asyncio\`):

\`\`\`python
import websockets
import asyncio

async def listen():
    # Connect to the live stream
    async with websockets.connect("ws://localhost:8000/marketdata/ws/level1") as ws:
        print("Connected to Feed...")
        while True:
            # Wait for next message
            msg = await ws.recv()
            print(f"Live Update: {msg}")

asyncio.run(listen())
\`\`\`

### Step 3: Place a Trade (The Algo)
Combine logic: "If price drops, BUY".
Endpoint: \`POST /ecn/api/orders\`

\`\`\`python
def execute_trade():
    order = {
        "symbol": "AAPL",
        "side": "BUY",
        "qty": 10,
        "price": 149.50
    }
    res = requests.post("http://localhost:8000/ecn/api/orders", json=order)
    print(f"Order Status: {res.status_code}")
\`\`\`

## Outcome
You have built a robot that interacts with the financial exchange automatically.`
    },
    {
        id: '06',
        title: "The Glass",
        role: "Frontend Architect",
        icon: Monitor,
        skills: ["React", "Vite", "Real-time"],
        md: `# Level 6: The Glass (React UI)

> **Job Track**: 🎨 Frontend Architect

## Objective
**Build a custom Trading Dashboard.**
You don't like the official Exchange UI? Build your own.
You will create a simplified React application running on your laptop that connects to the Server's WebSocket feed to display a live "Order Blotter".

## 🎯 Skills Learned
- \`React.js\` / \`Vite\`
- \`WebSocket Integration\`
- \`Real-time UI Updates\`
- \`SPA Architecture\`

## The Mission
Your Head Trader needs a filtered view of specific symbols. The main portal is too cluttered. Build a lightweight "Blotter App" using React.

## Lab Instructions

### Step 1: Scaffold the App
(Requires Node.js)
\`\`\`bash
npm create vite@latest my-blotter -- --template react
cd my-blotter
npm install
npm run dev
\`\`\`

### Step 2: Connect to WebSocket
In \`App.jsx\`:

\`\`\`javascript
import { useEffect, useState } from 'react';

function App() {
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    const ws = new WebSocket('ws://<SERVER_IP>/marketdata/ws/level1');
    
    ws.onmessage = (event) => {
      const trade = JSON.parse(event.data);
      setTrades(prev => [trade, ...prev].slice(0, 10)); // Keep last 10
    };

    return () => ws.close();
  }, []);

  return (
    <table>
      <thead><tr><th>Symbol</th><th>Price</th></tr></thead>
      <tbody>
        {trades.map((t, i) => (
          <tr key={i}><td>{t.symbol}</td><td>{t.price}</td></tr>
        ))}
      </tbody>
    </table>
  );
}
\`\`\`

### Challenge
Add color coding: Green row if \`price\` > last price, Red if lower.

## Outcome
You built a "Single Page Application" (SPA) that consumes live financial data from a remote server.`
    },
    {
        id: '07',
        title: "The Audit Log",
        role: "Compliance Eng",
        icon: Shield,
        skills: ["Redpanda", "Kafka", "Streaming"],
        md: `# Level 7: The Audit Log (Redpanda Streaming)

> **Job Track**: 🛡️ Compliance Engineer

## Objective
**Establish a "Drop Copy" Compliance Feed.**
For every trade executed on the exchange, a copy is dropped onto a **Redpanda** Topic (Kafka-compatible). You will build a Python Compliance Tool that listens to this topic to archive trades.

## 🎯 Skills Learned
- \`Apache Kafka Protocol\`
- \`Redpanda Streaming\`
- \`Event Driven Architecture\`
- \`Data Archiving\`

## The Mission
The Regulator requires a separate, read-only record of all trades. You cannot trust the REST API logs; you need the raw event stream.

## Lab Instructions

### Step 1: Install Python Client
\`\`\`bash
pip install confluent-kafka
\`\`\`

### Step 2: Connect to Redpanda
The Server exposes Redpanda on Port \`19092\`.

\`\`\`python
from confluent_kafka import Consumer

conf = {
    'bootstrap.servers': '<SERVER_IP>:19092',
    'group.id': 'compliance_archiver',
    'auto.offset.reset': 'earliest'
}

consumer = Consumer(conf)
consumer.subscribe(['execution_reports'])
\`\`\`

### Step 3: Archive the Data
Write a loop that writes every message to a local file \`trade_archive.log\`.

\`\`\`python
with open('trade_archive.log', 'w') as f:
    while True:
        msg = consumer.poll(1.0)
        if msg is None: continue
        
        trade_data = msg.value().decode('utf-8')
        print(f"Archiving: {trade_data}")
        f.write(trade_data + "\\n")
\`\`\`

### Challenge
Run the "Market Crash" simulation on the Server. Does your archiver keep up with the burst of traffic?

## Outcome
You learned how to consume high-throughput event streams for backend processing.`
    },
    {
        id: '08',
        title: "The Brain",
        role: "AI Engineer",
        icon: Brain,
        skills: ["LLM", "Prompt Engineering", "Agents"],
        md: `# Level 8: The Brain (Agentic AI)

> **Job Track**: 🤖 Agentic AI Engineer

## Objective
**Build an AI Analyst that trades on News.**
You will write a client script that uses an LLM (Large Language Model) to analyze text input (news headlines) and send trading signals to the Exchange.

## 🎯 Skills Learned
- \`Large Language Models (LLM)\`
- \`Prompt Engineering\`
- \`Sentiment Analysis\`
- \`AI Agents\`

## The Mission
Markets move on news. Speed matters, but understanding "Context" matters more. Build a script that asks ChatGPT / Gemini: "Is this headline bullish or bearish?"

## Lab Instructions

### Step 1: Define the Prompt
\`\`\`python
def analyze_sentiment(headline):
    prompt = f"Analyze sentiment: '{headline}'. Reply ONLY 'BUY' or 'SELL'."
    # Call LLM API...
    return response.text.strip()
\`\`\`

### Step 2: The Loop
Make a list of mock headlines.
\`\`\`python
news = [
    "Tech giant reports record profits!",
    "Central Bank raises interest rates unexpectedly."
]

for headline in news:
    signal = analyze_sentiment(headline)
    print(f"News: {headline} -> Signal: {signal}")
    
    if signal == "BUY":
        place_order("AAPL", "BUY", 100)
\`\`\`

## Outcome
You combined **Generative AI** with **Transactional Finance**.`
    },
    {
        id: '09',
        title: "The Analyst",
        role: "GenAI Specialist",
        icon: Sparkles,
        skills: ["RAG", "LangChain", "Vector DB", "PDF Ingestion"],
        md: `# Level 9: The Analyst (Gen AI / RAG)

> **Job Track**: 🧠 AI Engineer (GenAI Specialist)

## Objective
**Conversational Finance (RAG).**
AI models hallucinate. To trust them with money, we need to ground them in facts. You will build a **Retrieval Augmented Generation (RAG)** pipeline to read a company's Quarterly Report (PDF) and answer financial questions accurately.

## 🎯 Skills Learned
- \`LangChain\`
- \`Vector Databases (ChromaDB)\`
- \`RAG Pipeline\`
- \`PDF Ingestion\`

## The Mission
Your Portfolio Manager is too busy to read Apple's 10-K report. Build a tool where they can ask: "What are the risk factors this year?" and get a cited answer.

## Lab Instructions

### Step 1: Dependencies
Create a \`requirements.txt\` for your AI lab:
\`\`\`text
langchain
langchain-community
chromadb
pypdf
sentence-transformers
\`\`\`
Run \`pip install -r requirements.txt\`.

### Step 2: The Document
Download a sample "Apple 10-K" PDF (or use a dummy text file \`report.txt\` with financial data).
Place it in your project folder.

### Step 3: Ingest and Index
Create \`analyst.py\`:

\`\`\`python
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import SentenceTransformerEmbeddings

# 1. Load
loader = PyPDFLoader("report.pdf")
pages = loader.load_and_split()

# 2. Split
text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
splits = text_splitter.split_documents(pages)

# 3. Store (Vector DB)
embedding = SentenceTransformerEmbeddings(model_name="all-MiniLM-L6-v2")
vectorstore = Chroma.from_documents(documents=splits, embedding=embedding)
retriever = vectorstore.as_retriever()

print("✅ Document Indexed.")
\`\`\`

### Step 4: The Retrieval Chain
Append to \`analyst.py\`:

\`\`\`python
from langchain.chains import RetrievalQA
from langchain_community.llms import OpenAI # or Ollama/LlamaCpp

qa_chain = RetrievalQA.from_chain_type(llm=llm, retriever=retriever)

query = "What is the guidance for Q4?"
response = qa_chain.run(query)
print(f"🤖 Answer: {response}")
\`\`\`

## Outcome
You built an AI that can "read" files and answer questions based *only* on the provided context.`
    },
    {
        id: '10',
        title: "The Fund Manager",
        role: "Agentic AI Engineer",
        icon: Building2,
        skills: ["LangGraph", "MCP", "Multi-Agent", "Tool Calling"],
        md: `# Level 10: The Fund Manager (Agentic AI)

> **Job Track**: 🕵️ Agentic AI Engineer

## Objective
**Autonomous Trading with MCP.**
RAG is passive (it answers questions). Agents are active (they take actions). You will build a **LangGraph** workflow that connects your Analyst (from Level 9) to a Trader Agent using the **Model Context Protocol (MCP)** standard for tools.

## 🎯 Skills Learned
- \`LangGraph / LangChain Agents\`
- \`Model Context Protocol (MCP)\`
- \`Tool Calling\`
- \`Multi-Agent Orchestration\`

## The Mission
Build an autonomous pod:
1.  **Analyst Agent**: Reads news/reports (RAG).
2.  **Risk Agent**: Checks market volatility.
3.  **Portfolio Agent**: Decides "BUY" or "HOLD" based on the other two.

## Lab Instructions

### Step 1: Define Tools (MCP Style)
Create \`tools.py\`. We wrap our previous functions as "Tools".

\`\`\`python
from langchain.tools import tool

@tool
def get_analyst_opinion(ticker: str) -> str:
    """Consults the RAG model for a sentiment on the ticker."""
    # Call your Level 9 logic here
    return "Bullish based on recent growth."

@tool
def execute_trade(ticker: str, action: str) -> str:
    """Executes a trade on the server."""
    return f"Executed {action} on {ticker}"
\`\`\`

### Step 2: Build the Graph
Create \`fund_manager.py\` using \`langgraph\`.

\`\`\`python
from langgraph.graph import StateGraph, END
from typing import TypedDict

class AgentState(TypedDict):
    messages: list
    decision: str

def analyst_node(state):
    print("🕵️ Analyst: Market looks good.")
    return {"messages": ["Analyst says bullish"]}

def trader_node(state):
    print("💰 Trader: Conditions met. BUYING.")
    return {"decision": "BUY"}

workflow = StateGraph(AgentState)
workflow.add_node("analyst", analyst_node)
workflow.add_node("trader", trader_node)

workflow.set_entry_point("analyst")
workflow.add_edge("analyst", "trader")
workflow.add_edge("trader", END)

app = workflow.compile()
\`\`\`

### Step 3: Run the Hedge Fund
\`\`\`python
result = app.invoke({"messages": []})
print(f"Final Decision: {result['decision']}")
\`\`\`

## Outcome
You moved beyond simple chatbots to **Agentic Workflows**, where AI models collaborate to solve complex, multi-step problems autonomously.`
    },
    {
        id: '11',
        title: "The Cloud Native",
        role: "Cloud Engineer",
        icon: Cloud,
        skills: ["Auto-Scaling", "Docker", "HPA", "Python"],
        md: `# Level 11: The Cloud Native (Auto-Scaling)

> **Job Track**: ☁️ Cloud Engineer

## Objective
**Master Elasticity.**
The Cloud isn't just about renting servers; it's about **Elasticity**. As a Cloud Engineer, you build systems that expand and contract like a living lung. We will simulate this locally using Docker.

## 🎯 Skills Learned
- \`Cloud Native Architecture\`
- \`Horizontal Pod Autoscaling (HPA)\`
- \`Docker Compose Scaling\`
- \`Observability & Control Loops\`

## The Mission
1. Run your bot in Docker Compose.
2. Simulate a "Surge" of signals.
3. Write a Python script that detects the surge and runs \`docker compose up --scale bot=5\`.

## Lab Instructions

### Step 1: Setup
Use the \`docker-compose.yml\` from Level 2.
Ensure your bot prints "Processing signal..." every time it trades.

### Step 2: The Metrics
Create a file \`metrics.py\` (or exposes a tiny flask endpoint in your bot) to output its queue depth.
*Simpler approach for this lab:* We will assume "Time of Day" or "Market Volatility" is the metric.

### Step 3: The Auto-Scaler Script
Create \`autoscale_bot.py\`:

\`\`\`python
import subprocess
import time
import random

def get_market_volatility():
    return random.randint(0, 100)

current_replicas = 1

while True:
    volatility = get_market_volatility()
    target_replicas = 1
    if volatility > 80:
        target_replicas = 5
    elif volatility > 50:
        target_replicas = 3
        
    if target_replicas != current_replicas:
        subprocess.run(f"docker compose up -d --scale bot={target_replicas}", shell=True)
        current_replicas = target_replicas
        
    time.sleep(5)
\`\`\`

## Outcome
You implemented a **Control Loop**, the fundamental building block of Kubernetes and Cloud Auto-scaling.`
    },
    {
        id: '12',
        title: "The Trader Desktop",
        role: "Frontend Architect",
        icon: Layout,
        skills: ["Grid Layouts", "Drag & Drop", "Professional UI"],
        md: `# Level 12: The Trader Desktop (Capstone)

> **Job Track**: 🎨 Frontend Architect / Full Stack Engineer

## Objective
**Build the Ultimate Trading Workstation.**
Real traders don't switch browser tabs. They need everything in one view. You will build a professional, **Resizable & Draggable** Trader Desktop that combines all your previous tools (Blotter, Charts, News) into a single "Command Center".

## 🎯 Skills Learned
- \`Complex Grid Layouts\`
- \`React Resizable Panels\`
- \`Component Composition\`
- \`Professional UX Design\`

## The Mission
Your desk layout is your weapon. Build a dashboard where you can resize the Chart to focus on technicals, or expand the News Feed during earnings calls.

## Lab Instructions

### Step 1: The Layout Library
We don't build Drag & Drop from scratch. we use professional libraries.
\`\`\`bash
npm install react-resizable-panels lucide-react
\`\`\`

### Step 2: The Desktop Component
Create \`TraderDesktop.tsx\`. This acts as the container.

\`\`\`tsx
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

export default function TraderDesktop() {
  return (
    <div className="h-full bg-slate-900 text-white">
      <PanelGroup direction="horizontal">
        {/* Left: Market Data */}
        <Panel defaultSize={25} minSize={20}>
           <MarketDataList />
        </Panel>
        
        <PanelResizeHandle className="w-1 bg-slate-700 hover:bg-cyan-500 transition-colors" />
        
        {/* Center: Charts & Execution */}
        <Panel minSize={30}>
           <PanelGroup direction="vertical">
              <Panel defaultSize={60}>
                 <TradingChart />
              </Panel>
              <PanelResizeHandle className="h-1 bg-slate-700 hover:bg-cyan-500" />
              <Panel>
                 <OrderEntryForm />
              </Panel>
           </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  );
}
\`\`\`

### Step 3: Integrating Components
Import your components from previous labs (Blotter, Repo, etc.) and place them into the Panels.

## Outcome
You have built a specialized, high-performance workspace tool that rivals professional Bloomberg or Refinitiv terminals.`
    }
];
