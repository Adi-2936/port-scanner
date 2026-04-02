from flask import Flask, jsonify, request
from flask_cors import CORS
from engine.concurrent import run_scan, run_sequential_scan
from engine import concurrent

app = Flask(__name__)
CORS(app)  # Allow the React frontend to call this API


@app.route("/progress", methods=["GET"])
def get_progress():
    """Get current scan progress."""
    return jsonify(concurrent.scan_progress)


@app.route("/scan", methods=["POST"])
def scan():
    data = request.json
    host = data.get("host", "127.0.0.1")
    port_range = data.get("port_range", "1-1024")
    threads = int(data.get("threads", 100))

    # Parse port range like "1-1024" or "80,443,8080"
    if "-" in port_range:
        start, end = port_range.split("-")
        ports = list(range(int(start), int(end) + 1))
    else:
        ports = [int(p.strip()) for p in port_range.split(",")]

    result = run_scan(host, ports, max_threads=threads)
    return jsonify(result)


@app.route("/benchmark", methods=["POST"])
def benchmark():
    """Run both concurrent and sequential scans and compare them."""
    data = request.json
    host = data.get("host", "127.0.0.1")
    port_range = data.get("port_range", "1-200")
    
    # Parse port range like "1-1024" or "80,443,8080"
    if "-" in port_range:
        start, end = port_range.split("-")
        ports = list(range(int(start), int(end) + 1))
    else:
        ports = [int(p.strip()) for p in port_range.split(",")]

    print("Running concurrent scan for benchmark...")
    concurrent_result = run_scan(host, ports, max_threads=100)

    print("Running sequential scan for benchmark...")
    sequential_result = run_sequential_scan(host, ports)

    # Avoid division by zero if timing is very fast
    if concurrent_result["duration_seconds"] > 0:
        speedup = round(sequential_result["duration_seconds"] / concurrent_result["duration_seconds"], 1)
    else:
        speedup = float('inf')

    return jsonify({
        "concurrent": {
            "duration_seconds": concurrent_result["duration_seconds"],
            "ports_per_second": concurrent_result["ports_per_second"]
        },
        "sequential": {
            "duration_seconds": sequential_result["duration_seconds"],
            "ports_per_second": sequential_result["ports_per_second"]
        },
        "speedup_factor": speedup
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)