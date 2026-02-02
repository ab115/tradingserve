import sys

def strategy(price):
    if price < 100:
        return "BUY"
    return "HOLD"

if __name__ == "__main__":
    signal = strategy(99)
    print(f"Signal: {signal}")
