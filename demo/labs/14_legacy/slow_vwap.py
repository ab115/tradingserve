import time
import random

# SIMULATION: "The Slow Tape"
# JOB TRACK: Data Engineer
# BUG: Algorithmic Complexity (O(N^2)) / String Concatenation

trades = []

def generate_stream():
    """Simulates a market data feed."""
    while True:
        yield {
            "symbol": "AAPL",
            "price": 100 + random.uniform(-1, 1),
            "size": random.randint(1, 100)
        }
        time.sleep(0.001) # Fast feed

def calculate_vwap_buggy():
    print("Starting VWAP Engine...")
    stream = generate_stream()
    
    total_volume_str = "" # For logging
    
    start_time = time.time()
    
    for i, trade in enumerate(stream):
        # <--- BUG 1: Appending to list is fine, BUT...
        trades.append(trade)
        
        # <--- BUG 2: O(N) calculation inside an O(N) loop = O(N^2)
        # We re-calculate the ENTIRE sum from index 0 every single tick.
        total_p_v = 0
        total_v = 0
        
        for t in trades:
            total_p_v += t['price'] * t['size']
            total_v += t['size']
            
        vwap = total_p_v / total_v if total_v > 0 else 0
        
        # <--- BUG 3: String concatenation in loop
        # Python optimizes this somewhat, but for huge strings it's slow.
        # total_volume_str += str(total_v) + "," 
        
        if i % 1000 == 0:
            elapsed = time.time() - start_time
            print(f"Trade #{i}: VWAP={vwap:.2f} (Time: {elapsed:.4f}s)")
            # As 'i' grows, 'elapsed' will grow exponentially per batch.

if __name__ == "__main__":
    calculate_vwap_buggy()
