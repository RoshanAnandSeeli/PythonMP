/**
 * THERMAL_OS v3.0.0 - CORE_ANALYTICS_MODULE
 * AUTH: JEEDI_JOSHUA
 */

let currentMode = 'profile';
let liveInterval = null;
let isLiveFetching = false;

// Define layouts once — not on every render
const LAYOUT_3D = {
    paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
    font: { family: 'Outfit, sans-serif', color: '#f8fafc', size: 10 },
    margin: { t: 0, r: 0, b: 0, l: 0 },
    scene: {
        xaxis: { title: 'X_AXIS', gridcolor: 'rgba(6,182,212,0.1)', backgroundcolor: 'rgba(0,0,0,0)', showbackground: true, tickfont: { color: '#64748b' } },
        yaxis: { title: 'Y_AXIS', gridcolor: 'rgba(6,182,212,0.1)', backgroundcolor: 'rgba(0,0,0,0)', showbackground: true, tickfont: { color: '#64748b' } },
        zaxis: { title: 'TEMP', gridcolor: 'rgba(6,182,212,0.1)', backgroundcolor: 'rgba(0,0,0,0)', showbackground: true, tickfont: { color: '#64748b' } },
        camera: { eye: { x: 1.8, y: 1.8, z: 1.5 } }
    }
};

const LAYOUT_GRADIENT = {
    paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
    font: { family: 'JetBrains Mono', color: '#64748b', size: 9 },
    margin: { t: 30, r: 30, b: 40, l: 40 },
    xaxis: { gridcolor: 'rgba(255,255,255,0.03)', zeroline: false, title: 'NODAL_INDEX' },
    yaxis: { gridcolor: 'rgba(255,255,255,0.03)', zeroline: false, title: 'VAL_MAX' }
};

const PLOTLY_CONFIG = { responsive: true, displayModeBar: false };

document.addEventListener('DOMContentLoaded', () => {
    updateTimestamp();
    setInterval(updateTimestamp, 1000);
    addLog("SYSTEM_READY", "INFO");
    loadProfiles();
});

function setMode(mode) {
    currentMode = mode;
    const profilePanel = document.getElementById('profileModePanel');
    const livePanel = document.getElementById('liveModePanel');
    const btnProfile = document.getElementById('btnProfileMode');
    const btnLive = document.getElementById('btnLiveMode');

    if (mode === 'profile') {
        profilePanel.style.display = 'block';
        livePanel.style.display = 'none';
        btnProfile.style.cssText += ';background:#06b6d4;color:#030712';
        btnLive.style.cssText += ';background:transparent;color:#64748b';
        clearInterval(liveInterval);
        liveInterval = null;
        addLog("MODE: PROFILE", "INFO");
    } else {
        profilePanel.style.display = 'none';
        livePanel.style.display = 'block';
        btnLive.style.cssText += ';background:#06b6d4;color:#030712';
        btnProfile.style.cssText += ';background:transparent;color:#64748b';
        addLog("MODE: LIVE_SENSOR", "INFO");
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
        addLog(`PROFILES_LOADED: ${profiles.length}_FOUND`, "INFO");
    } catch (e) {
        addLog("FAILED_TO_LOAD_PROFILES", "ERROR");
    }
}

function updateTimestamp() {
    const tsEl = document.getElementById('liveTimestamp');
    if (tsEl) tsEl.innerText = `UTC_CLOCK: ${new Date().toISOString().replace('T', ' ').substring(0, 19)}`;
}

