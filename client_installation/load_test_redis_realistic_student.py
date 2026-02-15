#!/usr/bin/env python3
"""
Realistic Student Redis Load Test
Simulates actual student behavior patterns to reveal real-world performance issues.
"""

import redis
import threading
import time
import argparse
import random
import string

# Global stats
stats = {
    'total_requests': 0,
    'total_errors': 0,
    'connection_errors': 0,
    'timeout_errors': 0,
    'memory_errors': 0,
    'lock': threading.Lock()
}

def generate_payload(size_category):
    """Generate realistic payloads of varying sizes"""
    if size_category == 'small':
        # 10-100 bytes: counters, flags, simple values
        return ''.join(random.choices(string.ascii_letters, k=random.randint(10, 100)))
    elif size_category == 'medium':
        # 1-10 KB: user sessions, cached data
        return ''.join(random.choices(string.ascii_letters, k=random.randint(1000, 10000)))
    elif size_category == 'large':
        # 100KB-500KB: JSON documents, serialized objects
        return ''.join(random.choices(string.ascii_letters, k=random.randint(100000, 500000)))
    else:  # huge
        # 1-2MB: Large datasets (simulates student uploading big data)
        return ''.join(random.choices(string.ascii_letters, k=random.randint(1000000, 2000000)))

def student_worker(worker_id, host, port, duration, behavior_type, results):
    """
    Simulates a single student's Redis usage pattern
    
    behavior_type:
    - 'good': Follows best practices
    - 'average': Typical student (some mistakes)
    - 'bad': Poor practices (connection churn, no TTL, slow queries)
    """
    requests_made = 0
    errors = 0
    start_time = time.time()
    
    try:
        while (time.time() - start_time) < duration:
            # Simulate network latency (students connecting from home)
            latency = random.uniform(0.05, 0.3)  # 50-300ms
            time.sleep(latency)
            
            # BAD BEHAVIOR: Create new connection frequently (connection churn)
            if behavior_type == 'bad' or (behavior_type == 'average' and random.random() < 0.3):
                try:
                    r = redis.Redis(host=host, port=port, decode_responses=True, 
                                  socket_timeout=2, socket_connect_timeout=2)
                    r.ping()
                except redis.exceptions.ConnectionError:
                    with stats['lock']:
                        stats['connection_errors'] += 1
                    errors += 1
                    continue
            else:
                # GOOD BEHAVIOR: Reuse connection
                if requests_made == 0:
                    r = redis.Redis(host=host, port=port, decode_responses=True,
                                  socket_timeout=2, socket_connect_timeout=2)
            
            try:
                # Simulate different student operations
                operation = random.choice([
                    'simple_set_get',
                    'hash_operations',
                    'list_operations',
                    'large_data',
                    'slow_query'  # Students accidentally running slow queries
                ])
                
                if operation == 'simple_set_get':
                    # Basic SET/GET with variable payload
                    payload_size = random.choice(['small', 'small', 'medium', 'large'])
                    key = f"student:{worker_id}:data:{requests_made}"
                    value = generate_payload(payload_size)
                    
                    # BAD: Forget to set TTL (30% of average students, 70% of bad students)
                    if behavior_type == 'good' or random.random() > 0.3:
                        r.set(key, value, ex=random.randint(60, 3600))
                    else:
                        r.set(key, value)  # No TTL → memory leak
                    
                    requests_made += 1
                    r.get(key)
                    requests_made += 1
                
                elif operation == 'hash_operations':
                    # Student storing structured data (user profile, session)
                    hash_key = f"student:{worker_id}:profile"
                    r.hset(hash_key, mapping={
                        'name': f'Student_{worker_id}',
                        'score': random.randint(0, 100),
                        'timestamp': time.time(),
                        'data': generate_payload('small')
                    })
                    requests_made += 1
                    
                    r.hgetall(hash_key)
                    requests_made += 1
                
                elif operation == 'list_operations':
                    # Student maintaining a queue/log
                    list_key = f"student:{worker_id}:log"
                    r.lpush(list_key, f"event_{time.time()}")
                    requests_made += 1
                    
                    r.lrange(list_key, 0, 10)
                    requests_made += 1
                
                elif operation == 'large_data':
                    # Student uploading large dataset (10% chance)
                    if random.random() < 0.1:
                        key = f"student:{worker_id}:bigdata:{requests_made}"
                        value = generate_payload('huge')
                        try:
                            r.set(key, value, ex=300)
                            requests_made += 1
                        except redis.exceptions.ResponseError as e:
                            if 'OOM' in str(e):
                                with stats['lock']:
                                    stats['memory_errors'] += 1
                            errors += 1
                
                elif operation == 'slow_query':
                    # BAD: Student runs slow query (5% chance for bad, 1% for average)
                    slow_chance = 0.05 if behavior_type == 'bad' else 0.01
                    if random.random() < slow_chance:
                        try:
                            # KEYS * is O(N) and blocks Redis
                            r.keys(f"student:{worker_id}:*")
                            requests_made += 1
                        except redis.exceptions.TimeoutError:
                            with stats['lock']:
                                stats['timeout_errors'] += 1
                            errors += 1
                
                # Simulate think time (student reading results, typing)
                time.sleep(random.uniform(0.1, 2.0))
                
            except redis.exceptions.TimeoutError:
                with stats['lock']:
                    stats['timeout_errors'] += 1
                errors += 1
            except redis.exceptions.ConnectionError:
                with stats['lock']:
                    stats['connection_errors'] += 1
                errors += 1
            except Exception as e:
                errors += 1
        
        # Update global stats
        with stats['lock']:
            stats['total_requests'] += requests_made
            stats['total_errors'] += errors
        
        results[worker_id] = {'requests': requests_made, 'errors': errors}
        
    except Exception as e:
        print(f"[Student {worker_id}] FATAL: {e}")
        with stats['lock']:
            stats['total_errors'] += 1

