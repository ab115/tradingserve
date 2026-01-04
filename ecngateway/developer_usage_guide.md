# ECN Gateway Developer Guide

This guide provides instructions for developers to run, test, and extend the ECN Gateway. The system consists of a Python/QuickFIX backend (FastAPI, Redis) and a React-based Real-Time UI.

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Python 3.9+ (for local script execution)

### Running the Stack
The entire system (FIX Engine, API, Redis, UI) is containerized.

1. **Start the System**:
   ```bash
   docker-compose up --build
   ```
   This will start:
   - **ecn-fix-server**: The Core FIX engine (Port 9898 for FIX, Port 8000 for API).
   - **ecn-ui**: The React Frontend (Port 3000).
   - **redis**: Message persistance layer.
   - **kafka/zookeeper**: (Optional) For message broadcasting.

2. **Access the Interfaces**:
   - **Real-Time UI**: [http://localhost:3000](http://localhost:3000)
   - **Backend API**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - **FIX Port**: `localhost:9898`

## 🖥️ Real-Time UI Features
The UI simulates a Bloomberg terminal style experience for monitoring ECN traffic.

- **Order Blotter**: Displays live orders (New, Cancel, Replace).
  - **Sorting**: Click column headers to sort by Time, Symbol, Side, etc. (Asc/Desc/None).
  - **Filtering**: Use the top search bar to filter by Symbol or ID.
  - **Status Updates**: Canceled orders appear with strikethrough; Replaced orders updates in-place.
- **Session Monitor**: Shows active Clients (Left Panel).
  - **Filtering by Client**: Click a session (e.g., `CLIENT2`) to view ONLY their orders and messages.
- **Admin Grid**: View low-level FIX messages (Logon, Heartbeat, Reject) in the bottom panel.
- **Resizing**: Drag the divider between the Blotter and Admin Grid to customize your view.

## 🧪 Verification & Testing

### Running Test Scenarios
We provide a Python script that acts as a FIX Client to simulate order flow (New, Limit, Cancel, Replace).

Run this command while the stack is up:
```bash
docker-compose run --rm -v ${PWD}/tests:/tests -w /tests ecn-fix-server python test_scenarios.py
```
*Note: On Linux/Mac replace `${PWD}` with `$(pwd)`.*

### Manual API Verification
To inspect raw data returned by the API (useful for debugging missing fields):
```bash
python tests/verify_api_data.py
```

## 🔌 Adding New ECN Clients
To allow a new trading client (e.g., a new Hedge Fund or Algorithm) to connect to the ECN, follow these steps:

### 1. Update Server Configuration
Modify `backend/server.cfg` to define a new `[SESSION]` block.

```ini
# Open backend/server.cfg and append:

[SESSION]
BeginString=FIX.4.2
SenderCompID=ECNGATEWAY
TargetCompID=NEW_CLIENT_ID   <-- Unique Identifier for the new client
SocketAcceptPort=9898
```
*Note: The `SenderCompID` is the Gateway's ID, and `TargetCompID` is what the Client will identify as.*

### 2. Update FIX Dictionary (If Custom Fields Needed)
If the new client requires custom FIX tags or messages not currently supported, you may need to edit `backend/FIX42.xml`. 
*Example: We recently added tags 54 (Side) and 60 (TransactTime) to `OrderCancelRequest` to support standard compliance.*

### 3. Restart the Server
Apply the configuration changes:
```bash
docker-compose restart ecn-fix-server
```

### 4. Provide Connectivity Details to Client
Give the following details to the developer implementing the client-side:
- **Host**: (Your Server IP)
- **Port**: 9898
- **SenderCompID**: `NEW_CLIENT_ID`
- **TargetCompID**: `ECNGATEWAY`
- **Protocol**: FIX 4.2

## 📂 Project Structure
- `backend/fix_app.py`: Main application logic processing FIX messages.
- `backend/api.py`: FastAPI server serving data to the UI.
- `backend/redis_storage.py`: Handles persistence of orders/messages.
- `ui/src/App.tsx`: Main React UI component.
- `tests/`: Client simulators and verification scripts.
