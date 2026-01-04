import sys
import time
import quickfix as fix
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ForceFill")

class ForceFillApp(fix.Application):
    def onCreate(self, sessionID): logger.info(f"Session Created: {sessionID}")
    def onLogon(self, sessionID): logger.info(f"Logon: {sessionID}")
    def onLogout(self, sessionID): logger.info(f"Logout: {sessionID}")
    def toAdmin(self, message, sessionID): pass
    def fromAdmin(self, message, sessionID): pass
    def toApp(self, message, sessionID): pass
    def fromApp(self, message, sessionID): pass

def run():
    try:
        settings = fix.SessionSettings("client.cfg")
        app = ForceFillApp()
        storeFactory = fix.FileStoreFactory(settings)
        logFactory = fix.FileLogFactory(settings)
        initiator = fix.SocketInitiator(app, storeFactory, settings, logFactory)
        initiator.start()
        
        # Session for CLIENT2
        session_id = fix.SessionID("FIX.4.2", "CLIENT2", "ECNGATEWAY")
        
        time.sleep(2) # Wait for logon
        
        # Send Buy Limit @ 1000 for GOOG (Way above MM Ask of ~315)
        logger.info("Sending Force Buy Order...")
        msg = fix.Message()
        msg.getHeader().setField(fix.BeginString("FIX.4.2"))
        msg.getHeader().setField(fix.MsgType(fix.MsgType_NewOrderSingle))
        msg.setField(fix.ClOrdID(f"FORCE_{int(time.time())}"))
        msg.setField(fix.HandlInst(fix.HandlInst_MANUAL_ORDER_BEST_EXECUTION))
        msg.setField(fix.Symbol("AAPL"))
        msg.setField(fix.Side(fix.Side_BUY))
        msg.setField(fix.TransactTime())
        msg.setField(fix.OrdType(fix.OrdType_LIMIT))
        msg.setField(fix.Price(1000.0))
        msg.setField(fix.OrderQty(10.0))
        
        fix.Session.sendToTarget(msg, session_id)
        
        time.sleep(5)
        initiator.stop()
        
    except Exception as e:
        logger.error(e)

if __name__ == "__main__":
    run()
