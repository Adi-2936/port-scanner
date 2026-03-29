import socket
import ssl
import time

# How long to wait before giving up on a port (in seconds)
TIMEOUT = 1.5

# How many times to retry a port if it times out
MAX_RETRIES = 2


def scan_port(host, port):
    """
    Try to TCP-connect to host:port.
    Returns a dict with the result.
    
    This uses socket.connect_ex() — the low-level system call
    that returns 0 if connection succeeded, or an error code if not.
    """
    for attempt in range(MAX_RETRIES):
        try:
            # AF_INET  = IPv4 address family
            # SOCK_STREAM = TCP (reliable, connection-oriented)
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            
            # Don't wait forever — give up after TIMEOUT seconds
            sock.settimeout(TIMEOUT)
            
            start = time.time()
            
            # connect_ex returns 0 on success, error code on failure
            # unlike connect() which raises an exception on failure
            result = sock.connect_ex((host, port))
            
            latency = round((time.time() - start) * 1000, 2)  # ms
            
            if result == 0:
                # Port is OPEN — grab banner and check SSL
                banner = grab_banner(sock, host, port)
                ssl_info = probe_ssl(host, port)
                sock.close()
                return {
                    "port": port,
                    "state": "open",
                    "latency_ms": latency,
                    "banner": banner,
                    "ssl": ssl_info,
                    "service": get_service_name(port)
                }
            else:
                sock.close()
                return {
                    "port": port,
                    "state": "closed",
                    "latency_ms": latency,
                    "banner": None,
                    "ssl": None,
                    "service": get_service_name(port)
                }

        except socket.timeout:
            # Timed out — retry
            if attempt < MAX_RETRIES - 1:
                continue
            return {
                "port": port,
                "state": "filtered",  # filtered = no response (firewall likely)
                "latency_ms": None,
                "banner": None,
                "ssl": None,
                "service": get_service_name(port)
            }

        except Exception as e:
            return {
                "port": port,
                "state": "error",
                "latency_ms": None,
                "banner": None,
                "ssl": None,
                "service": str(e)
            }


def grab_banner(sock, host, port):
    """
    After connecting, some services automatically send a greeting message.
    SSH sends: SSH-2.0-OpenSSH_8.9
    FTP sends: 220 FTP server ready
    HTTP we have to ASK by sending a GET request first.
    
    We try to read this greeting — that's called banner grabbing.
    """
    try:
        sock.settimeout(2)

        # HTTP needs us to send a request first before it responds
        if port in [80, 8080, 8000]:
            sock.send(b"GET / HTTP/1.0\r\nHost: " + host.encode() + b"\r\n\r\n")

        banner = sock.recv(1024).decode("utf-8", errors="ignore").strip()
        # Only return first line of banner (clean output)
        return banner.split("\n")[0][:200] if banner else None

    except Exception:
        return None


def probe_ssl(host, port):
    """
    Try to do a TLS handshake on this port.
    If it works, return certificate info.
    This is how we detect HTTPS, SMTPS, etc.
    
    ssl.create_default_context() sets up a standard TLS client.
    wrap_socket() does the actual TLS handshake over our TCP connection.
    """
    # Common SSL ports — only probe these (saves time)
    ssl_ports = [443, 8443, 465, 993, 995, 636, 5061]
    if port not in ssl_ports:
        return None

    try:
        context = ssl.create_default_context()
        # Don't fail if cert is self-signed (common in labs)
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE

        with socket.create_connection((host, port), timeout=TIMEOUT) as raw_sock:
            with context.wrap_socket(raw_sock, server_hostname=host) as tls_sock:
                cert = tls_sock.getpeercert()
                cipher = tls_sock.cipher()
                return {
                    "enabled": True,
                    "cipher": cipher[0] if cipher else "unknown",
                    "tls_version": tls_sock.version()
                }
    except Exception:
        return {"enabled": False}


def get_service_name(port):
    """
    Maps well-known port numbers to service names.
    socket.getservbyport() is a built-in that checks /etc/services
    but it throws exceptions for unknown ports, so we try/except it.
    """
    try:
        return socket.getservbyport(port, "tcp")
    except Exception:
        return "unknown"