import sys
import os
import unittest
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.fix_client import FIXClient

import logging

# Configure logging for the test run
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class MockSocket:
    def __init__(self, data_feed):
        self.data = data_feed
        self.call_count = 0
    
    def recv(self, bufsize):
        if self.call_count < len(self.data):
            ret = self.data[self.call_count]
            self.call_count += 1
            return ret
        return b''

class TestFIXParsing(unittest.TestCase):
    def test_execution_report_parsing(self):
        # 1. Setup
        client = FIXClient("localhost", 9898, "MKR", "ECN", on_fill_callback=self.mock_callback)
        self.callback_triggered = False
        self.fill_data = {}
        
        # 2. Simulate RAW Data (Split into chunks to test framing)
        # Raw string from logs: 8=FIX.4.2...35=8...32=100...
        # SOH = \x01
        raw_msg = b"8=FIX.4.2\x019=100\x0135=8\x0134=2\x0149=ECN\x0156=MKR\x0132=100\x0131=150.50\x0139=2\x0154=1\x0155=GOOG\x0111=CLORDID\x0110=000\x01"
        
        # Manually invoke processing since _reader_loop is infinite
        # We test the _process_fix_message logic primarily here
        raw_str = raw_msg.decode('ascii')
        
        # 3. Process
        try:
            client._process_fix_message(raw_str)
        except Exception as e:
            self.fail(f"Parsing failed: {e}")
            
        # 4. Assert
        self.assertTrue(self.callback_triggered, "Callback should have triggered for Status=2 (Filled)")
        self.assertEqual(self.fill_data['qty'], 100)
        self.assertEqual(self.fill_data['price'], 150.50)
        self.assertEqual(self.fill_data['side'], 'Buy')

    def mock_callback(self, ticker, side, qty, price):
        self.callback_triggered = True
        self.fill_data = {'ticker': ticker, 'side': side, 'qty': qty, 'price': price}

if __name__ == "__main__":
    unittest.main()
