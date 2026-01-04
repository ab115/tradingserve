import socket
import threading
import time
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# FIX Constants
SOH = chr(1)
BEGIN_STRING = "FIX.4.2"

class FIXClient:
    """
    A Raw TCP/IP Client for FIX 4.2.
    Acting as a "Market Maker" connecting to an ECN.
    """
    def __init__(self, host: str, port: int, sender_comp_id: str, target_comp_id: str, on_fill_callback=None, on_activity_callback=None):
        self.host = host
        self.port = port
        self.sender = sender_comp_id
        self.target = target_comp_id
        self.on_fill = on_fill_callback
        self.on_activity = on_activity_callback
        
        self.sock = None
        self.running = False
        self.msg_seq_num = 1
        
        # State: {symbol: {side: {'cl_ord_id': str, 'price': float, 'qty': int}}}
        self.active_orders = {} 
        self.lock = threading.Lock()

    def _reader_loop(self):
        """
        Reads from socket, parses FIX messages, and handles state updates.
        """
        buffer = ""
        while self.running:
            try:
                # CRITICAL: If socket is None (e.g. set by Sender on BrokenPipe), we must Reconnect!
                if not self.sock:
                    logger.warning("Socket found Disconnected (None). Reconnecting...")
                    self._reconnect()
                    continue

                data = self.sock.recv(4096)
                if not data:
                    logger.warning("Socket disconnected (EOF). Reconnecting...")
                    self._reconnect()
                    continue
                
                decoded_data = data.decode('ascii', errors='ignore')
                buffer += decoded_data
                # DEBUGGING: Show raw feed again to prove arrival
                logger.warning(f"RAW RECV ({len(data)} bytes): {repr(decoded_data)}")

                if "35=8" in buffer: # Simple peep
                     logger.warning(f"Reader sees ExecReport in buffer! (BufLen: {len(buffer)})")
                
                while True:
                    # Find start of message (8=FIX)
                    start = buffer.find("8=FIX")
                    if start == -1:
                        # Keep last few bytes just in case split tag
                        if len(buffer) > 20: buffer = buffer[-20:]
                        break
                    
                    # Look for End (10=XXX<SOH>)
                    end_tag = f"{SOH}10="
                    checksum_idx = buffer.find(end_tag, start)
                    
                    if checksum_idx == -1:
                        break # Wait for more data
                        
                    # 10=XXX<SOH> is 1+3+3+1 = 8 chars usually (SOH 1 0 = X X X SOH)
                    end_msg = buffer.find(SOH, checksum_idx + 1)
                    if end_msg == -1:
                        break # Wait for more data
                        
                    raw_msg = buffer[start:end_msg+1]
                    buffer = buffer[end_msg+1:]
                    
                    self._process_fix_message(raw_msg)
                     
            except socket.timeout:
                # Just a heartbeat check essentially, loop back
                continue
            except OSError as e:
                 logger.error(f"Socket error ({type(e).__name__}: {e}). Reconnecting...")
                 self._reconnect()
            except Exception as e:
                logger.error(f"Reader Error: {e}")
                time.sleep(1)

    def _process_fix_message(self, raw_msg: str):
        # 1. Parse into Dict
        fields = {}
        for pair in raw_msg.split(SOH):
            if '=' in pair:
                tag, val = pair.split('=', 1)
                fields[tag] = val
        
        msg_type = fields.get('35')
        
        # 2. Handle Types
        if msg_type == '0': # Heartbeat
            pass # Alive
        elif msg_type == '1': # Test Request
            self._send_fix_msg("0", {"112": fields.get('112', 'TEST')})
        elif msg_type == '5': # Logout
            logger.warning("Recv Logout from ECN.")
        elif msg_type == '8': # Execution Report
            logger.info("Dispatching Execution Report...")
            self._handle_execution_report(fields)

    def _handle_execution_report(self, fields: dict):
        # Monitor Order Status!
        cl_ord_id = fields.get('11')
        ord_status = fields.get('39') # 0=New, 1=Partial, 2=Filled, 4=Canceled, 8=Rejected
        symbol = fields.get('55')
        side_val = fields.get('54') # 1=Buy, 2=Sell
        
        # Quantity Logic
        last_shares = fields.get('32')
        last_px = fields.get('31')
        
        side = "Buy" if side_val == "1" else "Sell"
        
        logger.info(f"EXEC REPORT: {symbol} {side} Status={ord_status} (ID: {cl_ord_id}) LastQty={last_shares} @ {last_px}")

        if self.on_activity:
            try:
                self.on_activity("EXEC_REPORT", {
                    "symbol": symbol, "side": side, "status": ord_status, 
                    "qty": int(last_shares or 0), "price": float(last_px or 0.0), "id": cl_ord_id,
                    "timestamp": time.time()
                })
            except: pass
        
        # Trigger Callback for Fills (Partial or Full)
        if ord_status in ['1', '2'] and last_shares and int(last_shares) > 0:
            logger.info(f"Triggering on_fill callback for {symbol} {side} Qty={last_shares}")
            if self.on_fill:
                try:
                    self.on_fill(symbol, side, int(last_shares), float(last_px or 0))
                except Exception as e:
                    logger.error(f"Callback Error: {e}")
        
        # If terminal state, remove from active_orders so we can requote
        if ord_status in ['2', '4', '8']: # Filled, Canceled, Rejected
            with self.lock:
                if symbol in self.active_orders:
                    # Check if this ClOrdID matches our current active one
                    # (Prevent race where we replaced it already)
                    current_client_id = self.active_orders[symbol].get(side, {}).get('cl_ord_id')
                    
                    if current_client_id == cl_ord_id:
                        logger.info(f"Order {cl_ord_id} is dead ({ord_status}). Clearing active state.")
                        del self.active_orders[symbol][side]

    def _reconnect(self):
        logger.info("Attempting Reconnect...")
        self.sock = None
        time.sleep(5)
        try:
            self.connect_socket()
        except Exception as e:
            logger.error(f"Reconnect failed: {e}")

    def connect_socket(self):
        with self.lock: # Reuse lock or new one? Using self.lock for state
            try:
                if self.sock: 
                    try:
                        self.sock.close()
                    except: 
                        pass
                self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                self.sock.settimeout(5.0) # Add timeout
                self.sock.connect((self.host, self.port))
                
                # Reset sequence on new connection for simplicity/stability
                self.msg_seq_num = 1
                
                # Immediate Logon (Reset Sequence Number to 1 to auto-recover)
                self._send_fix_msg_unsafe("A", {"98": "0", "108": "30", "141": "Y"})
                logger.info("Socket Connected & Logon Sent.")
            except Exception as e:
                self.sock = None
                raise e

    def connect(self):
        try:
            print(f"DEBUG: Connecting to {self.host}:{self.port}...")
            logger.info(f"Connecting to {self.host}:{self.port}...")
            self.connect_socket()
            self.running = True
            
            # Start threads
            threading.Thread(target=self._reader_loop, daemon=True).start()
            threading.Thread(target=self._heartbeat_loop, daemon=True).start()
            
            print("DEBUG: Connected & Logon Sent.")
            logger.info("Connected & Logon Sent.")
        except Exception as e:
            print(f"DEBUG: Initial Connection Failed: {e}")
            logger.error(f"Initial Connection Failed: {e}")
            # Ensure running is true so threads start and try to reconnect
            self.running = True
            threading.Thread(target=self._reader_loop, daemon=True).start()
            threading.Thread(target=self._heartbeat_loop, daemon=True).start()

    def _send_fix_msg(self, msg_type: str, fields: dict):
        with self.lock:
            self._send_fix_msg_unsafe(msg_type, fields)

    def _send_fix_msg_unsafe(self, msg_type: str, fields: dict):
        if not self.sock:
            return

        # 1. Standard Header
        body = []
        body.append(f"35={msg_type}")
        body.append(f"49={self.sender}")
        body.append(f"56={self.target}")
        body.append(f"34={self.msg_seq_num}")
        body.append(f"52={datetime.utcnow().strftime('%Y%m%d-%H:%M:%S.%f')[:-3]}")
        
        # 2. Body
        for tag, val in fields.items():
            body.append(f"{tag}={val}")
            
        # 3. Construct Body String
        body_str = SOH.join(body) + SOH
        
        # 4. Calc Body Length (Tag 9)
        msg = f"8={BEGIN_STRING}{SOH}9={len(body_str)}{SOH}{body_str}"
        
        # 5. Calc Checksum (Tag 10)
        csum = sum(ord(c) for c in msg) % 256
        msg += f"10={csum:03d}{SOH}"
        
        # 6. Send
        try:
            self.sock.sendall(msg.encode('ascii'))
            self.msg_seq_num += 1
        except Exception as e:
            print(f"DEBUG: Send Failed: {e}")
            logger.error(f"Send Failed: {e}")
            # If broken pipe, force reconnect logic to trigger elsewhere or close sock here
            if isinstance(e, BrokenPipeError) or getattr(e, 'errno', 0) == 32:
                 self.sock = None # Signal dead

    def send_logon(self):
        self._send_fix_msg("A", {"98": "0", "108": "30", "141": "Y"})

    def send_heartbeat(self):
        self._send_fix_msg("0", {})

    def place_or_replace_order(self, ticker: str, side: str, price: float, qty: int):
        """
        Smart Execution Logic:
        - If no order exists -> Send New Order Single (D)
        - If order exists but price diff -> Send Order Cancel/Replace (G)
        - If price same -> Do nothing
        """
        initial_order = False
        orig_cl_ord_id = None
        new_cl_ord_id = f"MM-{ticker}-{side}-{self.msg_seq_num}"
        
        with self.lock:
            if ticker not in self.active_orders:
                self.active_orders[ticker] = {}
            
            current = self.active_orders[ticker].get(side)
            
            if not current:
                # Case 1: NEW ORDER
                initial_order = True
            else:
                # Case 2: REPLACE Check
                if abs(current['price'] - price) < 0.01 and current['qty'] == qty:
                    return # No change needed
                orig_cl_ord_id = current['cl_ord_id']
                
            # Update Local State
            self.active_orders[ticker][side] = {
                'cl_ord_id': new_cl_ord_id,
                'price': price,
                'qty': qty
            }

        # Side: Buy=1, Sell=2
        side_val = "1" if side == "Buy" else "2"
        
        if initial_order:
            print(f"DEBUG: Placing NEW {side} for {ticker} @ {price}")
            logger.info(f"Placing NEW {side} for {ticker} @ {price}")
            self._send_fix_msg("D", {
                "11": new_cl_ord_id,
                "21": "1", # HandlInst (Automated)
                "55": ticker,
                "54": side_val,
                "38": qty,
                "40": "2", # Limit
                "44": price,
                "60": datetime.utcnow().strftime('%Y%m%d-%H:%M:%S')
            })
            if self.on_activity:
                try:
                    self.on_activity("ORDER_SENT", {
                        "symbol": ticker, "side": side, "type": "NEW", "qty": qty, "price": price,
                        "timestamp": time.time()
                    })
                except: pass
        else:
            logger.info(f"Replacing {side} for {ticker} @ {price} (Orig: {orig_cl_ord_id})")
            self._send_fix_msg("G", {
                "41": orig_cl_ord_id,
                "11": new_cl_ord_id,
                "21": "1", # HandlInst
                "55": ticker,
                "54": side_val,
                "38": qty,
                "40": "2", # Limit
                "44": price,
                "60": datetime.utcnow().strftime('%Y%m%d-%H:%M:%S')
            })
            if self.on_activity:
                try:
                    self.on_activity("ORDER_SENT", {
                        "symbol": ticker, "side": side, "type": "REPLACE", "qty": qty, "price": price,
                        "timestamp": time.time()
                    })
                except: pass

    def _heartbeat_loop(self):
        while self.running:
            time.sleep(30)
            try:
                self.send_heartbeat()
            except:
                pass
