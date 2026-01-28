export interface Lab {
    id: number;
    title: string;
    role: string;
    icon: string;
    skills: string[];
    md: string;
}

export const labs: Lab[] = [
    {
        id: 1,
        title: "The Build Pipeline",
        role: "DevOps Engineer",
        icon: "🚀",
        skills: ["GitHub Actions", "YAML", "CI/CD"],
        md: `# Level 1: The Build Pipeline (CI/CD)

> **Job Track**: 🛠️ DevOps Engineer

## Objective
**Automate the deployment of your Trading Bot.**
In this lab, you are a client connecting to the hosted Trading Server. You will write a simple Python script ("The Bot") and use GitHub Actions to test it automatically.

## 🎯 Skills Learned
- \`GitHub Actions\`
- \`YAML Configuration\`
- \`Python Testing\`
- \`CI/CD Pipelines\`

## The Mission
You are building an Algo Trading firm. You cannot run code manually from your laptop in production. You need a pipeline that verifies your bot's code quality before it touches real money.

## Lab Instructions

### Step 1: Create a Repository
1. Create a new GitHub repository called \`algo-bot\`.
2. Clone it to your local machine.

### Step 2: Write "The Bot"
Create a file \`bot.py\`:

\`\`\`python
import sys

def strategy(price):
    if price < 100:
        return "BUY"
    return "HOLD"

if __name__ == "__main__":
    signal = strategy(99)
    print(f"Signal: {signal}")
\`\`\`

### Step 3: Define the CI Workflow
Create \`.github/workflows/ci.yml\`:

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
        python -c "from bot import strategy; assert strategy(99) == 'BUY'"
\`\`\`

### Step 4: Push & Verify
1. \`git add .\`, \`git commit -m "Init"\`, \`git push\`.
2. Go to your GitHub Repo -> Actions tab.
3. Verify the build turns Green.

## Outcome
You now have a CI pipeline. In future levels, this pipeline could deploy your bot to the cloud.`
    },
    {
        id: 2,
        title: "The Cockpit",
        role: "SRE Engineer",
        icon: "📊",
        skills: ["PromQL", "Grafana", "Observability"],
        md: `# Level 2: The Cockpit (Observability)

> **Job Track**: 🚨 Site Reliability Engineer (SRE)

## Objective
**Investigate Market Anomalies using Grafana.**
The Trading Server exposes its internal metrics via Prometheus and visualizes them in Grafana. You are an External Analyst seeing odd behavior. Use the dashboards to catch the issue.

## 🎯 Skills Learned
- \`PromQL Querying\`
- \`Grafana Dashboards\`
- \`Latency Analysis\`
- \`System Observability\`

## The Mission
Reports say the Exchange is slowing down. You have read-only access to the public Grafana dashboard. Find the metric that proves the latency spike.

## Lab Instructions

### Step 1: Access Grafana
1. Open your browser to \`http://<SERVER_IP>:3000\`.
2. Login with \`admin\` / \`admin\`.

### Step 2: Build a Custom Dashboard
You suspect the "Order Rate" is too high.
1. Click **Dashboards** -> **New Dashboard** -> **Add Visualization**.
2. Select **Prometheus** as data source.
3. Query: \`rate(exchange_orders_total[1m])\`.
4. Label the panel "Global Order Rate".

### Step 3: Correlate with Latency
1. Add another panel.
2. Query: \`histogram_quantile(0.99, rate(exchange_latency_bucket[1m]))\`.
3. Observe: Does latency peak when Order Rate peaks?

## Outcome
You learned how to query a system's health without having code access.`
    },
    {
        id: 3,
        title: "The Tape Reader",
        role: "Data Engineer",
        icon: "📼",
        skills: ["Redis", "Pub/Sub", "Data Streams"],
        md: `# Level 3: The Tape Reader (Redis)

> **Job Track**: 💾 Data Engineer

## Objective
**Tap into the raw data feed using Redis.**
The Exchange broadcasts every price ticking on a public Redis Channel. You will build a "Tape Reader" client to subscribe and print these ticks in real-time.

## 🎯 Skills Learned
- \`Redis CLI\`
- \`Pub/Sub Architecture\`
- \`Key-Value Stores\`
- \`Real-time Data Streams\`

## The Mission
You need the fastest possible price feed. The Web UI is too slow. You will connect directly to the Redis port (6379) exposed by the server.

## Lab Instructions

### Step 1: Install Redis Tools
- Windows: \`choco install redis-64\`
- Mac/Linux: \`brew install redis\` or \`apt install redis-tools\`
- Or use Python: \`pip install redis\`

### Step 2: Connect from Terminal
\`\`\`bash
redis-cli -h <SERVER_IP> -p 6379
> PING
PONG
\`\`\`

### Step 3: Subscribe to the Feed
\`\`\`bash
> SUBSCRIBE market_data
\`\`\`
Keep this running. Request a "Simulation Start" from the Web Portal. You should see JSON messages flying by:
\`{"symbol": "AAPL", "price": 150.23, "ts": 16789...}\`

### Challenge
Write a Python script \`tape_reader.py\`:
1. Connects to Redis.
2. Subscribes to \`market_data\`.
3. Prints **only** AAPL trades > $150.

## Outcome
You bypassed the UI to get raw, low-latency data directly from the infrastructure.`
    },
    {
        id: 4,
        title: "The Algo Trader",
        role: "Quant Developer",
        icon: "🤖",
        skills: ["REST API", "WebSocket", "AsyncIO"],
        md: `# Level 4: The Algo Trader (REST & WebSocket)

> **Job Track**: ⚡ Quantitative Developer

## Objective
**Build an automated Trading Client.**
You will write a script that connects to the Exchange's API to make trading decisions automatically.

## 🎯 Skills Learned
- \`REST API Polling\`
- \`WebSocket Streaming\`
- \`Python Requests\`
- \`AsyncIO / Await\`

## The Mission
Your strategy is simple: "Buy low, Sell high".
1.  **Poll** the Snapshot (REST) to find a starting price.
2.  **Listen** to the Stream (WebSocket) for updates.
3.  **Execute** an Order (REST) when the price drops.

## Lab Instructions

### Step 1: Get the Snapshot (REST)
Endpoint: \`GET http://<SERVER_IP>/marketdata/api/book/AAPL\`
Response: \`{"bids": [...], "asks": [...]}\`

\`\`\`python
import requests
res = requests.get("http://<SERVER_IP>/marketdata/api/book/AAPL")
print(res.json())
\`\`\`

### Step 2: Listen to Stream (WebSocket)
Endpoint: \`ws://<SERVER_IP>/marketdata/ws/level1\`

\`\`\`python
import websockets, asyncio

async def listen():
    async with websockets.connect("ws://<SERVER_IP>/marketdata/ws/level1") as ws:
        while True:
            msg = await ws.recv()
            print(f"Update: {msg}")

asyncio.run(listen())
\`\`\`

### Step 3: Execute Order (REST)
Endpoint: \`POST http://<SERVER_IP>/ecn/api/orders\`
Payload: \`{"symbol": "AAPL", "side": "BUY", "qty": 100, "price": 149.00}\`

## Outcome
You have built a fully functional Algo Trader running on your machine, interacting with the remote exchange.`
    },
    {
        id: 5,
        title: "The Glass",
        role: "Frontend Architect",
        icon: "🖥️",
        skills: ["React", "Vite", "Real-time"],
        md: `# Level 5: The Glass (React UI)

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
        id: 6,
        title: "The Audit Log",
        role: "Compliance Eng",
        icon: "📜",
        skills: ["Redpanda", "Kafka", "Streaming"],
        md: `# Level 6: The Audit Log (Redpanda Streaming)

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
The Regulator requires a separate, read-only record of all trades. You cannot trust the REST API logs; you need the raw event stream. Redpanda provides a high-performance, crash-safe engine for this.

## Lab Instructions

### Step 1: Install Python Client
Since Redpanda is 100% compatible with the Apache Kafka® API, we use the standard, high-performance \`confluent-kafka\` library (based on \`librdkafka\`). **No Redpanda-specific client is needed.**

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
        id: 7,
        title: "The Brain",
        role: "AI Engineer",
        icon: "🧠",
        skills: ["LLM", "Prompt Engineering", "Agents"],
        md: `# Level 7: The Brain (Agentic AI)

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
Markets move on news. Speed matters, but understanding "Context" matters more. Build a script that asks ChatGPT / Gemini: "Is this headline bullish or bearish for Tech Stocks?"

## Lab Instructions

### Step 1: Define the Prompt
(Function using \`openai\` or \`google.generativeai\` SDK)

\`\`\`python
def analyze_sentiment(headline):
    prompt = f"Analyze sentiment for stock market: '{headline}'. Reply ONLY 'BUY' or 'SELL'."
    # Call LLM API...
    return response.text.strip()
\`\`\`

### Step 2: The Loop
Make a list of mock headlines.
\`\`\`python
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
\`\`\`

## Outcome
You combined **Generative AI** with **Transactional Finance**. This is the bleeding edge of FinTech.`
    },
    {
        id: 8,
        title: "The Stress Test",
        role: "QA Architect",
        icon: "🔥",
        skills: ["Locust", "DDoS", "Capacity Planning"],
        md: `# Level 8: The Stress Test (Scaling Analysis)

> **Job Track**: 🔥 QA / Performance Architect

## Objective
**Break the Server.**
As a Quality Assurance (QA) Engineer, you need to find the breaking point of the deployment. You will use a Load Testing tool to spam the API and observe failure rates.

## 🎯 Skills Learned
- \`Load Testing (Locust)\`
- \`DDoS Simulation\`
- \`System Capacity Planning\`
- \`Latency Analysis\`

## The Mission
The Exchange claims to handle 1,000 orders/sec. Verify it.

## Lab Instructions

### Step 1: Install Locust
Locust is a Python load testing tool.
\`\`\`bash
pip install locust
\`\`\`

### Step 2: Define the User Behavior
Create \`locustfile.py\`:

\`\`\`python
from locust import HttpUser, task, between

class Trader(HttpUser):
    wait_time = between(0.1, 0.5)

    @task
    def view_book(self):
        self.client.get("/marketdata/api/book/AAPL")

    @task(3) # 3x more likely
    def place_order(self):
        self.client.post("/ecn/api/orders", json={
            "symbol": "AAPL", "side": "BUY", "qty": 10
        })
\`\`\`

### Step 3: Attack!
Run \`locust -f locustfile.py --host=http://<SERVER_IP>\`.
Open \`http://localhost:8089\` (Locust UI) on your machine.
Spawn 100 Users, then 1000 Users.

### Step 4: Analyze
1. Watch the **Failure Rate**. When does it cross 1%?
2. Watch the **Response Time** (Latency). When does it spike > 500ms?
3. Check the **Grafana Dashboard** (from Level 2) to see CPU usage on the server.

## Outcome
You performed a "DDoS" stress test to validate system capacity and scaling limits.`
    }
];
