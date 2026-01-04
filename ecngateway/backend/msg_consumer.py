import json
import logging
import threading
from kafka import KafkaConsumer
from config import settings

logger = logging.getLogger(__name__)

class MsgConsumer(threading.Thread):
    def __init__(self, fix_app):
        super().__init__()
        self.fix_app = fix_app
        self.consumer = None
        self.running = True
        
        try:
            self.consumer = KafkaConsumer(
                "execution_reports", # Hardcoded or from settings?
                bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
                value_deserializer=lambda x: json.loads(x.decode('utf-8')),
                auto_offset_reset='latest',
                group_id='ecn_gateway_group'
            )
            logger.info(f"Connected to Kafka Consumers on {settings.KAFKA_BOOTSTRAP_SERVERS}")
        except Exception as e:
            logger.error(f"Failed to connect consumer: {e}")

    def run(self):
        if not self.consumer:
            return
            
        logger.info("Starting Message Consumer Loop...")
        while self.running:
            try:
                # Poll with timeout to check running flag
                msg_pack = self.consumer.poll(timeout_ms=1000)
                for tp, messages in msg_pack.items():
                    for message in messages:
                        data = message.value
                        # logger.info(f"Received Execution Report: {data}")
                        self.fix_app.send_execution_report(data)
            except Exception as e:
                logger.error(f"Error in consumer loop: {e}")

    def stop(self):
        self.running = False
        if self.consumer:
            self.consumer.close()