function addLog(message, type = "PROCESS") {
    const logsContainer = document.getElementById('terminalLogs');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<span style="color:#64748b">[${new Date().toLocaleTimeString()}]</span> <span style="color:${type === 'ERROR' ? '#ef4444' : '#818cf8'}"> > ${message}</span>`;
    logsContainer.prepend(entry);
    while (logsContainer.children.length > 20) logsContainer.removeChild(logsContainer.lastChild);
}

function renderHeatmap(grid) {
    Plotly.react("heatmap", [{
        z: grid, type: "surface",
        colorscale: [[0,'#030712'],[0.2,'#1e1b4b'],[0.4,'#4c1d95'],[0.6,'#06b6d4'],[0.8,'#f59e0b'],[1,'#ef4444']],
        contours: { z: { show: true, usecolormap: true, highlightcolor: "#fff", project: { z: true } } },
        showscale: true,
        colorbar: { title: 'ENERGY_SCAN', titlefont: { color: '#06b6d4', family: 'JetBrains Mono', size: 10 }, tickfont: { color: '#64748b', family: 'JetBrains Mono', size: 9 }, thickness: 20 },
        lighting: { ambient: 0.6, diffuse: 0.8, fresnel: 0.5, specular: 0.5, roughness: 0.3 }
    }], LAYOUT_3D, PLOTLY_CONFIG);
}

function renderGradient(grid) {
    Plotly.react("graph", [{
        y: grid.map(row => Math.max(...row)),
        type: "scatter", mode: "lines", fill: 'tozeroy',
        fillcolor: 'rgba(6,182,212,0.05)',
        line: { color: '#06b6d4', width: 3, shape: 'spline', smoothing: 1.5 }
    }], LAYOUT_GRADIENT, PLOTLY_CONFIG);
}

function updateSuggestion(text) {
    const el = document.getElementById("suggestion");
    el.style.opacity = "0";
    setTimeout(() => { el.innerText = `>> ${text.toUpperCase()}`; el.style.opacity = "1"; }, 300);
}

async function runSimulation() {
    const runBtn = document.getElementById("runBtn");
    const btnText = runBtn.querySelector(".btn-text");
    const gridSize = document.getElementById("gridSize").value;
    const profileId = document.getElementById("cpuProfile").value;
    const loadPercent = document.getElementById("loadPercent").value;

    runBtn.disabled = true;
    btnText.innerText = "PROCESSING...";
    addLog(`INIT: PROFILE=${profileId}, LOAD=${loadPercent}%`, "PROCESS");

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
        addLog(`SUCCESS: ${duration}ms`, "INFO");
        document.getElementById("simulationTime").innerText = `LAST_RUNTIME: ${duration}ms`;

        renderHeatmap(data.grid);
        renderGradient(data.grid);
        updateSuggestion(data.suggestion);

    } catch (error) {
        addLog(`FAULT: ${error.message}`, "ERROR");
        updateSuggestion(`SYSTEM_FAULT: ${error.message}`);
    } finally {
        runBtn.disabled = false;
        btnText.innerText = "RUN_SIMULATION";
    }
}

async function runLiveSimulation() {
    if (isLiveFetching) return;
    isLiveFetching = true;

    try {
        const gridSize = document.getElementById("gridSizeLive").value;
        const response = await fetch("/live-simulate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ grid_size: gridSize })
        });
        const data = await response.json();
        if (data.status === "error") throw new Error(data.message);

        document.getElementById("liveTempValue").innerText = Number(data.latest_temp).toFixed(2);

        const isLive = data.last_update_time && (Date.now() / 1000 - data.last_update_time) <= 5.0;
        const dot = document.getElementById("sensorStatusLight");
        const label = document.getElementById("sensorStatusLabel");

        if (isLive) {
            dot.style.cssText = "width:10px;height:10px;border-radius:50%;background:#06b6d4;box-shadow:0 0 8px #06b6d4;display:inline-block";
            label.innerText = "RECEIVING_DATA";
            document.getElementById("lastUpdatedTime").innerText = new Date(data.last_update_time * 1000).toLocaleTimeString('en-US', { hour12: false });
            addLog(`LIVE: ${Number(data.latest_temp).toFixed(2)}°C`, "INFO");
        } else {
            dot.style.cssText = "width:10px;height:10px;border-radius:50%;background:#ef4444;box-shadow:0 0 8px #ef4444;display:inline-block";
            label.innerText = "NO_SIGNAL";
        }

        renderHeatmap(data.grid);
        renderGradient(data.grid);
        updateSuggestion(data.suggestion);

    } catch (error) {
        addLog(`LIVE_FAULT: ${error.message}`, "ERROR");
    } finally {
        isLiveFetching = false;
    }
}
