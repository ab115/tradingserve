import logging

# Mock Logger
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("FIXClient")

SOH = chr(1)

def test_reader_logic():
    # Simulate the buffer state from the logs
    # Note: \x01 is SOH
    # Using the string exactly as repr showed in logs, but reconstructing actual string
    raw_log_str = "8=FIX.4.2\x019=205\x0135=8\x0134=2\x0149=ECNGATEWAY\x0152=20260103-14:04:19.514\x0156=MARKETMAKER\x016=0\x0111=MM-GOOG-Buy-1\x0114=0\x0117=EXEC-MM-GOOG-Buy-1-NEW\x0120=0\x0131=0.0\x0132=0\x0137=MM-GOOG-Buy-1\x0138=100.0\x0139=0\x0154=1\x0155=GOOG\x01150=0\x01151=100.0\x0110=186\x01"
    
    buffer = raw_log_str
    
    print(f"Testing Buffer Len: {len(buffer)}")
    
    processed_count = 0
    
    while True:
        # 1. Find start (8=FIX)
        start = buffer.find("8=FIX")
        if start == -1:
            print("No Start Tag Found")
            break
            
        print(f"Found Start at {start}")
        
        # 2. Look for End (10=XXX<SOH>)
        # The logic in fix_client.py:
        end_tag = f"{SOH}10="
        checksum_idx = buffer.find(end_tag, start)
        
        if checksum_idx == -1:
            print(f"No Checksum Tag ({repr(end_tag)}) found after index {start}")
            print(f"Hypothesis: Buffer content around end: {repr(buffer[start:])}")
            break
            
        print(f"Found Checksum start at {checksum_idx}")
        
        # 3. Find SOH after Checksum
        # 10=XXX<SOH>
        # Checksum tag itself is 1+3 (SOH "10=") = 4 chars? No.
        # buffer[checksum_idx] is SOH.
        # buffer[checksum_idx+1] is '1'.
        
        # fix_client logic: end_msg = buffer.find(SOH, checksum_idx + 1)
        # checksum_idx points to the SOH before '10='.
        # So it searches for the NEXT SOH, which should be the one at end of 10=XXX
        
        end_msg = buffer.find(SOH, checksum_idx + 1)
        if end_msg == -1:
            print("No Final SOH found")
            break
            
        print(f"Found End SOH at {end_msg}")
        
        raw_msg = buffer[start:end_msg+1]
        print(f"EXTRACTED MSG: {repr(raw_msg)}")
        
        processed_count += 1
        buffer = buffer[end_msg+1:]
        
        # Simulate processing (basic dict parse)
        fields = {}
        for pair in raw_msg.split(SOH):
            if '=' in pair:
                tag, val = pair.split('=', 1)
                fields[tag] = val
        
        print(f"Parsed MsgType: {fields.get('35')}")
        if fields.get('35') == '8':
            print("SUCCESS: Parsed as Execution Report")
            print(f"LastQty (32): {fields.get('32')}")
            print(f"OrdStatus (39): {fields.get('39')}")

    if processed_count == 0:
        print("FAILURE: No messages processed from buffer.")

if __name__ == "__main__":
    test_reader_logic()
