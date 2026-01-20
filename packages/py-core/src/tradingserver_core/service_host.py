import asyncio
import signal
import logging
from typing import Optional, Awaitable, Callable
from .stream_log import setup_logging

class ServiceHost:
    """
    Standard application shell for Trading Server services.
    Handles signal interception (SIGINT/SIGTERM) and creates the main event loop.
    """
    def __init__(self, service_name: str):
        self.name = service_name
        self.logger = setup_logging(service_name)
        self.shutdown_event = asyncio.Event()

    async def run(self, main_loop: Callable[[], Awaitable[None]]):
        """
        Run the main service loop until a shutdown signal is received.
        """
        self.logger.info(f"Starting service: {self.name}")
        
        # Register Signal Handlers
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, self._handle_signal)
            
        try:
            # Run the provided main function inside a wrapper that also checks shutdown
            await main_loop()
        except asyncio.CancelledError:
            self.logger.info("Service loop cancelled")
        except Exception as e:
            self.logger.exception(f"Service crashed: {e}")
        finally:
            self.logger.info(f"Service {self.name} shutting down")

    def _handle_signal(self):
        self.logger.info("Received shutdown signal")
        self.shutdown_event.set()
        # Cancel all running tasks if needed, or let main_loop handle check
