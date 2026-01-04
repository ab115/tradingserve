import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Redis Configuration
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0

    # Redpanda/Kafka Configuration
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:19092"
    KAFKA_ORDER_TOPIC: str = "orders"
    KAFKA_SESSION_TOPIC: str = "fix_session_messages"

    # FIX Server Configuration
    FIX_PORT: int = 9898
    FIX_SENDER_COMP_ID: str = "ECNGATEWAY"
    FIX_TARGET_COMP_ID: str = "CLIENT1" # Default, can be dynamic or multiple sessions defined in cfg
    FIX_DATA_DICTIONARY: str = "FIX42.xml" # Standard FIX 4.2
    
    # Session Settings
    HEARTBEAT_INT: int = 30
    START_TIME: str = "00:00:00"
    END_TIME: str = "00:00:00" # 24/7 for now

    class Config:
        env_file = ".env"

settings = Settings()
