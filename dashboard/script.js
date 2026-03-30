let scanning = false;

function startScan() {
    if (scanning) return;
    const host = document.getElementById('host').value;
    const portRange = document.getElementById('portRange').value;
    const threads = document.getElementById('threads').value;

    scanning = true;
    document.getElementById('prog').style.width = '30%';
    document.getElementById('results-area').innerHTML = '<div class="empty-state">scanning...</div>';

    fetch('http://localhost:5000/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port_range: portRange, threads: parseInt(threads) })
    })
        .then(r => r.json())
        .then(data => {
            document.getElementById('prog').style.width = '100%';
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
            setTimeout(() => { document.getElementById('prog').style.width = '0%'; }, 1000);
            scanning = false;
        })
        .catch(() => {
            document.getElementById('results-area').innerHTML = '<div class="empty-state" style="color:#f85149">error: make sure the backend is running (python app.py)</div>';
            document.getElementById('prog').style.width = '0%';
            scanning = false;
        });
}

function runBenchmark() {
    document.getElementById('results-area').innerHTML = '<div class="empty-state">running benchmark — this scans ports 1-200 twice, takes ~30 seconds...</div>';
    document.getElementById('prog').style.width = '60%';

    fetch('http://localhost:5000/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: document.getElementById('host').value })
    })
        .then(r => r.json())
        .then(data => {
            document.getElementById('prog').style.width = '100%';
            document.getElementById('results-area').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:1rem 0">
    <div style="background:#0d1117;border-radius:6px;padding:1.25rem">
        <div style="font-size:11px;color:#7d8590;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px">Concurrent (Threaded)</div>
        <div style="font-size:28px;font-weight:700;color:#3fb950">${data.concurrent.duration_seconds.toFixed(1)}s</div>
        <div style="font-size:11px;color:#7d8590;margin-top:4px">${data.concurrent.ports_per_second} ports/sec</div>
    </div>
    <div style="background:#0d1117;border-radius:6px;padding:1.25rem">
        <div style="font-size:11px;color:#7d8590;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px">Sequential (Baseline)</div>
        <div style="font-size:28px;font-weight:700;color:#f85149">${data.sequential.duration_seconds.toFixed(1)}s</div>
        <div style="font-size:11px;color:#7d8590;margin-top:4px">${data.sequential.ports_per_second} ports/sec</div>
    </div>
    </div>
    <div style="background:#0d1117;border-radius:6px;padding:1.25rem;text-align:center;margin-top:0">
    <div style="font-size:11px;color:#7d8590;margin-bottom:8px">SPEEDUP FACTOR</div>
    <div style="font-size:40px;font-weight:700;color:#ffb300">${data.speedup_factor}x</div>
    <div style="font-size:11px;color:#7d8590;margin-top:4px">concurrent is ${data.speedup_factor}x faster than sequential</div>
    </div>`;
            setTimeout(() => { document.getElementById('prog').style.width = '0%'; }, 1000);
        })
        .catch(() => {
            document.getElementById('results-area').innerHTML = '<div class="empty-state" style="color:#f85149">error: make sure the backend is running</div>';
            document.getElementById('prog').style.width = '0%';
        });
}
