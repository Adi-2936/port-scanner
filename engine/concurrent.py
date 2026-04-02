import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from scanner.core import scan_port

# Global progress tracker - must be updated in-place, not reassigned
scan_progress = {"completed": 0, "total": 0, "active": False}


def run_scan(host, ports, max_threads=100):
    """
    Scans all ports concurrently using a thread pool.
    
    ThreadPoolExecutor creates a pool of worker threads.
    Each thread runs scan_port(host, port) independently.
    as_completed() gives us results as they finish (not in order).
    
    max_threads=100 means up to 100 ports scanned at the same time.
    """
    global scan_progress
    results = []
    start_time = time.time()
    
    # Initialize progress (update in-place)
    scan_progress["completed"] = 0
    scan_progress["total"] = len(ports)
    scan_progress["active"] = True

    with ThreadPoolExecutor(max_workers=max_threads) as executor:
        # Submit all scan jobs to the thread pool
        # future_to_port maps each Future object → its port number
        future_to_port = {
            executor.submit(scan_port, host, port): port
            for port in ports
        }

        completed = 0
        total = len(ports)

        for future in as_completed(future_to_port):
            result = future.result()
            results.append(result)
            completed += 1
            scan_progress["completed"] = completed

            # Progress indicator in terminal
            print(f"\r  Scanning... {completed}/{total} ports", end="", flush=True)

    print()  # newline after progress
    scan_progress["active"] = False

    end_time = time.time()
    duration = round(end_time - start_time, 2)

    open_ports = [r for r in results if r["state"] == "open"]

    return {
        "host": host,
        "total_ports_scanned": total,
        "open_ports": len(open_ports),
        "duration_seconds": duration,
        "ports_per_second": round(total / duration, 1),
        "results": sorted(results, key=lambda x: x["port"])  # sort by port number
    }


def run_sequential_scan(host, ports):
    """
    Scans ports one by one — used ONLY for performance comparison.
    This is intentionally slow so we can show how much faster
    concurrent scanning is.
    """
    results = []
    start_time = time.time()

    total = len(ports)
    for i, port in enumerate(ports):
        result = scan_port(host, port)
        results.append(result)
        print(f"\r  Scanning... {i+1}/{total} ports", end="", flush=True)

    print()  # newline after progress
    duration = round(time.time() - start_time, 2)
    
    open_ports = [r for r in results if r["state"] == "open"]

    return {
        "host": host,
        "total_ports_scanned": len(ports),
        "open_ports": len(open_ports),
        "duration_seconds": duration,
        "ports_per_second": round(len(ports) / duration, 1) if duration > 0 else 0,
        "results": results
    }