def simulate_burst(host, port, num_students, duration):
    """Simulate burst traffic (e.g., assignment deadline)"""
    print(f"\n💥 SIMULATING BURST: {num_students} students connecting simultaneously...")
    threads = []
    results = {}
    
    for i in range(num_students):
        behavior = random.choice(['good', 'average', 'average', 'bad'])  # Weighted
        t = threading.Thread(target=student_worker, 
                           args=(f"burst_{i}", host, port, duration, behavior, results))
        t.daemon = True
        t.start()
        threads.append(t)
    
    for t in threads:
        t.join(timeout=duration + 5)

def main():
    parser = argparse.ArgumentParser(description='Realistic Student Redis Load Test')
    parser.add_argument('--host', default='119.235.52.198', help='Redis host')
    parser.add_argument('--port', type=int, default=6379, help='Redis port')
    parser.add_argument('--students', type=int, default=50, help='Number of concurrent students')
    parser.add_argument('--duration', type=int, default=120, help='Test duration in seconds')
    parser.add_argument('--burst', action='store_true', help='Include burst traffic simulation')
    
    args = parser.parse_args()
    
    print("🎓 Starting Realistic Student Redis Load Test")
    print(f"Target: {args.host}:{args.port}")
    print(f"👥 Students: {args.students} | ⏱️ Duration: {args.duration}s")
    print("-" * 70)
    
    # Test connection
    print("[*] Testing Redis connectivity...")
    try:
        r = redis.Redis(host=args.host, port=args.port, decode_responses=True, socket_timeout=5)
        r.ping()
        info = r.info('server')
        memory_info = r.info('memory')
        print(f"✅ Redis Version: {info.get('redis_version')}")
        print(f"✅ Used Memory: {memory_info.get('used_memory_human')}")
        print(f"✅ Max Memory: {memory_info.get('maxmemory_human', 'unlimited')}")
    except Exception as e:
        print(f"❌ FATAL: {e}")
        return
    
    print(f"\n[*] Spawning {args.students} students...")
    print("   Behavior Mix: 25% good, 50% average, 25% bad practices")
    
    threads = []
    results = {}
    start_time = time.time()
    
    # Spawn students with realistic behavior distribution
    for i in range(args.students):
        # 25% good, 50% average, 25% bad
        behavior = random.choices(['good', 'average', 'bad'], weights=[25, 50, 25])[0]
        
        t = threading.Thread(target=student_worker,
                           args=(i, args.host, args.port, args.duration, behavior, results))
        t.daemon = True
        t.start()
        threads.append(t)
        
        # Gradual ramp-up (not all at once)
        if i < args.students - 1:
            time.sleep(random.uniform(0.1, 0.5))
    
    # Simulate burst traffic halfway through if requested
    if args.burst:
        time.sleep(args.duration // 2)
        simulate_burst(args.host, args.port, 30, 20)
    
    # Wait for completion
    for remaining in range(args.duration, 0, -1):
        print(f"⏳ Running... {remaining}s remaining", end='\r')
        time.sleep(1)
    
    print("\n[*] Waiting for students to finish...")
    for t in threads:
        t.join(timeout=10)
    
    elapsed = time.time() - start_time
    
    # Results
    total_requests = stats['total_requests']
    total_errors = stats['total_errors']
    throughput = total_requests / elapsed if elapsed > 0 else 0
    error_rate = (total_errors / total_requests * 100) if total_requests > 0 else 0
    
    print("\n" + "=" * 70)
    print("📊 REALISTIC STUDENT LOAD TEST RESULTS")
    print("=" * 70)
    print(f"Total Requests:      {total_requests:,}")
    print(f"Total Errors:        {total_errors:,}")
    print(f"  Connection Errors: {stats['connection_errors']:,}")
    print(f"  Timeout Errors:    {stats['timeout_errors']:,}")
    print(f"  Memory Errors:     {stats['memory_errors']:,}")
    print(f"Throughput:          {throughput:.2f} req/sec")
    print(f"Error Rate:          {error_rate:.2f}%")
    print(f"Actual Duration:     {elapsed:.2f}s")
    print()
    
    # Get final Redis stats
    try:
        r = redis.Redis(host=args.host, port=args.port, decode_responses=True)
        memory_info = r.info('memory')
        stats_info = r.info('stats')
        
        print("📈 REDIS SERVER IMPACT:")
        print(f"  Used Memory:        {memory_info.get('used_memory_human')}")
        print(f"  Memory Fragmentation: {memory_info.get('mem_fragmentation_ratio', 'N/A')}")
        print(f"  Rejected Connections: {stats_info.get('rejected_connections', 0)}")
        print(f"  Total Connections:  {stats_info.get('total_connections_received', 0)}")
    except:
        pass
    
    print()
    if error_rate < 1.0:
        print("✅ VERDICT: Excellent - Handles realistic student load")
    elif error_rate < 5.0:
        print("⚠️ VERDICT: Fair - Some issues under realistic load")
    else:
        print("❌ VERDICT: Poor - Significant issues with realistic student behavior")
    
    print("\n💡 Compare this to your simple load test results!")

if __name__ == "__main__":
    main()
