import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from scanner.core import scan_port


def run_scan(host, ports, max_threads=100):
    """
    Scans all ports concurrently using a thread pool.
    
    ThreadPoolExecutor creates a pool of worker threads.
    Each thread runs scan_port(host, port) independently.
    as_completed() gives us results as they finish (not in order).
    
    max_threads=100 means up to 100 ports scanned at the same time.
    """
    results = []
    start_time = time.time()

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

            # Progress indicator in terminal
            print(f"\r  Scanning... {completed}/{total} ports", end="", flush=True)

    print()  # newline after progress

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

    for port in ports:
        result = scan_port(host, port)
        results.append(result)

    duration = round(time.time() - start_time, 2)

    return {
        "host": host,
        "total_ports_scanned": len(ports),
        "duration_seconds": duration,
        "ports_per_second": round(len(ports) / duration, 1),
        "results": results
    }