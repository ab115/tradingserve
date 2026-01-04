import quickfix as fix
import time
import sys
import logging
import uuid
from datetime import datetime

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class CapturingClientApp(fix.Application):
    def __init__(self):
        super().__init__()
        self.received_messages = []
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
    def toApp(self, message, sessionID): 
        logger.debug(f">> Sending: {message}")

    def fromApp(self, message, sessionID): 
        logger.info(f"<< Received: {message}")
        self.received_messages.append(fix.Message(message))
        
    def get_execution_reports(self):
        reports = []
        for msg in self.received_messages:
            msg_type = fix.MsgType()
            if msg.getHeader().isSetField(msg_type):
                msg.getHeader().getField(msg_type)
                if msg_type.getValue() == fix.MsgType_ExecutionReport:
                    reports.append(msg)
        return reports
    
    def clear_messages(self):
        self.received_messages = []

class ExchangeTester:
    def __init__(self, session_id):
        self.session_id = session_id
        self.counter = int(time.time())

    def _gen_id(self):
        self.counter += 1
        return f"TEST_{self.counter}_{uuid.uuid4().hex[:4]}"

    def send_limit_order(self, symbol, side, qty, price):
        cl_ord_id = self._gen_id()
        msg = fix.Message()
        msg.getHeader().setField(fix.BeginString("FIX.4.2"))
        msg.getHeader().setField(fix.MsgType(fix.MsgType_NewOrderSingle))
        
        msg.setField(fix.ClOrdID(cl_ord_id))
        msg.setField(fix.HandlInst(fix.HandlInst_MANUAL_ORDER_BEST_EXECUTION))
        msg.setField(fix.Symbol(symbol))
        msg.setField(fix.Side(side))
        msg.setField(fix.TransactTime())
        msg.setField(fix.OrdType(fix.OrdType_LIMIT))
        msg.setField(fix.OrderQty(float(qty)))
        msg.setField(fix.Price(float(price)))
        
        fix.Session.sendToTarget(msg, self.session_id)
        return cl_ord_id

    def send_market_order(self, symbol, side, qty):
        cl_ord_id = self._gen_id()
        msg = fix.Message()
        msg.getHeader().setField(fix.BeginString("FIX.4.2"))
        msg.getHeader().setField(fix.MsgType(fix.MsgType_NewOrderSingle))
        
        msg.setField(fix.ClOrdID(cl_ord_id))
        msg.setField(fix.HandlInst(fix.HandlInst_MANUAL_ORDER_BEST_EXECUTION))
        msg.setField(fix.Symbol(symbol))
        msg.setField(fix.Side(side))
        msg.setField(fix.TransactTime())
        msg.setField(fix.OrdType(fix.OrdType_MARKET))
        msg.setField(fix.OrderQty(float(qty)))
        
        fix.Session.sendToTarget(msg, self.session_id)
        return cl_ord_id

def run_scenarios():
    try:
        cfg = "client.cfg"
        settings = fix.SessionSettings(cfg)
        app = CapturingClientApp()
        storeFactory = fix.FileStoreFactory(settings)
        logFactory = fix.FileLogFactory(settings)
        
        # Manually create Initiator
        initiator = fix.SocketInitiator(app, storeFactory, settings, logFactory)
        initiator.start()
        logger.info("Waiting for logons...")
        
        # Wait for sessions
        timeout = 10
        active_sessions = []
        while timeout > 0:
            if len(app.logged_on_sessions) >= 2:
                break
            time.sleep(1)
            timeout -= 1
            
        # We need to map SenderCompID to SessionID to Tester
        testers = {}
        
        # Re-verify sessions are up by lookup
        s2 = fix.SessionID("FIX.4.2", "CLIENT2", "ECNGATEWAY")
        s3 = fix.SessionID("FIX.4.2", "CLIENT3", "ECNGATEWAY")
        
        if str(s2) in app.logged_on_sessions and str(s3) in app.logged_on_sessions:
             testers['CLIENT2'] = ExchangeTester(s2)
             testers['CLIENT3'] = ExchangeTester(s3)
             logger.info("Both CLIENT2 and CLIENT3 sessions Active.")
        else:
             logger.error(f"Failed to detect both sessions. Active: {app.logged_on_sessions}")
        
        if 'CLIENT2' not in testers or 'CLIENT3' not in testers:
             logger.error("Missing sessions. Exiting.")
             sys.exit(1)
             
        client2 = testers['CLIENT2']
        client3 = testers['CLIENT3']
        symbol = "TSLA"
        
        # --- SCENARIO 1: Multi-Client Limit Match ---
        logger.info("\n=== SCENARIO 1: CLIENT2 Sells, CLIENT3 Buys (Limit Match) ===")
        app.clear_messages()
        
        # Client 2 Places Sell Limit
        sell_id = client2.send_limit_order(symbol, fix.Side_SELL, 100, 450.00)
        logger.info(f"CLIENT2 Sent Sell Limit 100 @ 450.00 (ID: {sell_id})")
        time.sleep(2)
        
        # Client 3 Places Buy Limit matching
        buy_id = client3.send_limit_order(symbol, fix.Side_BUY, 100, 450.00)
        logger.info(f"CLIENT3 Sent Buy Limit 100 @ 450.00 (ID: {buy_id})")
        time.sleep(4)
        
        reports = app.get_execution_reports()
        check_fills(reports, buy_id, sell_id, 100) # Checks IDs regardless of session (app captures all)

        # --- SCENARIO 2: Market Order Interactions ---
        logger.info("\n=== SCENARIO 2: CLIENT3 Resting + CLIENT2 Market Aggressor ===")
        app.clear_messages()
        
        # Client 3 provides liquidity
        resting_id = client3.send_limit_order(symbol, fix.Side_BUY, 50, 448.00)
        logger.info(f"CLIENT3 Sent Buy Limit 50 @ 448.00 (ID: {resting_id})")
        time.sleep(2)
        
        # Client 2 sells Market
        market_sell_id = client2.send_market_order(symbol, fix.Side_SELL, 50)
        logger.info(f"CLIENT2 Sent Market Sell 50 (ID: {market_sell_id})")
        time.sleep(4)
        
        reports = app.get_execution_reports()
        # Note: buy_id/sell_id arg order in check_fills logic needs to match
        # Function: check_fills(reports, buy_id, sell_id, ...)
        # Here Buy is Resting (client3), Sell is Market (client2)
        check_fills(reports, resting_id, market_sell_id, 50)

        initiator.stop()
        
    except Exception as e:
        logger.error(f"Error: {e}")
        sys.exit(1)

