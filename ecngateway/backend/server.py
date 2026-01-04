from quickfix import SessionSettings, FileStoreFactory, FileLogFactory, SocketAcceptor
import quickfix as fix
from fix_app import FIXApp
from config import settings
from msg_consumer import MsgConsumer

class FIXServer:
    def __init__(self, config_file: str = "server.cfg"):
        self.settings = fix.SessionSettings(config_file)
        self.application = FIXApp()
        self.storeFactory = fix.FileStoreFactory(self.settings)
        self.logFactory = fix.FileLogFactory(self.settings)
        self.acceptor = fix.SocketAcceptor(
            self.application,
            self.storeFactory,
            self.settings,
            self.logFactory
        )
        self.consumer = MsgConsumer(self.application)

    def start(self):
        print(f"Starting FIX Server on port {settings.FIX_PORT}...")
        self.acceptor.start()
        self.consumer.start()

    def stop(self):
        print("Stopping FIX Server...")
        self.acceptor.stop()
        self.consumer.stop()
