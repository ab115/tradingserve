import quickfix as fix
import time
import argparse

class ClientApp(fix.Application):
    def onCreate(self, sessionID): print(f"Client Session Created: {sessionID}")
    def onLogon(self, sessionID): print(f"Client Logon: {sessionID}")
    def onLogout(self, sessionID): print(f"Client Logout: {sessionID}")
    def toAdmin(self, message, sessionID): pass
    def fromAdmin(self, message, sessionID): pass
    def toApp(self, message, sessionID): pass
    def fromApp(self, message, sessionID): print(f"Client Msg Received: {message}")

def main():
    cfg = "client.cfg"
    settings = fix.SessionSettings(cfg)
    app = ClientApp()
    storeFactory = fix.FileStoreFactory(settings)
    logFactory = fix.FileLogFactory(settings)
    initiator = fix.SocketInitiator(app, storeFactory, settings, logFactory)
    
    initiator.start()
    print("Waiting for logon...")
    time.sleep(2) 
    
    # Send an order
    msg = fix.Message()
    msg.getHeader().setField(fix.BeginString("FIX.4.2"))
    msg.getHeader().setField(fix.MsgType("D")) # NewOrderSingle
    
    msg.setField(fix.ClOrdID(f"ORD_{int(time.time())}"))
    msg.setField(fix.HandlInst("1"))
    msg.setField(fix.Symbol("AAPL"))
    msg.setField(fix.Side("1")) # Buy
    msg.setField(fix.TransactTime())
    msg.setField(fix.OrdType("2")) # Limit
    msg.setField(fix.Price(150.50))
    
    # We need to construct SessionID matching the config
    session_id = fix.SessionID("FIX.4.2", "CLIENT2", "ECNGATEWAY")
    fix.Session.sendToTarget(msg, session_id)
    print("Order Sent")
    
    time.sleep(3)
    initiator.stop()

if __name__ == "__main__":
    main()
