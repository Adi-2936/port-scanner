# Port Scanner with Service Detection

A custom network port scanner built with raw Python sockets. Supports concurrent scanning, banner grabbing, SSL/TLS detection, and performance benchmarking via a web dashboard or CLI.

## Features

- **Concurrent scanning** using a thread pool (`ThreadPoolExecutor`) — up to 500 threads
- **Timeout & retry logic** — configurable timeout per port with automatic retry on failure
- **Banner grabbing** — captures service greeting messages (SSH, FTP, HTTP, etc.)
- **SSL/TLS detection** — probes common SSL ports and reports cipher suite and TLS version
- **Service detection** — maps port numbers to service names via socket's built-in lookup
- **Performance benchmarking** — compares concurrent vs sequential scan speed

## Tech Stack

- **Language:** Python 3.x
- **Sockets:** `socket` (raw TCP), `ssl` (TLS probing)
- **Concurrency:** `concurrent.futures.ThreadPoolExecutor`
- **Backend API:** Flask + Flask-CORS
- **Frontend:** Vanilla HTML/CSS/JS (no frameworks)

## Project Structure
```
port-scanner/
├── scanner/
│   ├── core.py          # Raw socket connect, banner grab, SSL probe
│   └── services.py      # Port-to-service name mapping
├── engine/
│   ├── concurrent.py    # Thread pool scanner + benchmark
│   └── performance.py   # Metrics collection
├── dashboard/
│   └── index.html       # Web UI
├── app.py               # Flask API server
├── main.py              # CLI entry point
└── requirements.txt
```

## Setup
```bash
pip install flask flask-cors
```

## Usage

### Web Dashboard
```bash
python app.py
# Open dashboard/index.html in your browser
```

### CLI
```bash
# Scan default range 1-1024
python main.py 127.0.0.1

# Custom port range
python main.py 192.168.1.1 -p 1-65535

# Specific ports
python main.py 192.168.1.1 -p 80,443,8080,3306

# Custom thread count
python main.py 192.168.1.1 -p 1-1024 -t 200

# Performance benchmark
python main.py 127.0.0.1 --benchmark
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/scan` | Run a concurrent port scan |
| POST | `/benchmark` | Compare concurrent vs sequential speed |

### /scan request body
```json
{
  "host": "127.0.0.1",
  "port_range": "1-1024",
  "threads": 100
}
```

## Architecture
```
┌─────────────────────────────────────────┐
│           Web Dashboard (HTML)          │
│     POST /scan        POST /benchmark   │
└────────────┬───────────────┬────────────┘
             │               │
┌────────────▼───────────────▼────────────┐
│           Flask API (app.py)            │
│        localhost:5000                   │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│     Concurrent Engine (engine/)         │
│   ThreadPoolExecutor (up to 500 threads)│
└────────────┬────────────────────────────┘
             │  spawns N threads
┌────────────▼────────────────────────────┐
│       Core Scanner (scanner/core.py)    │
│  socket.connect_ex() → banner grab      │
│  → SSL probe → service name lookup      │
└────────────┬────────────────────────────┘
             │  TCP connect
┌────────────▼────────────────────────────┐
│         Target Host (Network)           │
│   ports: OPEN / CLOSED / FILTERED       │
└─────────────────────────────────────────┘
```

## Mandatory Requirements (Rubric)

| Requirement | How it's met |
|---|---|
| TCP sockets directly | `socket.SOCK_STREAM` with `connect_ex()` |
| SSL/TLS secure communication | `ssl.wrap_socket()` probes on ports 443, 465, 993, etc. |
| Multiple concurrent clients | `ThreadPoolExecutor` with configurable thread count |
| Communication over network sockets | All scanning uses TCP socket connections, no IPC |

## Ethical Notice

This tool is intended for use only on systems you own or have explicit permission to scan. Unauthorized port scanning may be illegal.
