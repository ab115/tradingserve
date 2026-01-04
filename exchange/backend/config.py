from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_ORDER_CHANNEL: str = "updates:orders"
    
    # Market Data
    MARKET_DATA_CHANNEL: str = "market_data_updates"
    
    # Kafka
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:19092"
    KAFKA_EXECUTION_TOPIC: str = "execution_reports"
    
    class Config:
        env_file = ".env"

settings = Settings()
