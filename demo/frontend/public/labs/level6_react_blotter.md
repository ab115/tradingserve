# Level 5: The Glass (React UI)

> **Job Track**: 🎨 Frontend Architect

## Objective
**Build a custom Trading Dashboard.**
You don't like the official Exchange UI? Build your own.
You will create a simplified React application running on your laptop that connects to the Server's WebSocket feed to display a live "Order Blotter".

## 🎯 Skills Learned
- `React.js` / `Vite`
- `WebSocket Integration`
- `Real-time UI Updates`
- `SPA Architecture`

## The Mission
Your Head Trader needs a filtered view of specific symbols. The main portal is too cluttered. Build a lightweight "Blotter App" using React.

## Lab Instructions

### Step 1: Scaffold the App
(Requires Node.js)
```bash
npm create vite@latest my-blotter -- --template react
cd my-blotter
npm install
npm run dev
```

### Step 2: Connect to WebSocket
In `App.jsx`:

```javascript
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
```

### Challenge
Add color coding: Green row if `price` > last price, Red if lower.

## Outcome
You built a "Single Page Application" (SPA) that consumes live financial data from a remote server.
