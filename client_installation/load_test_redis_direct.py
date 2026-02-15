#!/usr/bin/env python3
"""
Direct Redis Load Test Script
Connects directly to Redis instance and simulates concurrent users.
"""

import redis
import threading
import time
import argparse
from collections import defaultdict

# Global stats
stats = {
    'total_requests': 0,
    'total_errors': 0,
    'lock': threading.Lock()
}

def worker(worker_id, host, port, duration, results):
    """
    Simulates a single user performing Redis operations.
    """
    try:
        # Connect to Redis
        r = redis.Redis(host=host, port=port, decode_responses=True, socket_timeout=5)
        
        # Test connection
        r.ping()
        
        start_time = time.time()
        requests_made = 0
        errors = 0
        
        while (time.time() - start_time) < duration:
            try:
                # Simulate realistic workload: SET and GET
                key = f"loadtest:user{worker_id}:key{requests_made}"
                value = f"value_{time.time()}"
                
                # SET operation
                r.set(key, value, ex=60)  # Expire after 60 seconds
                requests_made += 1
                
                # GET operation
                r.get(key)
                requests_made += 1
                
                # Occasional INCR operation
                if requests_made % 10 == 0:
                    r.incr(f"loadtest:counter:user{worker_id}")
                    requests_made += 1
                
            except redis.exceptions.RedisError as e:
                errors += 1
                if errors <= 5:  # Only print first 5 errors per worker
                    print(f"[Worker {worker_id}] Redis Error: {e}")
            except Exception as e:
                errors += 1
                if errors <= 5:
                    print(f"[Worker {worker_id}] Unexpected Error: {e}")
        
        # Update global stats
        with stats['lock']:
            stats['total_requests'] += requests_made
            stats['total_errors'] += errors
        
        results[worker_id] = {'requests': requests_made, 'errors': errors}
        
    except redis.exceptions.ConnectionError as e:
        print(f"[Worker {worker_id}] FATAL: Cannot connect to Redis: {e}")
        with stats['lock']:
            stats['total_errors'] += 1
    except Exception as e:
        print(f"[Worker {worker_id}] FATAL: {e}")
        with stats['lock']:
            stats['total_errors'] += 1


def main():
    parser = argparse.ArgumentParser(description='Direct Redis Load Test')
    parser.add_argument('--host', default='119.235.52.198', help='Redis host')
    parser.add_argument('--port', type=int, default=6379, help='Redis port')
    parser.add_argument('--users', type=int, default=500, help='Number of concurrent users')
    parser.add_argument('--duration', type=int, default=60, help='Test duration in seconds')
    
    args = parser.parse_args()
    
    print("🚀 Starting Direct Redis Load Test")
    print(f"Target: {args.host}:{args.port}")
    print(f"👥 Users: {args.users} | ⏱️ Duration: {args.duration}s")
    print("-" * 60)
    
    # Test initial connection
    print("[*] Testing Redis connectivity...")
    try:
        r = redis.Redis(host=args.host, port=args.port, decode_responses=True, socket_timeout=5)
        pong = r.ping()
        print(f"✅ Redis is reachable (PONG: {pong})")
        
        # Get Redis info
        info = r.info('server')
        print(f"✅ Redis Version: {info.get('redis_version', 'Unknown')}")
        
    except redis.exceptions.ConnectionError as e:
        print(f"❌ FATAL: Cannot connect to Redis at {args.host}:{args.port}")
        print(f"   Error: {e}")
        return
    except Exception as e:
        print(f"❌ FATAL: {e}")
        return
    
    print(f"\n[*] Spawning {args.users} virtual users...")
    
    # Create worker threads
    threads = []
    results = {}
    
    start_time = time.time()
    
    for i in range(args.users):
        t = threading.Thread(target=worker, args=(i, args.host, args.port, args.duration, results))
        t.daemon = True
        t.start()
        threads.append(t)
    
    # Progress indicator
    for remaining in range(args.duration, 0, -1):
        print(f"⏳ Running... {remaining}s remaining", end='\r')
        time.sleep(1)
    
    print("\n[*] Stopping users...")
    
    # Wait for all threads to complete
    for t in threads:
        t.join(timeout=5)
    
    elapsed = time.time() - start_time
    
    # Calculate statistics
    total_requests = stats['total_requests']
    total_errors = stats['total_errors']
    throughput = total_requests / elapsed if elapsed > 0 else 0
    error_rate = (total_errors / total_requests * 100) if total_requests > 0 else 0
    
    # Print results
    print("\n" + "=" * 60)
    print("📊 LOAD TEST RESULTS")
    print("=" * 60)
    print(f"Total Requests: {total_requests:,}")
    print(f"Total Errors:   {total_errors:,}")
    print(f"Throughput:     {throughput:.2f} req/sec")
    print(f"Error Rate:     {error_rate:.2f}%")
    print(f"Actual Duration: {elapsed:.2f}s")
    print()
    
    # Verdict
    if error_rate < 1.0 and throughput > 100:
        print("✅ VERDICT: Excellent Performance")
    elif error_rate < 5.0 and throughput > 50:
        print("✅ VERDICT: Good Performance")
    elif error_rate < 10.0:
        print("⚠️ VERDICT: Acceptable (Some Issues)")
    else:
        print("❌ VERDICT: Poor Performance (High Error Rate)")


if __name__ == "__main__":
    main()
