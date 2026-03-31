/**
 * THERMALYTICS CORE ENGINE v3.1
 * Fixed: memory leak, Plotly re-render, interval stacking
 */

let simulationInterval = null;
let plotInitialized = false;
let prevUpdateTime = null;

document.addEventListener('DOMContentLoaded', () => {
    addLog("SYSTEM KERNEL INITIALIZED", "success");

    const gridSlider = document.getElementById('gridSize');
    const gridVal = document.getElementById('gridSizeVal');
    gridSlider.addEventListener('input', (e) => {
        gridVal.textContent = `${e.target.value}x${e.target.value}`;
    });

    addLog("ENGAGING LIVE SENSOR MODE...", "info");
    runSimulation();
    simulationInterval = setInterval(runSimulation, 3000); // 3s is enough, 2s was too aggressive
});

function addLog(message, type = "info") {
    const logsContainer = document.getElementById('terminalLogs');
    const entry = document.createElement('div');
    entry.className = 'log-entry';

    const now = new Date();
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    const timeStr = `${now.toLocaleTimeString('en-US', { hour12: false })}.${ms}`;

    entry.innerHTML = `
        <span class="log-time">[${timeStr}]</span>
        <span class="log-msg ${type}">${message}</span>
    `;
    logsContainer.prepend(entry);

    while (logsContainer.children.length > 30) {
        logsContainer.removeChild(logsContainer.lastChild);
    }
}

async function runSimulation() {
    const gridSize = document.getElementById("gridSize").value;
    const startTime = performance.now();

    try {
        const response = await fetch("/simulate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ grid_size: gridSize })
        });

        const data = await response.json();
        if (data.status === "error") throw new Error(data.message);

        const duration = (performance.now() - startTime).toFixed(2);
        document.getElementById("simulationTime").innerText = `${duration}ms`;

        const liveTempEl = document.getElementById("liveTempValue");
        const newTemp = Number(data.latest_temp).toFixed(2);

        if (liveTempEl.innerText !== newTemp && liveTempEl.innerText !== "--") {
            liveTempEl.classList.add('flash-update');
            setTimeout(() => liveTempEl.classList.remove('flash-update'), 500);
        }
        liveTempEl.innerText = newTemp;

        const statusLight = document.getElementById("sensorStatusLight");
        const statusText = document.getElementById("sensorStatusText");
        const nowSec = Date.now() / 1000;

        if (data.last_update_time && (nowSec - data.last_update_time) <= 5.0) {
            statusLight.className = "status-indicator green";
            statusText.innerText = "RECEIVING DATA";

            if (prevUpdateTime !== data.last_update_time) {
                addLog(`SENSOR: INCOMING TEMP ${newTemp}°C`, "success");
                prevUpdateTime = data.last_update_time;
                const d = new Date(data.last_update_time * 1000);
                document.getElementById("lastUpdatedTime").innerText = d.toLocaleTimeString('en-US', { hour12: false });
            }
        } else {
            statusLight.className = "status-indicator red";
            statusText.innerText = "NO DATA";
        }

        render3DMapping(data.grid);
        renderGradientSlice(data.grid);
        updateDiagnostics(data.suggestion);

    } catch (error) {
        addLog(`CRITICAL FAULT: ${error.message}`, "error");
        updateDiagnostics(`SYSTEM ERROR: ${error.message}`, true);
        document.getElementById("sensorStatusLight").className = "status-indicator red";
        document.getElementById("sensorStatusText").innerText = "NO DATA";
    }
}

function render3DMapping(grid) {
    const surfaceData = [{
        z: grid,
        type: "surface",
        colorscale: [
            [0, '#050508'],
            [0.2, '#1e1b4b'],
            [0.4, '#4338ca'],
            [0.6, '#db2777'],
            [0.8, '#f43f5e'],
            [1, '#fbbf24']
        ],
        showscale: false,
        lighting: { ambient: 0.8, diffuse: 1, fresnel: 0.4, specular: 1, roughness: 0.1 }
    }];

    const layout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { t: 0, r: 0, b: 0, l: 0 },
        scene: {
            xaxis: { visible: false },
            yaxis: { visible: false },
            zaxis: { visible: false },
            camera: { eye: { x: 1.5, y: 1.5, z: 1.1 } }
        }
    };

    // Use react instead of newPlot to avoid memory leak
    Plotly.react("heatmap", surfaceData, layout, { responsive: true, displayModeBar: false });
}

function renderGradientSlice(grid) {
    const midRow = grid[Math.floor(grid.length / 2)];

    const trace = {
        y: midRow,
        type: "scatter",
        mode: "lines",
        fill: 'tozeroy',
        fillcolor: 'rgba(236, 72, 153, 0.15)',
        line: { color: '#ec4899', width: 3, shape: 'spline', smoothing: 1.2 }
    };

    const layout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { t: 15, r: 15, b: 25, l: 35 },
        xaxis: { showgrid: false, zeroline: false, showticklabels: false },
        yaxis: { gridcolor: 'rgba(255,255,255,0.04)', zeroline: false, tickfont: { color: '#64748b', family: 'JetBrains Mono', size: 10 } }
    };

    // Use react instead of newPlot
    Plotly.react("graph", [trace], layout, { responsive: true, displayModeBar: false });
}

function updateDiagnostics(text, isError = false) {
    const aiStatus = document.querySelector('.ai-status');
    const suggestionEl = document.getElementById("suggestion");

    aiStatus.textContent = "SYNTHESIZING";
    aiStatus.style.background = "rgba(236, 72, 153, 0.15)";
    aiStatus.style.color = "#ec4899";
    aiStatus.style.borderColor = "rgba(236, 72, 153, 0.3)";
    suggestionEl.style.opacity = "0";

    setTimeout(() => {
        suggestionEl.innerText = text;
        suggestionEl.style.opacity = "1";
        if (isError) {
            aiStatus.textContent = "CRITICAL FAULT";
            aiStatus.style.background = "rgba(244, 63, 94, 0.15)";
            aiStatus.style.color = "#f43f5e";
            aiStatus.style.borderColor = "rgba(244, 63, 94, 0.3)";
        } else {
            aiStatus.textContent = "DIAGNOSTIC COMPLETE";
            aiStatus.style.background = "rgba(16, 185, 129, 0.15)";
            aiStatus.style.color = "#10b981";
            aiStatus.style.borderColor = "rgba(16, 185, 129, 0.3)";
        }
    }, 600);
}
