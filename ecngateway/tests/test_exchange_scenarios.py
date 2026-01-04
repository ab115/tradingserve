import quickfix as fix
import time
import sys
import logging

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class CapturingClientApp(fix.Application):
    def __init__(self):
        super().__init__()
        self.received_messages = []
        self.session_id = None
        self.is_logged_on = False

    def onCreate(self, sessionID): 
        logger.info(f"Session Created: {sessionID}")
        self.session_id = sessionID

    def onLogon(self, sessionID): 
        logger.info(f"Logon: {sessionID}")
        self.is_logged_on = True

    def onLogout(self, sessionID): 
        logger.info(f"Logout: {sessionID}")
        self.is_logged_on = False

    def toAdmin(self, message, sessionID): pass
    def fromAdmin(self, message, sessionID): 
        logger.info(f"<< Admin: {message}")
    def toApp(self, message, sessionID): 
        logger.debug(f">> {message}")

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

class ExchangeTester:
    def __init__(self, session_id):
        self.session_id = session_id
        self.counter = int(time.time())

    def _gen_id(self):
        self.counter += 1
        return f"TEST_{self.counter}"

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

def main():
    try:
        cfg = "client.cfg"
        settings = fix.SessionSettings(cfg)
        app = CapturingClientApp()
        storeFactory = fix.FileStoreFactory(settings)
        logFactory = fix.FileLogFactory(settings)
        initiator = fix.SocketInitiator(app, storeFactory, settings, logFactory)
        
        initiator.start()
        logger.info("Waiting for logon...")
        
        # Wait for logon
        timeout = 10
        while not app.is_logged_on and timeout > 0:
            time.sleep(1)
            timeout -= 1
            
        if not app.is_logged_on:
            logger.error("Failed to login in time.")
            sys.exit(1)
            
        tester = ExchangeTester(app.session_id)
        symbol = "TSLA"
        
        # 1. Place Buy Limit Order
        logger.info("--- Step 1: Place Buy Limit 100 @ 10.0 ---")
        buy_id = tester.send_limit_order(symbol, fix.Side_BUY, 100, 10.0)
        time.sleep(2)
        
        # Verify PendingNew/New? (Exchange might not send New if resting, but we expect Ack)
        # For simplicity, we assume Exchange is 'quiet' until match or we just check Fill later.
        
        # 2. Place Sell Limit Order (Atomic Match)
        logger.info("--- Step 2: Place Sell Limit 150 @ 9.0 ---")
        sell_id = tester.send_limit_order(symbol, fix.Side_SELL, 150, 9.0)
        time.sleep(5) # Wait for Redis -> Match -> Kafka -> ECN -> FIX
        
        # 3. Verify Fills
        reports = app.get_execution_reports()
        
        buy_filled = False
        sell_filled = False
        
        for msg in reports:
            # Check fields
            # ClOrdID
            cl_ord_id = fix.ClOrdID()
            msg.getField(cl_ord_id)
            oid = cl_ord_id.getValue()
            
            # OrdStatus
            ord_status = fix.OrdStatus()
            msg.getField(ord_status)
            status = ord_status.getValue()
            
            # ExecType
            exec_type = fix.ExecType()
            msg.getField(exec_type)
            etype = exec_type.getValue()
            
            logger.info(f"Report: OrderID={oid} Status={status} ExecType={etype}")
            
            if oid == buy_id and status == fix.OrdStatus_FILLED:
                buy_filled = True
            if oid == sell_id and status == fix.OrdStatus_FILLED:
                sell_filled = True
                
        if buy_filled and sell_filled:
            logger.info("SUCCESS: Both orders filled!")
        else:
            logger.error(f"FAILURE: BuyFilled={buy_filled}, SellFilled={sell_filled}")
            sys.exit(1)

        initiator.stop()
        
    except Exception as e:
        logger.error(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