def check_fills(reports, buy_id, sell_id, expected_qty):
    buy_filled = False
    sell_filled = False
    
    # Pre-declare fields to avoid reallocation loop
    cl_ord_id = fix.ClOrdID()
    ord_status = fix.OrdStatus()
    last_qty = fix.LastQty()
    
    for msg in reports:
        try:
            msg.getField(cl_ord_id)
            oid = cl_ord_id.getValue()
            
            msg.getField(ord_status)
            status = ord_status.getValue()
            
            qty = 0.0
            if msg.isSetField(last_qty):
                msg.getField(last_qty)
                qty = last_qty.getValue()
            
            logger.info(f"CHECKING MSG: OID={oid} Status={status} (Expected Buy={buy_id}, Sell={sell_id})")
            
            if oid == buy_id and status == fix.OrdStatus_FILLED:
                buy_filled = True
                logger.info(f"Verified BUY {buy_id} FILLED with {qty}")
            if oid == sell_id and status == fix.OrdStatus_FILLED:
                sell_filled = True
                logger.info(f"Verified SELL {sell_id} FILLED with {qty}")
        except Exception as e:
            logger.error(f"Error parsing msg: {e}")
            
    if buy_filled and sell_filled:
        logger.info("SUCCESS: Match confirmed.")
    else:
        logger.error("FAILURE: Orders not filled as expected.")

def verify_partial_fill(reports, oid, expected_fill, expected_leaves):
    found = False
    
    cl_ord_id = fix.ClOrdID()
    ord_status = fix.OrdStatus()
    leaves_qty = fix.LeavesQty()
    
    for msg in reports:
        try:
            msg.getField(cl_ord_id)
            id_val = cl_ord_id.getValue()
            
            if id_val == oid:
                msg.getField(ord_status)
                status = ord_status.getValue()
                
                msg.getField(leaves_qty)
                leaves = leaves_qty.getValue()
                
                if status == fix.OrdStatus_PARTIALLY_FILLED and leaves == expected_leaves:
                    logger.info(f"Verified PARTIAL FILL for {oid}. Leaves: {leaves}")
                    found = True
                    break
        except:
            pass
            
    if not found:
        logger.error(f"FAILURE: Partial fill verification failed for {oid}")

def verify_full_fill(reports, oid):
    found = False
    cl_ord_id = fix.ClOrdID()
    ord_status = fix.OrdStatus()
    
    for msg in reports:
        try:
            msg.getField(cl_ord_id)
            id_val = cl_ord_id.getValue()
            
            if id_val == oid:
                msg.getField(ord_status)
                status = ord_status.getValue()
                
                if status == fix.OrdStatus_FILLED:
                    logger.info(f"Verified FULL FILL for {oid}")
                    found = True
                    break
        except:
            pass
            
    if not found:
        logger.error(f"FAILURE: Full fill verification failed for {oid}")

def verify_canceled(reports, oid):
    found = False
    cl_ord_id = fix.ClOrdID()
    ord_status = fix.OrdStatus()
    
    for msg in reports:
        try:
            msg.getField(cl_ord_id)
            id_val = cl_ord_id.getValue()
            
            if id_val == oid:
                msg.getField(ord_status)
                status = ord_status.getValue()
                
                if status == fix.OrdStatus_CANCELED:
                    logger.info(f"Verified CANCELED for {oid}")
                    found = True
                    break
        except:
            pass
            
    if not found:
        logger.error(f"FAILURE: Cancellation verification failed for {oid}")

if __name__ == "__main__":
    run_scenarios()
