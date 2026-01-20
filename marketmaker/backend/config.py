import os

# Redis
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))
REDIS_KEY_TICKERS = 'marketmaker:tickers'

# FIX ECN Gateway
ECN_HOST = os.getenv("ECN_HOST", "localhost")
ECN_PORT = int(os.getenv("ECN_PORT", 9898))
SENDER_COMP_ID = os.getenv("SENDER_COMP_ID", "MARKETMAKER")
TARGET_COMP_ID = os.getenv("TARGET_COMP_ID", "ECNGATEWAY")

# Strategy
STRATEGY_TYPE = os.getenv("STRATEGY", "AVELLANEDA_STOIKOV") # or CONSTANT_SPREAD
DEFAULT_TICKER = "AAPL"
