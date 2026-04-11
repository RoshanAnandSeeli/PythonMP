/**
 * Thermal OS v3.1.0
 * Team Roshan
 */

let currentMode = 'profile';
let liveInterval = null;
let isLiveFetching = false;
let isDark = true;

function getLayout3D() {
    const gridColor = isDark ? 'rgba(6,182,212,0.2)' : 'rgba(2,132,199,0.2)';
    const tickColor = isDark ? '#94a3b8' : '#475569';
    const bgColor = isDark ? 'rgba(3,7,18,0.6)' : 'rgba(240,244,248,0.6)';
    const fontColor = isDark ? '#f1f5f9' : '#0f172a';
    return {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { family: 'Outfit, sans-serif', color: fontColor, size: 11 },
        margin: { t: 10, r: 10, b: 10, l: 10 },
        scene: {
            xaxis: {
                title: { text: 'X Axis', font: { size: 11, color: tickColor } },
                gridcolor: gridColor, gridwidth: 2,
                backgroundcolor: bgColor, showbackground: true,
                tickfont: { color: tickColor, size: 10 },
                showticklabels: true, nticks: 8
            },
            yaxis: {
                title: { text: 'Y Axis', font: { size: 11, color: tickColor } },
                gridcolor: gridColor, gridwidth: 2,
                backgroundcolor: bgColor, showbackground: true,
                tickfont: { color: tickColor, size: 10 },
                showticklabels: true, nticks: 8
            },
            zaxis: {
                title: { text: 'Temp (°C)', font: { size: 11, color: tickColor } },
                gridcolor: gridColor, gridwidth: 2,
                backgroundcolor: bgColor, showbackground: true,
                tickfont: { color: tickColor, size: 10 },
                showticklabels: true, nticks: 6
            },
            camera: { eye: { x: 1.8, y: 1.8, z: 1.5 } }
        }
    };
}

function getLayoutGradient() {
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
    const tickColor = isDark ? '#94a3b8' : '#475569';
    return {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { family: 'JetBrains Mono', color: tickColor, size: 10 },
        margin: { t: 30, r: 30, b: 50, l: 50 },
        xaxis: {
            gridcolor: gridColor, gridwidth: 1,
            zeroline: false,
            title: { text: 'Node Index', font: { size: 11, color: tickColor } },
            tickfont: { color: tickColor, size: 10 },
            showticklabels: true
        },
        yaxis: {
            gridcolor: gridColor, gridwidth: 1,
            zeroline: false,
            title: { text: 'Max Temp (°C)', font: { size: 11, color: tickColor } },
            tickfont: { color: tickColor, size: 10 },
            showticklabels: true
        }
    };
}

const PLOTLY_CONFIG = { responsive: true, displayModeBar: false };

document.addEventListener('DOMContentLoaded', () => {
    updateTimestamp();
    setInterval(updateTimestamp, 1000);
    addLog("System ready", "INFO");
    loadProfiles();
    measureLatency();
    setInterval(measureLatency, 10000);
});

function toggleTheme() {
    isDark = !isDark;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    document.getElementById('themeIcon').setAttribute('data-lucide', isDark ? 'sun' : 'moon');
    lucide.createIcons();
}

function setMode(mode) {
    currentMode = mode;
    const profilePanel = document.getElementById('profileModePanel');
    const livePanel = document.getElementById('liveModePanel');
    const btnProfile = document.getElementById('btnProfileMode');
    const btnLive = document.getElementById('btnLiveMode');

    if (mode === 'profile') {
        profilePanel.style.display = 'block';
        livePanel.style.display = 'none';
        btnProfile.classList.add('active');
        btnLive.classList.remove('active');
        clearInterval(liveInterval);
        liveInterval = null;
        addLog("Mode: Profile", "INFO");
    } else {
        profilePanel.style.display = 'none';
        livePanel.style.display = 'block';
        btnLive.classList.add('active');
        btnProfile.classList.remove('active');
        addLog("Mode: Thermal Camera", "INFO");
        runLiveSimulation();
        liveInterval = setInterval(runLiveSimulation, 4000);
    }
}

async function loadProfiles() {
    const select = document.getElementById("cpuProfile");
    try {
        const res = await fetch("/profiles");
        const profiles = await res.json();
        select.innerHTML = profiles.map(p =>
            `<option value="${p.id}">${p.name} (${p.cores}C / ${p.tdp}W)</option>`
        ).join("");
        document.getElementById("nodeCount").innerText = `${profiles.length} loaded`;
        addLog(`Profiles loaded: ${profiles.length} found`, "INFO");
    } catch (e) {
        addLog("Failed to load profiles", "ERROR");
    }
}

async function measureLatency() {
    const start = performance.now();
    try {
        await fetch("/profiles");
        const latency = (performance.now() - start).toFixed(0);
        document.getElementById("latencyDisplay").innerText = `${latency}ms`;
    } catch (e) {
        document.getElementById("latencyDisplay").innerText = "—";
    }
}

function updateTimestamp() {
    const tsEl = document.getElementById('liveTimestamp');
    if (tsEl) tsEl.innerText = `UTC: ${new Date().toISOString().replace('T', ' ').substring(0, 19)}`;
}

