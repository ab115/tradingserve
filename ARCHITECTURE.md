# Architecture Overview

This document illustrates the high-level architecture of the Trading Server, composed of three main microservices: **Market Data**, **Market Maker**, and **ECN Gateway**, running on a shared infrastructure.

## System Diagram

![Architecture Diagram](architecture_diagram.png)

```mermaid
graph TD
    %% Infrastructure Layer
    subgraph Infrastructure
        Redis[(Redis<br/><i>fintech_redis:6379</i>)]
        Redpanda[(Redpanda<br/><i>fintech_redpanda:9092</i>)]
        Net{{Docker Network<br/><i>fintech_net</i>}}
    end

    %% Market Data Service
    subgraph "Market Data Service"
        MD_UI[<b>Market Data UI</b><br/>React/Vite :3001]
        MD_Proxy[Nginx Proxy :3000]
        MD_Backend[<b>Market Data Backend</b><br/>Python FastAPI :9001]
        
        MD_UI --> MD_Proxy
        MD_Proxy --> MD_Backend
        MD_Backend -- "Publishes Prices<br/>(Stream/Hashes)" --> Redis
        MD_Backend -. "Publishes (Future)" .-> Redpanda
    end

    %% Market Maker Service
    subgraph "Market Maker Service"
        MM_UI[<b>Market Maker UI</b><br/>React/Vite :3002]
        MM_Backend[<b>Market Maker Backend</b><br/>Python FastAPI :9000]
        
        MM_UI -- "WS / REST (via Proxy)" --> MM_Backend
        MM_Backend -- "Subscribes (Prices)" --> Redis
        MM_Backend -- "Updates PnL" --> Redis
    end

    %% ECN Gateway Service
    subgraph "ECN Gateway Service"
        ECN_UI[<b>ECN Gateway UI</b><br/>React/Vite :3005]
        ECN_Backend[<b>ECN Gateway Backend</b><br/>Python FastAPI :9898]
        FIX_Engine[<b>FIX Engine</b><br/>QuickFIX :8000]
        
        ECN_UI --> ECN_Backend
        ECN_Backend -- "Manages" --> FIX_Engine
        FIX_Engine -- "Stores Orders" --> Redis
        FIX_Engine -- "Publishes Executions" --> Redpanda
    end

    %% External Connectivity
    Client[<b>External Client</b><br/>FIX Protocol] -- "FIX Sessions" --> FIX_Engine
    User((User)) -- "HTTP" --> MD_UI
    User -- "HTTP" --> MM_UI
    User -- "HTTP" --> ECN_UI

    %% Styling
    classDef infra fill:#e1f5fe,stroke:#01579b,stroke-width:2px;
    classDef service fill:#f3e5f5,stroke:#4a148c,stroke-width:2px;
    classDef component fill:#fff,stroke:#333,stroke-width:1px;
    
    class Redis,Redpanda,Net infra;
    class MD_Backend,MM_Backend,ECN_Backend,FIX_Engine component;
    class MD_UI,MM_UI,ECN_UI component;
```

## Layered Description

### 1. Presentation Layer (Frontend)
Each service has its own dedicated React-based UI, served via Vite or Nginx.
- **Market Data UI** (`:3000/3001`): Displays monitoring of data streams.
- **Market Maker UI** (`:3002`): Interactive blotter for managing positions and viewing PnL.
- **ECN Gateway UI** (`:3005`): Administrative dashboard for managing the exchange simulator and orders.

### 2. Application Layer (Backend)
Python-based microservices handling business logic.
- **Market Data Backend**: Fetches external data (Polygon/Simulated) and normalizes it.
- **Market Maker Backend**: Manages proprietary inventory/positions and calculates real-time PnL based on market moves.
- **ECN Gateway Backend**: Orchestrates the Exchange Simulator.

### 3. Connectivity Layer
- **FIX Engine (QuickFIX)**: Embedded within the ECN Gateway, handling standard financial information exchange (FIX) protocol messages (Orders, Executions) from external clients.

### 4. Data & Messaging Layer (Infrastructure)
Shared services running in the `fintech_net` network.
- **Redis (`fintech_redis`)**:
  - **Real-time Cache**: Stores latest prices (`market_data:{ticker}`).
  - **Message Broker**: PubSub for real-time price updates to Market Maker (`market_data_updates`).
  - **State Store**: Persists order books and positions.
- **Redpanda (`fintech_redpanda`)**:
  - **Event Streaming**: Future-proof log for trade reporting and audit trails.
