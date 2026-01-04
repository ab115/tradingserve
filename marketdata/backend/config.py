import os

# Redpanda Configuration
REDPANDA_BROKER = os.getenv("REDPANDA_BROKER", "localhost:19092")
MARKET_DATA_TOPIC = "market_data"


# Service Configuration
UPDATE_INTERVAL_SECONDS = 1  # Faster updates for simulation
BATCH_SIZE = 50 # Larger batch for simulation

# Market Data Mode
MARKET_DATA_MODE = os.getenv("MARKET_DATA_MODE", "HYBRID") # HYBRID, LIVE, SIMULATION
POLYGON_API_KEY = os.getenv("POLYGON_API_KEY", "")

# Redis Configuration
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

# Resources
RESOURCES_DIR = os.path.join(os.path.dirname(__file__), "resources")

