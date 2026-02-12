# Greenfield Project Portfolio: The Engineering Ladder

This document outlines 5 "Start from Scratch" projects.
**Design Goal:** These projects are mapped to the **Job Tracks** defined in the EduLab Engineering Ladder.
**Language Policy:** Users may use **Any Language** (Python, Go, Rust, Java, Node.js). Complexity lies in the engineering, not the syntax.

---

## Level 1: "The Watchtower"
**Job Track:** 🚨 **Site Reliability Engineer (SRE) / DevOps**
**Primary Skill:** Observability & Resilience
**Timeframe:** 2 Days

### The Challenge
A distributed system produces logs across 10 containers. SSH-ing into each one is impossible. You need a centralized Log Aggregator that survives crashes.

### Sample Input Data
Your Ingestion Service will receive HTTP POST requests with this JSON payload:
```json
// POST /logs
{
  "timestamp": "2023-10-27T10:00:00Z",
  "level": "ERROR",
  "service": "payment-gateway",
  "msg": "Connection timeout to bank API",
  "trace_id": "abc-123"
}
```

### Requirements
1.  **Ingest:** Accept high-velocity logs via HTTP.
2.  **Buffer:** Queue logs in memory or Redis to prevent data loss during spikes.
3.  **Index:** Store logs in a file structure: `/var/logs/{service}/{date}.log`.
4.  **Tail:** Provide a CLI tool or API to "tail" logs for a specific service.

### Expected Output
When running your CLI tool:
```bash
$ ./watchtower tail payment-gateway --level ERROR
[10:00:00] [ERROR] Connection timeout to bank API (trace_id: abc-123)
```

### Verification Scenarios
1.  **The Spike:** Send 10,000 logs in 5 seconds. Ensure 0 are dropped.
2.  **The Crash:** Kill your Aggregator process while sending logs. Restart it. Did it process the buffered logs?

---

## Level 2: "The Pipeline"
**Job Track:** 💾 **Data Engineer**
**Primary Skill:** ETL (Extract, Transform, Load) & Stream Processing
**Timeframe:** 2 Days

### The Challenge
Raw market data is "Dirty". Build a pipeline to clean it.

### Sample Input Data (Dirty Stream)
Your "Source" script will generate this disjointed data:
```json
{"sym": "AAPL", "p": 150.5, "t": 1698422400}      // Good
{"sym": "GOOG", "p": -42.0, "t": 1698422401}      // Bad Price
{"sym": "MSFT", "p": "200.0", "t": null}          // Bad Type/Null Time
{"sym": "TSLA", "price": 250.0}                   // Schema Drift (wrong key)
```

### Requirements
1.  **Extract:** Listen to the raw input stream.
2.  **Transform:**
    *   Standardize keys to: `symbol`, `price`, `timestamp`.
    *   Drop records with non-positive prices.
    *   Fill missing timestamps with `CurrentTime`.
    *   Convert `p` (string) to `price` (float).
3.  **Load:** Save clean records to Redis.

### Expected Output (Cleaned)
```json
{"symbol": "AAPL", "price": 150.5, "timestamp": "2023-10-27T16:00:00Z"}
{"symbol": "MSFT", "price": 200.0, "timestamp": "2023-10-27T16:00:05Z"} // Filled time
{"symbol": "TSLA", "price": 250.0, "timestamp": "2023-10-27T16:00:05Z"} // Normalized key
```

### Verification Scenarios
1.  **Schema Check:** Ensure ONLY valid fields exist in the output.
2.  **Aggregation:** Calculate the 1-minute Moving Average for AAPL from the clean data.

---

## Level 3: "The Matcher"
**Job Track:** ⚡ **Backend / Quantitative Developer**
**Primary Skill:** High-Performance Logic & Concurrency
**Timeframe:** 2.5 Days

### The Challenge
Build a simplified Limit Order Book matching engine.

### Sample Input Data (Order Stream)
```csv
# ID, Side, Price, Qty
1, BUY, 100.00, 10
2, SELL, 101.00, 5
3, SELL, 99.00, 5
```

### Requirements
1.  **Resting:** Order 1 (Buy @ 100) waits in the book.
2.  **Resting:** Order 2 (Sell @ 101) waits (Price is too high to match).
3.  **Matching:** Order 3 (Sell @ 99) crosses the spread. It matches with Order 1.
    *   *Result:* Order 3 fills completely. Order 1 has 5 remaining. Execution Price is 100.00 (Maker Price).

### Expected Output (Trade Log)
```json
{"match_id": 1, "price": 100.00, "qty": 5, "maker_id": 1, "taker_id": 3}
```
*Current Book State:*
*   **Bids:** `[ID: 1, Price: 100, Qty: 5]`
*   **Asks:** `[ID: 2, Price: 101, Qty: 5]`

### Verification Scenarios
1.  **Price-Time Priority:** Submit 2 Buy orders at the same price. The first one must fill first.
2.  **Partial Fill:** Submit a large Buy order. Match it against multiple small Sell orders.

---

## Level 4: "The Traffic Cop"
**Job Track:** ☁️ **Cloud / Systems Architect**
**Primary Skill:** Distributed Systems & Networking
**Timeframe:** 3 Days

### The Challenge
Build a Layer 7 Load Balancer that distributes traffic to 3 backend servers.

### Sample Input Data
`curl -v http://localhost:8080/api/v1/status`

### Requirements
1.  **Upstreams:** Run 3 simple HTTP servers (e.g., Python `http.server`) on ports 9001, 9002, 9003. Each returns its Port Number as the body.
2.  **Proxy:** Your LB runs on 8080.
3.  **Strategy:** Round Robin.

### Expected Output
Requests to 8080 should rotate:
```bash
$ curl localhost:8080 -> "Hello from Port 9001"
$ curl localhost:8080 -> "Hello from Port 9002"
$ curl localhost:8080 -> "Hello from Port 9003"
$ curl localhost:8080 -> "Hello from Port 9001"
```

### Verification Scenarios
1.  **Health Check:** Kill the server on 9002. Ideally, the LB should detect this and skip it (9001 -> 9003 -> 9001).
2.  **Concurrency:** Fire 100 requests async. Ensure distribution is roughly 33/33/33.

---

## Level 5: "The Analyst"
**Job Track:** 🧠 **AI / Machine Learning Engineer**
**Primary Skill:** NLP & Vector Search (RAG)
**Timeframe:** 3 Days

### The Challenge
Build a Semantic Search Engine for Financial News.

### Sample Input Data (Corpus)
```json
[
  {"id": 1, "text": "Fed raises interest rates by 25bps."},
  {"id": 2, "text": "Apple releases new iPhone 15 with USB-C."},
  {"id": 3, "text": "Oil prices surge due to supply cuts."}
]
```

### Requirements
1.  **Embed:** Use a library (like `sentence-transformers` or OpenAI API) to turn text into vectors.
2.  **Store:** Keep vectors in memory or a vector DB (Chroma/FAISS).
3.  **Search:** Accept a query, embed it, and find the nearest neighbor (Cosine Similarity).

### Expected Output
**User Query:** *"What is happening with inflation?"*
**System Match:**
1.  `"Fed raises interest rates by 25bps."` (Score: 0.85)
2.  `"Oil prices surge..."` (Score: 0.45)
3.  `"Apple releases..."` (Score: 0.10)

### Verification Scenarios
1.  **Synonyms:** Query *"Crude"* and ensure it matches *"Oil"*.
2.  **Context:** Query *"Tech gadget"* and ensure it matches *"iPhone"*.
