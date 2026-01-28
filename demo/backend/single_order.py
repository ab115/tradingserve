import argparse
import quickfix as fix
import time
import sys

class SingleOrderApp(fix.Application):
    def __init__(self, symbol, side, qty, order_type, price):
        super().__init__()
        self.symbol = symbol
        self.side = side
        self.qty = qty
        self.order_type = order_type
        self.price = price
        self.sessionID = None
        self.order_sent = False

    def onCreate(self, sessionID):
        self.sessionID = sessionID

    def onLogon(self, sessionID):
        print(f"Logon - {sessionID}")
        self.send_order()

    def onLogout(self, sessionID):
        print(f"Logout - {sessionID}")

    def toAdmin(self, message, sessionID):
        pass

    def fromAdmin(self, message, sessionID):
        pass

    def toApp(self, message, sessionID):
        print(f"Sending: {message}")

    def fromApp(self, message, sessionID):
        print(f"Received: {message}")

    def send_order(self):
        if self.order_sent:
            return

        msg = fix.Message()
        msg.getHeader().setField(fix.BeginString(fix.BeginString_FIX44))
        msg.getHeader().setField(fix.MsgType(fix.MsgType_NewOrderSingle))

        msg.setField(fix.ClOrdID(f"DEMO-{int(time.time())}"))
        msg.setField(fix.Symbol(self.symbol))
        msg.setField(fix.Side(fix.Side_BUY if self.side.lower() == 'buy' else fix.Side_SELL))
        msg.setField(fix.OrderQty(float(self.qty)))
        
        if self.order_type.lower() == 'market':
            msg.setField(fix.OrdType(fix.OrdType_MARKET))
        else:
            msg.setField(fix.OrdType(fix.OrdType_LIMIT))
            msg.setField(fix.Price(float(self.price)))

        msg.setField(fix.HandlInst(fix.HandlInst_AUTOMATED_EXECUTION_ORDER_PRIVATE_NO_BROKER_INTERVENTION))
        msg.setField(fix.TransactTime())

        fix.Session.sendToTarget(msg, self.sessionID)
        self.order_sent = True
        print("Order Sent")
        # Allow some time for socket write before exit
        time.sleep(2)
        sys.exit(0)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--symbol', required=True)
    parser.add_argument('--side', required=True)
    parser.add_argument('--qty', required=True)
    parser.add_argument('--type', required=True)
    parser.add_argument('--price', default=0.0)
    parser.add_argument('--cfg', required=True)
    
    args = parser.parse_args()
    
    settings = fix.SessionSettings(args.cfg)
    app = SingleOrderApp(args.symbol, args.side, args.qty, args.type, args.price)
    storeFactory = fix.FileStoreFactory(settings)
    logFactory = fix.ScreenLogFactory(settings)
    initiator = fix.SocketInitiator(app, storeFactory, settings, logFactory)
    
    initiator.start()
    # Wait loop handled by sys.exit in send_order
    time.sleep(10)
    initiator.stop()
