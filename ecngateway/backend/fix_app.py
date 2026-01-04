
import quickfix as fix
import logging
import json
from redis_storage import RedisStorage
from msg_producer import MsgProducer

class FIXApp(fix.Application):
    def __init__(self):
        super().__init__()
        self.redis = RedisStorage()
        self.producer = MsgProducer()
        self.logger = logging.getLogger("FIXApp")
        self.logger.setLevel(logging.INFO)
        # Create a console handler if root logger isn't configured, or rely on main config
        # Simply using print for now to ensure visibility if logging not setup
    
    def onCreate(self, sessionID):
        print(f"Session Created: {sessionID}")

    def onLogon(self, sessionID):
        print(f"Logon: {sessionID}")
        # Could persist status
        self.redis.store_session_message(str(sessionID), "Logon", {"status": "Logged On"})
        self.producer.publish_session_msg("Logon", str(sessionID), {"status": "Logged On"})

    def onLogout(self, sessionID):
        print(f"Logout: {sessionID}")
        # Persist
        self.redis.store_session_message(str(sessionID), "Logout", {"status": "Logged Out"})
        self.producer.publish_session_msg("Logout", str(sessionID), {"status": "Logged Out"})

    def toAdmin(self, message, sessionID):
        pass

    def fromAdmin(self, message, sessionID):
        msg_type = fix.MsgType()
        message.getHeader().getField(msg_type)
        mtype = msg_type.getValue()
        
        # Log Heartbeats and other admin messages
        if mtype == fix.MsgType_Heartbeat:
             self._handle_session_msg(message, sessionID, "Heartbeat")
        elif mtype == fix.MsgType_Logon:
             self._handle_session_msg(message, sessionID, "Logon")
        elif mtype == fix.MsgType_Logout:
             self._handle_session_msg(message, sessionID, "Logout")
        elif mtype == fix.MsgType_Reject:
             self._handle_session_msg(message, sessionID, "Reject")
        
    def toApp(self, message, sessionID):
        pass

    def fromApp(self, message, sessionID):
        msg_type = fix.MsgType()
        message.getHeader().getField(msg_type)
        mtype = msg_type.getValue()

        # Debug specific sessions
        if "MARKETMAKER" in str(sessionID):
             print(f"DEBUG: fromApp {sessionID} MsgType={mtype}")

        if mtype == fix.MsgType_NewOrderSingle:
            self._handle_new_order(message, sessionID)
        elif mtype == fix.MsgType_OrderCancelRequest:
            self._handle_cancel_request(message, sessionID)
        elif mtype == fix.MsgType_OrderCancelReplaceRequest:
            self._handle_replace_request(message, sessionID)
        else:
            print(f"Received unknown app message: {mtype}")

    def _extract_raw_tag(self, raw_msg, tag):
        # Format: <SOH>{tag}={value}<SOH>
        # OR start of string {tag}={value}<SOH>
        # SOH is \x01
        try:
            # Simple manual parse from toString() output
            # QuickFIX toString() usually uses \x01
            # But the Redis content showed spaces? No, likely terminal representation.
            # We will try robust search.
            search_key = f"{tag}="
            start = raw_msg.find("\x01" + search_key)
            if start == -1:
                if raw_msg.startswith(search_key):
                    start = 0
                else: 
                    # Try looking for just tag= if SOH is messed up
                    start = raw_msg.find(search_key)
                    # This is risky if tag is suffix of another value, e.g. 155=
                    # But for 55 and 54 it's reasonably safe if we check predecessor
                    
            if start != -1:
                # Adjust start to value
                val_start = start + len(search_key)
                if raw_msg[start:start+1] == "\x01": val_start += 1
                
                # Find End (SOH)
                end = raw_msg.find("\x01", val_start)
                if end != -1:
                    return raw_msg[val_start:end]
        except:
             pass
        return None

    def _msg_to_dict(self, message):
        """Helper to convert a FIX message to a dictionary for simple storage."""
        # ... (same as before) ...
        d = {}
        d['raw'] = message.toString()
        
        # Extract Standard Header Fields
        header = message.getHeader()
        d['SendingTime'] = self._get_field(header, fix.SendingTime())
        d['TargetCompID'] = self._get_field(header, fix.TargetCompID())
        d['SenderCompID'] = self._get_field(header, fix.SenderCompID())
        d['MsgSeqNum'] = self._get_field(header, fix.MsgSeqNum())
        
        return d

    def _get_field(self, message_or_header, field_obj):
        try:
            message_or_header.getField(field_obj)
            if hasattr(field_obj, 'getString'):
                return str(field_obj.getString())
            return str(field_obj.getValue())
        except fix.FieldNotFound:
            return None

    def _handle_session_msg(self, message, sessionID, msg_name):
        data = self._msg_to_dict(message)
        # Store
        self.redis.store_session_message(str(sessionID), msg_name, data)
        self.producer.publish_session_msg(msg_name, str(sessionID), data)

    def _handle_new_order(self, message, sessionID):
        try:
            data = self._msg_to_dict(message)
            
            # Extract specific NewOrderSingle fields
            cl_ord_id = fix.ClOrdID()
            symbol = fix.Symbol()
            side = fix.Side()
            ord_qty = fix.OrderQty()
            price = fix.Price()
            ord_type = fix.OrdType()
            transact_time = fix.TransactTime()
            
            data['ClOrdID'] = self._get_field(message, cl_ord_id)
            
            # Symbol Fallback
            sym = self._get_field(message, symbol)
            if not sym: sym = self._extract_raw_tag(data['raw'], "55")
            data['Symbol'] = sym
            
            # Side Fallback
            val_side = self._get_field(message, side)
            if not val_side: val_side = self._extract_raw_tag(data['raw'], "54")
            
            data['Side'] = "Buy" if val_side == "1" else "Sell"
            if not val_side: data['Side'] = "Unknown" # Cleaner than default Sell?

            data['OrderQty'] = self._get_field(message, ord_qty)
            data['Price'] = self._get_field(message, price)
            data['OrdType'] = self._get_field(message, ord_type)
            data['TransactTime'] = self._get_field(message, transact_time)
            
            # Determine an internal Order ID (or use ClOrdID)
            order_id = data.get('ClOrdID')
            
            print(f"New Order Received: {order_id} {data['Symbol']}")
            self.redis.store_session_message(str(sessionID), "NewOrder", data) # Log event

            # Store
            if order_id:
                self.redis.store_order(order_id, data)
                self.producer.publish_order(data)
                
                # Send Acknowledgement (ExecReport - New)
                report_data = {
                    'TargetCompID': data.get('SenderCompID'), # Send back to sender
                    'SenderCompID': data.get('TargetCompID'),
                    'OrderID': order_id,
                    'ClOrdID': data.get('ClOrdID'),
                    'ExecID': f"EXEC-{order_id}-NEW",
                    'Symbol': data.get('Symbol'),
                    'Side': data.get('Side'),
                    'OrdStatus': 'New',
                    'ExecType': 'New',
                    'LeavesQty': data.get('OrderQty'),
                    'CumQty': 0,
                    'AvgPx': 0
                }
                self.send_execution_report(report_data)
                
        except Exception as e:
            print(f"ERROR processing New Order: {e}")
            import traceback
            traceback.print_exc()

    def _handle_cancel_request(self, message, sessionID):
        data = self._msg_to_dict(message)
        orig_cl_ord_id = fix.OrigClOrdID()
        cl_ord_id = fix.ClOrdID()
        symbol = fix.Symbol()
        side = fix.Side()
        
        data['OrigClOrdID'] = self._get_field(message, orig_cl_ord_id)
        data['ClOrdID'] = self._get_field(message, cl_ord_id)
        
        sym = self._get_field(message, symbol)
        if not sym: sym = self._extract_raw_tag(data['raw'], "55")
        data['Symbol'] = sym
        
        val_side = self._get_field(message, side)
        if not val_side: val_side = self._extract_raw_tag(data['raw'], "54")
        
        if val_side:
             data['Side'] = "Buy" if val_side == "1" else "Sell"
             
        data['RequestType'] = 'Cancel'
        data['TransactTime'] = self._get_field(message, fix.TransactTime())
        
        print(f"Cancel Request: {data['ClOrdID']} for {data['OrigClOrdID']}")
        
        self.redis.store_order(f"cancel_{data['ClOrdID']}", data)
        self.producer.publish_order(data)

    def _handle_replace_request(self, message, sessionID):
        data = self._msg_to_dict(message)
        orig_cl_ord_id = fix.OrigClOrdID()
        cl_ord_id = fix.ClOrdID()
        price = fix.Price()
        qty = fix.OrderQty()
        symbol = fix.Symbol()
        side = fix.Side()
        
        data['OrigClOrdID'] = self._get_field(message, orig_cl_ord_id)
        data['ClOrdID'] = self._get_field(message, cl_ord_id)
        data['Price'] = self._get_field(message, price)
        data['OrderQty'] = self._get_field(message, qty)
        
        sym = self._get_field(message, symbol)
        if not sym: sym = self._extract_raw_tag(data['raw'], "55")
        data['Symbol'] = sym
        
        val_side = self._get_field(message, side)
        if not val_side: val_side = self._extract_raw_tag(data['raw'], "54")
        
        if val_side:
             data['Side'] = "Buy" if val_side == "1" else "Sell"
             
        data['RequestType'] = 'Replace'
        data['TransactTime'] = self._get_field(message, fix.TransactTime())
        
        print(f"Replace Request: {data['ClOrdID']} for {data['OrigClOrdID']} ({data.get('Symbol')})")
        
        self.redis.store_order(f"replace_{data['ClOrdID']}", data)
        self.producer.publish_order(data)

    def send_execution_report(self, report_data):
        """
        Construct and send an Execution Report via FIX.
        report_data expected to be a dict matching the ExecutionReport model.
        """
        try:
            print(f"DEBUG REPORT DATA: {report_data}")
            # 1. Extract Routing IDs
            target_comp_id = report_data.get('TargetCompID') # e.g. CLIENT2
            sender_comp_id = report_data.get('SenderCompID') # e.g. ECNGATEWAY
            
            # 2. Create Message
            msg = fix.Message()
            msg.getHeader().setField(fix.BeginString("FIX.4.2"))
            msg.getHeader().setField(fix.MsgType(fix.MsgType_ExecutionReport))
            
            # 3. Populate Fields
            msg.setField(fix.OrderID(str(report_data.get('OrderID'))))
            msg.setField(fix.ClOrdID(str(report_data.get('ClOrdID'))))
            msg.setField(fix.ExecID(str(report_data.get('ExecID'))))
            msg.setField(fix.Symbol(str(report_data.get('Symbol'))))
            
            side_str = report_data.get('Side')
            side_val = fix.Side_BUY if side_str == 'Buy' else fix.Side_SELL
            msg.setField(fix.Side(side_val))
            
            # Map Status
            status_map = {
                'New': fix.OrdStatus_NEW,
                'PartiallyFilled': fix.OrdStatus_PARTIALLY_FILLED,
                'Filled': fix.OrdStatus_FILLED,
                'Canceled': fix.OrdStatus_CANCELED,
                'Rejected': fix.OrdStatus_REJECTED
            }
            ord_status = status_map.get(report_data.get('OrdStatus'), fix.OrdStatus_NEW)
            msg.setField(fix.OrdStatus(ord_status))
            
            # Map ExecType
            exec_map = {
                'New': fix.ExecType_NEW,
                'PartialFill': fix.ExecType_PARTIAL_FILL,
                'Fill': fix.ExecType_FILL,
                'Canceled': fix.ExecType_CANCELED,
                'Rejected': fix.ExecType_REJECTED
            }
            exec_type = exec_map.get(report_data.get('ExecType'), fix.ExecType_NEW)
            msg.setField(fix.ExecType(exec_type))
            
            # MANDATORY for FIX 4.2
            # Debugging: Using literal '0' (New) to avoid potential AttributeErrors
            # msg.setField(fix.ExecTransType(fix.ExecTransType_NEW)) 
            msg.setField(fix.ExecTransType('0'))
            
            # We need correct session. Sender=ECNGATEWAY, Target=CLIENT2
            session_id = fix.SessionID("FIX.4.2", sender_comp_id, target_comp_id)
            print(f"DEBUG: ExecReport Built. Sending to {session_id}...")
            
            msg.setField(fix.LeavesQty(float(report_data.get('LeavesQty', 0))))
            
            msg.setField(fix.LeavesQty(float(report_data.get('LeavesQty', 0))))
            msg.setField(fix.CumQty(float(report_data.get('CumQty', 0))))
            msg.setField(fix.AvgPx(float(report_data.get('AvgPx', 0))))
            
            # CRITICAL: Market Maker needs these for position updates
            # MAPPING FIX: Matching Engine sends 'LastQty', not 'LastShares'
            last_qty = report_data.get('LastQty') or report_data.get('LastShares') or 0
            msg.setField(fix.LastShares(int(float(last_qty))))
            msg.setField(fix.LastPx(float(report_data.get('LastPx', 0) or report_data.get('AvgPx', 0)))) # LastPx/AvgPx often same for single fill
                        
            msg.setField(fix.TransactTime())
            
            # 4. Send
            # 4. Send
            
            print(f"DEBUG: Sending RAW MSG: {msg.toString()}")
            fix.Session.sendToTarget(msg, session_id)
            print(f"Sent Execution Report to {target_comp_id}: {report_data.get('OrdStatus')}")
            
            # --- PERSISTENCE FOR UI ---
            # Update the order in Redis so the Blotter sees the fill status
            # We map 'OrdStatus' to 'Status' for the UI convenience
            ui_data = report_data.copy()
            ui_data['Status'] = report_data.get('OrdStatus') # e.g. "Filled", "PartiallyFilled"
            ui_data['MsgType'] = '8' # Execution Report
            
            # Use ClOrdID as key. 
            # Note: For strict event sourcing we might want a separate key or list, 
            # but for this status-snapshot blotter, updating the specific ClOrdID is best.
            if ui_data.get('ClOrdID'):
                self.redis.store_order(str(ui_data['ClOrdID']), ui_data)
            # --------------------------
            
        except Exception as e:
            print(f"Failed to send execution report: {e}")


