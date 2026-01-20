import logging
from pythonjsonlogger import jsonlogger
import sys

def setup_logging(service_name: str, level=logging.INFO):
    """
    Configure structured JSON logging for the service.
    """
    logger = logging.getLogger()
    logger.setLevel(level)

    handler = logging.StreamHandler(sys.stdout)
    formatter = jsonlogger.JsonFormatter(
        '%(asctime)s %(levelname)s %(name)s %(message)s',
        rename_fields={"asctime": "ts", "levelname": "level"}
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    # Add service context
    logger = logging.LoggerAdapter(logger, {"service": service_name})
    return logger
