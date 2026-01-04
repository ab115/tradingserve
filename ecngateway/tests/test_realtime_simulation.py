import sys
import time
import quickfix as fix
import logging
import uuid
import random

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("RealTimeSim")

class CapturingClientApp(fix.Application):
    def __init__(self):
        super().__init__()
        self.logged_on_sessions = set()

    def onCreate(self, sessionID): 
        logger.info(f"Session Created: {sessionID}")

    def onLogon(self, sessionID): 
        logger.info(f"Logon: {sessionID}")
        self.logged_on_sessions.add(str(sessionID))

    def onLogout(self, sessionID): 
        logger.info(f"Logout: {sessionID}")
        if str(sessionID) in self.logged_on_sessions:
            self.logged_on_sessions.remove(str(sessionID))

    def toAdmin(self, message, sessionID): pass
    def fromAdmin(self, message, sessionID): pass
    def toApp(self, message, sessionID): pass
    def fromApp(self, message, sessionID): pass

class ExchangeTester:
    def __init__(self, session_id, name):
        self.session_id = session_id
        self.name = name
        self.counter = int(time.time())

    def _gen_id(self):
        self.counter += 1
        return f"SIM_{self.name}_{self.counter}_{uuid.uuid4().hex[:4]}"

    def send_order(self, symbol, side, qty, type, price=None):
        cl_ord_id = self._gen_id()
        msg = fix.Message()
        msg.getHeader().setField(fix.BeginString("FIX.4.2"))
        msg.getHeader().setField(fix.MsgType(fix.MsgType_NewOrderSingle))
        
        msg.setField(fix.ClOrdID(cl_ord_id))
        msg.setField(fix.HandlInst(fix.HandlInst_MANUAL_ORDER_BEST_EXECUTION))
        msg.setField(fix.Symbol(symbol))
        msg.setField(fix.Side(side))
        msg.setField(fix.TransactTime())
        
        if type == 'LIMIT':
            msg.setField(fix.OrdType(fix.OrdType_LIMIT))
            msg.setField(fix.Price(float(price)))
        else:
            msg.setField(fix.OrdType(fix.OrdType_MARKET))
            
        msg.setField(fix.OrderQty(float(qty)))
        
        fix.Session.sendToTarget(msg, self.session_id)
        return cl_ord_id

def run_simulation(duration_seconds=60):
    try:
        cfg = "client.cfg"
        settings = fix.SessionSettings(cfg)
        app = CapturingClientApp()
        storeFactory = fix.FileStoreFactory(settings)
        logFactory = fix.FileLogFactory(settings)
        
        initiator = fix.SocketInitiator(app, storeFactory, settings, logFactory)
        initiator.start()
        
        logger.info("Waiting for Logons...")
        # Wait for both clients
        timeout = 10
        while timeout > 0:
            if len(app.logged_on_sessions) >= 2:
                break
            time.sleep(1)
            timeout -= 1
            
        if len(app.logged_on_sessions) < 2:
            logger.error("Failed to connect all sessions. Exiting.")
            sys.exit(1)
            
        # Setup Testers
        s2 = fix.SessionID("FIX.4.2", "CLIENT2", "ECNGATEWAY")
        s3 = fix.SessionID("FIX.4.2", "CLIENT3", "ECNGATEWAY")
        
        clients = [
            ExchangeTester(s2, "CLIENT2"),
            ExchangeTester(s3, "CLIENT3")
        ]
        
        # Simulation Config
        tickers = ["AAPL", "ADANIENT.NS", "TSLA", "MSFT", "AMZN"]
        base_prices = {
            "AAPL": 150.0,
            "ADANIENT.NS": 2239.0,
            "TSLA": 900.0,
            "MSFT": 300.0,
            "AMZN": 3400.0
        }
        # Random Walk Price State
        current_prices = base_prices.copy()
        
        start_time = time.time()
        end_time = start_time + duration_seconds
        
        logger.info(f"Starting Real-Time Trading Simulation for {duration_seconds} seconds...")
        
        order_count = 0
        
        while time.time() < end_time:
            # 1. Select Client
            client = random.choice(clients)
            
            # 2. Select Ticker
            symbol = random.choice(tickers)
            
            # 3. Update 'Market Price' (Random Walk)
            # Drift +/- 0.5%
            drift = random.uniform(-0.005, 0.005)
            current_prices[symbol] *= (1 + drift)
            market_price = current_prices[symbol]
            
            # 4. Decide Order Params
            side = random.choice([fix.Side_BUY, fix.Side_SELL])
            ord_type = random.choice(['LIMIT', 'LIMIT', 'LIMIT', 'MARKET']) # 75% Limit
            qty = random.randint(10, 500)
            
            price = None
            if ord_type == 'LIMIT':
                # Limit price close to market
                # Buy Limit slightly below, Sell Limit slightly above (normally)
                # But to cross spread, we randomize offset
                offset = random.uniform(-2.0, 2.0)
                price = round(market_price + offset, 2)
            
            # 5. Send
            client.send_order(symbol, side, qty, ord_type, price)
            order_count += 1
            
            if order_count % 10 == 0:
                logger.info(f"Submitted {order_count} orders. Time remaining: {int(end_time - time.time())}s")
            
            # 6. Sleep to throttle (simulate human/algo latency)
            time.sleep(random.uniform(0.1, 0.5))
            
        logger.info(f"Simulation Complete. Total Orders: {order_count}")
        initiator.stop()
        
    except Exception as e:
        logger.error(f"Simulation Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    # Default 60s
    run_simulation(60)
