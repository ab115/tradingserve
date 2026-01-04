import sys
import time
import quickfix as fix
import logging
import uuid

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("SelfMatchTest")

class TestApp(fix.Application):
    def __init__(self):
        super().__init__()
        self.sessionID = None
        self.order_ids = []
        self.exec_reports = []

    def onCreate(self, sessionID): 
        logger.info(f"Session Created: {sessionID}")

    def onLogon(self, sessionID): 
        logger.info(f"Logon: {sessionID}")
        self.sessionID = sessionID

    def onLogout(self, sessionID): 
        logger.info(f"Logout: {sessionID}")

    def toAdmin(self, message, sessionID): pass
    def fromAdmin(self, message, sessionID): pass
    def toApp(self, message, sessionID): pass
    
    def fromApp(self, message, sessionID):
        # Capture Execution Reports
        msgType = fix.MsgType()
        message.getHeader().getField(msgType)
        if msgType.getValue() == "8": # ExecReport
            clOrdID = fix.ClOrdID()
            ordStatus = fix.OrdStatus()
            text = fix.Text()
            
            message.getField(clOrdID)
            message.getField(ordStatus)
            txt = ""
            if message.isSetField(text):
                message.getField(text)
                txt = text.getValue()
                
            data = {
                "ClOrdID": clOrdID.getValue(),
                "OrdStatus": ordStatus.getValue(),
                "Text": txt
            }
            logger.info(f"Received ExecReport: {data}")
            self.exec_reports.append(data)

    def send_order(self, symbol, side, qty, price, cl_ord_id):
        msg = fix.Message()
        msg.getHeader().setField(fix.BeginString("FIX.4.2"))
        msg.getHeader().setField(fix.MsgType(fix.MsgType_NewOrderSingle))
        
        msg.setField(fix.ClOrdID(cl_ord_id))
        msg.setField(fix.HandlInst(fix.HandlInst_MANUAL_ORDER_BEST_EXECUTION))
        msg.setField(fix.Symbol(symbol))
        msg.setField(fix.Side(side))
        msg.setField(fix.TransactTime())
        msg.setField(fix.OrdType(fix.OrdType_LIMIT))
        msg.setField(fix.Price(float(price)))
        msg.setField(fix.OrderQty(float(qty)))
        
        fix.Session.sendToTarget(msg, self.sessionID)
        return cl_ord_id

def run_test():
    try:
        cfg = "client.cfg"
        settings = fix.SessionSettings(cfg)
        app = TestApp()
        storeFactory = fix.FileStoreFactory(settings)
        logFactory = fix.FileLogFactory(settings)
        
        initiator = fix.SocketInitiator(app, storeFactory, settings, logFactory)
        initiator.start()
        
        logger.info("Waiting for Logon...")
        timeout = 10
        while timeout > 0:
            if app.sessionID: break
            time.sleep(1)
            timeout -= 1
            
        if not app.sessionID:
            logger.error("Failed to logon. Exiting.")
            sys.exit(1)
            
        # 1. Send Buy Limit @ 100
        id1 = f"BUY_{uuid.uuid4().hex[:4]}"
        logger.info(f"Sending Buy Order {id1} @ 100.00")
        app.send_order("SM_TEST", fix.Side_BUY, 10, 100.00, id1)
        
        time.sleep(2) # Wait for Ack/Rest
        
        # 2. Send Sell Limit @ 99 (Crosses Buy)
        # Should TRIGGER Self-Match Prevention (Cancel Resting Buy)
        id2 = f"SELL_{uuid.uuid4().hex[:4]}"
        logger.info(f"Sending Sell Order {id2} @ 99.00 (Aggressive)")
        app.send_order("SM_TEST", fix.Side_SELL, 10, 99.00, id2)
        
        time.sleep(2) # Wait for reports
        
        initiator.stop()
        
        # 3. Analyze Results
        logger.info("Analyzing Results...")
        
        buy_cancelled = False
        sell_filled = False
        buy_filled = False
        
        for rep in app.exec_reports:
            if rep['ClOrdID'] == id1:
                # 4=Canceled
                if rep['OrdStatus'] == '4':
                    logger.info("SUCCESS: Buy Order was Canceled.")
                    if "Self-Match" in rep['Text']:
                        logger.info(f"Reason validated: {rep['Text']}")
                    buy_cancelled = True
                elif rep['OrdStatus'] == '1' or rep['OrdStatus'] == '2':
                    logger.error("FAILURE: Buy Order was Filled!")
                    buy_filled = True
                    
            if rep['ClOrdID'] == id2:
                if rep['OrdStatus'] == '1' or rep['OrdStatus'] == '2':
                    logger.error("FAILURE: Sell Order was Filled!")
                    sell_filled = True
        
        if buy_cancelled and not buy_filled and not sell_filled:
            logger.info("TEST PASSED: Self-Match Prevention worked.")
            sys.exit(0)
        else:
            logger.error("TEST FAILED: Assertions not met.")
            sys.exit(1)

    except Exception as e:
        logger.error(f"Test Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_test()
