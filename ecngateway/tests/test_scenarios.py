import quickfix as fix
import time
import sys
import random

class ClientApp(fix.Application):
    def onCreate(self, sessionID): print(f"Client Session Created: {sessionID}")
    def onLogon(self, sessionID): print(f"Client Logon: {sessionID}")
    def onLogout(self, sessionID): print(f"Client Logout: {sessionID}")
    def toAdmin(self, message, sessionID): pass
    def fromAdmin(self, message, sessionID): pass
    def toApp(self, message, sessionID): print(f">> Outgoing: {message}")
    def fromApp(self, message, sessionID): print(f"<< Incoming: {message}")

class TestScenarios:
    def __init__(self, session_id):
        self.session_id = session_id
        self.prefix = f"TEST_{int(time.time())}"
        self.counter = 0

    def _gen_id(self):
        self.counter += 1
        return f"{self.prefix}_{self.counter}"

    def send_market_order(self, symbol, side, qty):
        print(f"\n[Scenario] Market Order {symbol} {side} Qty={qty}")
        msg = fix.Message()
        msg.getHeader().setField(fix.BeginString("FIX.4.2"))
        msg.getHeader().setField(fix.MsgType(fix.MsgType_NewOrderSingle))
        
        cl_ord_id = self._gen_id()
        msg.setField(fix.ClOrdID(cl_ord_id))
        msg.setField(fix.HandlInst(fix.HandlInst_MANUAL_ORDER_BEST_EXECUTION))
        msg.setField(fix.Symbol(symbol))
        msg.setField(fix.Side(side))
        msg.setField(fix.TransactTime())
        msg.setField(fix.OrdType(fix.OrdType_MARKET))
        msg.setField(fix.OrderQty(float(qty)))
        
        fix.Session.sendToTarget(msg, self.session_id)
        return cl_ord_id

    def send_limit_order(self, symbol, side, qty, price):
        print(f"\n[Scenario] Limit Order {symbol} {side} Qty={qty} Price={price}")
        msg = fix.Message()
        msg.getHeader().setField(fix.BeginString("FIX.4.2"))
        msg.getHeader().setField(fix.MsgType(fix.MsgType_NewOrderSingle))
        
        cl_ord_id = self._gen_id()
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

    def cancel_order(self, orig_cl_ord_id, symbol, side):
        print(f"\n[Scenario] Cancel Order {orig_cl_ord_id}")
        msg = fix.Message()
        msg.getHeader().setField(fix.BeginString("FIX.4.2"))
        msg.getHeader().setField(fix.MsgType(fix.MsgType_OrderCancelRequest))
        
        cl_ord_id = self._gen_id()
        msg.setField(fix.OrigClOrdID(orig_cl_ord_id))
        msg.setField(fix.ClOrdID(cl_ord_id))
        msg.setField(fix.Symbol(symbol))
        msg.setField(fix.Side(side))
        msg.setField(fix.TransactTime())
        
        fix.Session.sendToTarget(msg, self.session_id)
        return cl_ord_id

    def replace_order(self, orig_cl_ord_id, symbol, side, new_qty, new_price):
        print(f"\n[Scenario] Replace Order {orig_cl_ord_id} -> Qty={new_qty} Price={new_price}")
        msg = fix.Message()
        msg.getHeader().setField(fix.BeginString("FIX.4.2"))
        msg.getHeader().setField(fix.MsgType(fix.MsgType_OrderCancelReplaceRequest))
        
        cl_ord_id = self._gen_id()
        msg.setField(fix.OrigClOrdID(orig_cl_ord_id))
        msg.setField(fix.ClOrdID(cl_ord_id))
        msg.setField(fix.HandlInst(fix.HandlInst_MANUAL_ORDER_BEST_EXECUTION))
        msg.setField(fix.Symbol(symbol))
        msg.setField(fix.Side(side))
        msg.setField(fix.TransactTime())
        msg.setField(fix.OrdType(fix.OrdType_LIMIT))
        msg.setField(fix.OrderQty(float(new_qty)))
        msg.setField(fix.Price(float(new_price)))
        
        fix.Session.sendToTarget(msg, self.session_id)
        return cl_ord_id

def main():
    try:
        cfg = "client.cfg"
        settings = fix.SessionSettings(cfg)
        app = ClientApp()
        storeFactory = fix.FileStoreFactory(settings)
        logFactory = fix.FileLogFactory(settings)
        initiator = fix.SocketInitiator(app, storeFactory, settings, logFactory)
        
        initiator.start()
        print("Waiting for logon...")
        time.sleep(3)
        
        # Hardcoding session from known config state or attempting to infer?
        # User changed it to CLIENT2 recently.
        session_id = fix.SessionID("FIX.4.2", "CLIENT2", "ECNGATEWAY")
        
        scenarios = TestScenarios(session_id)
        
        # 1. Market Buy AAPL
        scenarios.send_market_order("AAPL", fix.Side_BUY, 100)
        time.sleep(1)

        # 2. Limit Sell MSFT
        scenarios.send_limit_order("MSFT", fix.Side_SELL, 50, 350.25)
        time.sleep(1)

        # 3. Create and Cancel
        oid_to_cancel = scenarios.send_limit_order("IBM", fix.Side_BUY, 1000, 140.00)
        time.sleep(1)
        scenarios.cancel_order(oid_to_cancel, "IBM", fix.Side_BUY)
        time.sleep(1)

        # 4. Create and Replace (Amend)
        oid_to_amend = scenarios.send_limit_order("TSLA", fix.Side_SELL, 20, 250.00)
        time.sleep(1)
        scenarios.replace_order(oid_to_amend, "TSLA", fix.Side_SELL, 25, 255.50)
        time.sleep(2)

        print("\nAll Scenarios Executed.")
        initiator.stop()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
