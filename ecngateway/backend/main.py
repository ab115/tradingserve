import sys
import os
# Add current directory to path so imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import time
import argparse
from server import FIXServer

def main():
    parser = argparse.ArgumentParser(description="ECN Gateway FIX Server")
    parser.add_argument("--config", default="server.cfg", help="Path to config file")
    args = parser.parse_args()

    server = FIXServer(args.config)
    
    try:
        server.start()
        print("Press Ctrl+C to stop.")
        while True:
            time.sleep(1)
    except (KeyboardInterrupt, SystemExit):
        server.stop()
        print("Server stopped.")

if __name__ == "__main__":
    main()