function addLog(message, type = "PROCESS") {
    const logsContainer = document.getElementById('terminalLogs');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<span style="color:var(--text-dim)">[${new Date().toLocaleTimeString()}]</span> <span style="color:${type === 'ERROR' ? '#ef4444' : '#818cf8'}"> > ${message}</span>`;
    logsContainer.prepend(entry);
    while (logsContainer.children.length > 20) logsContainer.removeChild(logsContainer.lastChild);
}

function renderHeatmap(grid) {
    Plotly.react("heatmap", [{
        z: grid, type: "surface",
        colorscale: [[0,'#030712'],[0.2,'#1e1b4b'],[0.4,'#4c1d95'],[0.6,'#06b6d4'],[0.8,'#f59e0b'],[1,'#ef4444']],
        contours: { z: { show: true, usecolormap: true, highlightcolor: "#fff", project: { z: true } } },
        showscale: true,
        colorbar: {
            title: { text: 'Temp (°C)', font: { color: '#06b6d4', family: 'JetBrains Mono', size: 10 } },
            tickfont: { color: '#94a3b8', family: 'JetBrains Mono', size: 9 },
            thickness: 20
        },
        lighting: { ambient: 0.6, diffuse: 0.8, fresnel: 0.5, specular: 0.5, roughness: 0.3 }
    }], getLayout3D(), PLOTLY_CONFIG);
}

function renderGradient(grid) {
    Plotly.react("graph", [{
        y: grid.map(row => Math.max(...row)),
        type: "scatter", mode: "lines+markers", fill: 'tozeroy',
        fillcolor: 'rgba(6,182,212,0.08)',
        line: { color: '#06b6d4', width: 2.5, shape: 'spline', smoothing: 1.3 },
        marker: { color: '#06b6d4', size: 4 }
    }], getLayoutGradient(), PLOTLY_CONFIG);
}

function updateSuggestion(text) {
    const el = document.getElementById("suggestion");
    el.style.opacity = "0";
    setTimeout(() => { el.innerText = text; el.style.opacity = "1"; }, 300);
}

async function runSimulation() {
    const runBtn = document.getElementById("runBtn");
    const btnText = runBtn.querySelector(".btn-text");
    const gridSize = document.getElementById("gridSize").value;
    const profileId = document.getElementById("cpuProfile").value;
    const loadPercent = document.getElementById("loadPercent").value;

    runBtn.disabled = true;
    btnText.innerText = "Processing...";
    addLog(`Simulation started — Profile: ${profileId}, Load: ${loadPercent}%`, "PROCESS");

    const startTime = performance.now();
    try {
        const response = await fetch("/simulate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profile_id: profileId, load_percent: loadPercent, grid_size: gridSize })
        });
        const data = await response.json();
        if (data.status === "error") throw new Error(data.message);

        const duration = (performance.now() - startTime).toFixed(2);
        addLog(`Completed in ${duration}ms`, "INFO");
        document.getElementById("simulationTime").innerText = `Last Runtime: ${duration}ms`;
        document.getElementById("latencyDisplay").innerText = `${duration}ms`;

        renderHeatmap(data.grid);
        renderGradient(data.grid);
        updateSuggestion(data.suggestion);

    } catch (error) {
        addLog(`Error: ${error.message}`, "ERROR");
        updateSuggestion(`System fault: ${error.message}`);
    } finally {
        runBtn.disabled = false;
        btnText.innerText = "Run Simulation";
    }
}

async function runLiveSimulation() {
    if (isLiveFetching) return;
    isLiveFetching = true;

    try {
        const gridSize = document.getElementById("gridSizeLive").value;
        const startTime = performance.now();
        const response = await fetch("/live-simulate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ grid_size: gridSize })
        });
        const data = await response.json();
        if (data.status === "error") throw new Error(data.message);

        const duration = (performance.now() - startTime).toFixed(2);
        document.getElementById("latencyDisplay").innerText = `${duration}ms`;
        document.getElementById("liveTempValue").innerText = Number(data.latest_temp).toFixed(2);

        const isLive = data.last_update_time && (Date.now() / 1000 - data.last_update_time) <= 5.0;
        const dot = document.getElementById("sensorStatusLight");
        const label = document.getElementById("sensorStatusLabel");

        if (isLive) {
            dot.style.cssText = "width:10px;height:10px;border-radius:50%;background:#06b6d4;box-shadow:0 0 8px #06b6d4;display:inline-block";
            label.innerText = "Receiving thermal feed";
            document.getElementById("lastUpdatedTime").innerText = new Date(data.last_update_time * 1000).toLocaleTimeString('en-US', { hour12: false });
            const avg = data.thermal_stats && Number.isFinite(Number(data.thermal_stats.avg_temp))
                ? Number(data.thermal_stats.avg_temp).toFixed(2)
                : null;
            addLog(`Live hotspot: ${Number(data.latest_temp).toFixed(2)}°C${avg ? ` | avg: ${avg}°C` : ''}`, "INFO");
        } else {
            dot.style.cssText = "width:10px;height:10px;border-radius:50%;background:#ef4444;box-shadow:0 0 8px #ef4444;display:inline-block";
            label.innerText = "No signal";
        }

        renderHeatmap(data.grid);
        renderGradient(data.grid);
        updateSuggestion(data.suggestion);

    } catch (error) {
        addLog(`Live error: ${error.message}`, "ERROR");
    } finally {
        isLiveFetching = false;
    }
}
