let scanning = false;
let progressInterval = null;

function updateProgressBar() {
    fetch('http://localhost:5000/progress')
        .then(r => r.json())
        .then(data => {
            if (data.total > 0) {
                const percentage = Math.round((data.completed / data.total) * 100);
                document.getElementById('scan-prog').style.width = percentage + '%';
                document.getElementById('scan-counter').textContent = `${data.completed}/${data.total}`;
            }
        })
        .catch(() => {
            // Silently ignore errors during polling
        });
}

function startScan() {
    if (scanning) return;
    const host = document.getElementById('host').value;
    const portRange = "1-1024";  // Default port range
    const threads = document.getElementById('threads').value;
    
    // Calculate total ports
    const totalPorts = 1024;

    scanning = true;
    document.getElementById('scan-prog').style.width = '0%';
    document.getElementById('scan-counter').textContent = `0/${totalPorts}`;
    document.getElementById('results-area').innerHTML = '<div class="empty-state">scanning...</div>';
    
    // Start polling progress every 200ms
    progressInterval = setInterval(updateProgressBar, 200);

    fetch('http://localhost:5000/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port_range: portRange, threads: parseInt(threads) })
    })
        .then(r => r.json())
        .then(data => {
            clearInterval(progressInterval);
            document.getElementById('scan-prog').style.width = '100%';
            document.getElementById('scan-counter').textContent = `${data.total_ports_scanned}/${data.total_ports_scanned}`;
            document.getElementById('m-open').textContent = data.open_ports;
            document.getElementById('m-total').textContent = data.total_ports_scanned;
            document.getElementById('m-time').textContent = data.duration_seconds.toFixed(1);
            document.getElementById('m-rate').textContent = data.ports_per_second;

            const openResults = data.results.filter(r => r.state === 'open');

            if (openResults.length === 0) {
                document.getElementById('results-area').innerHTML = '<div class="empty-state">no open ports found in range</div>';
            } else {
                let html = '<div class="results-header"><span>Port</span><span>State</span><span>Service</span><span>Banner</span><span>Latency</span></div>';
                for (const r of openResults) {
                    const sslTag = r.ssl?.enabled ? ' <span style="color:#3fb950;font-size:10px">[TLS]</span>' : '';
                    html += `<div class="result-row">
        <span class="port-num">${r.port}</span>
        <span><span class="badge badge-open">OPEN</span></span>
        <span class="service-name">${r.service}${sslTag}</span>
        <span class="banner-text" title="${r.banner || ''}">${r.banner || '—'}</span>
        <span style="color:#7d8590">${r.latency_ms ? r.latency_ms + 'ms' : '—'}</span>
    </div>`;
                }
                document.getElementById('results-area').innerHTML = html;
            }
            setTimeout(() => { 
                document.getElementById('scan-prog').style.width = '0%';
                document.getElementById('scan-counter').textContent = '—';
            }, 1000);
            scanning = false;
        })
        .catch(() => {
            clearInterval(progressInterval);
            document.getElementById('results-area').innerHTML = '<div class="empty-state" style="color:#f85149">error: make sure the backend is running (python app.py)</div>';
            document.getElementById('scan-prog').style.width = '0%';
            document.getElementById('scan-counter').textContent = '—';
            scanning = false;
        });
}

function runBenchmark() {
    if (scanning) return;
    
    const host = document.getElementById('host').value;
    const portRange = document.getElementById('benchmarkPortRange').value;
    const threads = document.getElementById('benchmarkThreads').value;
    
    // Parse port range to get total
    let totalPorts = 0;
    if (portRange.includes("-")) {
        const [start, end] = portRange.split("-").map(x => parseInt(x.trim()));
        totalPorts = end - start + 1;
    } else {
        totalPorts = portRange.split(",").length;
    }
    
    scanning = true;
    document.getElementById('results-area').innerHTML = `<div class="empty-state">running concurrent vs sequential benchmark...</div>`;
    document.getElementById('benchmark-prog').style.width = '60%';
    document.getElementById('benchmark-counter').textContent = `Benchmark...`;

    fetch('http://localhost:5000/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            host, 
            port_range: portRange,
            threads: parseInt(threads)
        })
    })
        .then(r => r.json())
        .then(data => {
            document.getElementById('benchmark-prog').style.width = '100%';
            document.getElementById('benchmark-counter').textContent = `Done`;
            
            const html = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:1rem 0">
            <div style="background:#0d1117;border-radius:6px;padding:1.25rem">
                <div style="font-size:11px;color:#7d8590;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px">Concurrent (Threaded)</div>
                <div style="font-size:28px;font-weight:700;color:#3fb950">${data.concurrent.duration_seconds.toFixed(2)}s</div>
                <div style="font-size:11px;color:#7d8590;margin-top:4px">${data.concurrent.ports_per_second} ports/sec</div>
            </div>
            <div style="background:#0d1117;border-radius:6px;padding:1.25rem">
                <div style="font-size:11px;color:#7d8590;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px">Sequential (Baseline)</div>
                <div style="font-size:28px;font-weight:700;color:#f85149">${data.sequential.duration_seconds.toFixed(2)}s</div>
                <div style="font-size:11px;color:#7d8590;margin-top:4px">${data.sequential.ports_per_second} ports/sec</div>
            </div>
            </div>
            <div style="background:#0d1117;border-radius:6px;padding:1.25rem;text-align:center;margin-top:0">
            <div style="font-size:11px;color:#7d8590;margin-bottom:8px">SPEEDUP FACTOR</div>
            <div style="font-size:40px;font-weight:700;color:#ffb300">${data.speedup_factor}x</div>
            <div style="font-size:11px;color:#7d8590;margin-top:4px">concurrent is ${data.speedup_factor}x faster than sequential</div>
            </div>`;
            
            document.getElementById('results-area').innerHTML = html;
            setTimeout(() => { 
                document.getElementById('benchmark-prog').style.width = '0%';
                document.getElementById('benchmark-counter').textContent = '—';
            }, 1000);
            scanning = false;
        })
        .catch((err) => {
            document.getElementById('results-area').innerHTML = '<div class="empty-state" style="color:#f85149">error: make sure the backend is running</div>';
            document.getElementById('benchmark-prog').style.width = '0%';
            document.getElementById('benchmark-counter').textContent = '—';
            scanning = false;
        });
}
