# Level 2: The Cockpit (Observability)

> **Job Track**: 🚨 Site Reliability Engineer (SRE)

## Objective
**Investigate Market Anomalies using Grafana.**
The Trading Server exposes its internal metrics via Prometheus and visualizes them in Grafana. You are an External Analyst seeing odd behavior. Use the dashboards to catch the issue.

## 🎯 Skills Learned
- `PromQL Querying`
- `Grafana Dashboards`
- `Latency Analysis`
- `System Observability`

## The Mission
Reports say the Exchange is slowing down. You have read-only access to the public Grafana dashboard. Find the metric that proves the latency spike.

## Lab Instructions

### Step 1: Access Grafana
1. Open your browser to `http://<SERVER_IP>:3000`.
2. Login with `admin` / `admin`.

### Step 2: Build a Custom Dashboard
You suspect the "Order Rate" is too high.
1. Click **Dashboards** -> **New Dashboard** -> **Add Visualization**.
2. Select **Prometheus** as data source.
3. Query: `rate(exchange_orders_total[1m])`.
4. Label the panel "Global Order Rate".

### Step 3: Correlate with Latency
1. Add another panel.
2. Query: `histogram_quantile(0.99, rate(exchange_latency_bucket[1m]))`.
3. Observe: Does latency peak when Order Rate peaks?

## Outcome
You learned how to query a system's health without having code access.
