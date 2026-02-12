import socket
import time
import os

# SIMULATION: "The Leaky Bucket"
# JOB TRACK: SRE / DevOps
# BUG: Memory Leak & Resource Exhaustion

HISTORY = []  # <--- BUG 1: Global list grows infinitely

def start_server():
    print("Starting UDP Log Server on port 9999...")
    
    # <--- BUG 2: Socket is created but never properly closed/managed in a context
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(('0.0.0.0', 9999))
    
    while True:
        data, addr = sock.recvfrom(1024)
        message = data.decode('utf-8')
        
        # Simulate processing
        process_log(message)

def process_log(msg):
    # <--- BUG 1 (Impact): Appending to global list without cleanup
    HISTORY.append(msg)
    
    # Simulate some file I/O
    # <--- BUG 3: File handle leak (no 'with' statement, no close())
    f = open("server.log", "a")
    f.write(msg + "\n")
    # f.close() is missing!
    
    if len(HISTORY) % 1000 == 0:
        print(f"Processed {len(HISTORY)} logs. Current Memory: {get_memory_usage()} MB")

def get_memory_usage():
    import psutil
    process = psutil.Process(os.getpid())
    return process.memory_info().rss / 1024 / 1024

if __name__ == "__main__":
    start_server()
