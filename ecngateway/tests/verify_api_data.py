import urllib.request
import json
import sys
import time

def verify_orders():
    try:
        # Try localhost (if running from host) or ecn-api (internal)
        urls = ["http://localhost:8000/orders", "http://ecn-api:8000/orders"]
        
        data = None
        for url in urls:
            try:
                print(f"Fetching {url}...")
                req = urllib.request.Request(url)
                with urllib.request.urlopen(req, timeout=2) as response:
                    data = json.loads(response.read().decode())
                    break
            except Exception as e:
                print(f"Failed {url}: {e}")
                
        if data is None:
            print("Could not fetch from any URL")
            return
            
        print(f"Received {len(data)} orders.")
        
        cancels = [o for o in data if o.get('RequestType') == 'Cancel']
        replaces = [o for o in data if o.get('RequestType') == 'Replace']
        
        print(f"Cancel Requests: {len(cancels)}")
        print(f"Replace Requests: {len(replaces)}")
        
        for c in cancels:
            print(f"CANCEL: ID={c.get('ClOrdID')} Orig={c.get('OrigClOrdID')} Time={c.get('TransactTime')}")
            
        for rep in replaces:
            print(f"REPLACE: ID={rep.get('ClOrdID')} Orig={rep.get('OrigClOrdID')} Time={rep.get('TransactTime')}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    verify_orders()
