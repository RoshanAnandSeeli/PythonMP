/**
 * THERMAL_OS v2.5.0 - CORE_ANALYTICS_MODULE
 * AUTH: JEEDI_JOSHUA
 */

document.addEventListener('DOMContentLoaded', () => {
    updateTimestamp();
    setInterval(updateTimestamp, 1000);
    addLog("SYSTEM_READY", "INFO");
    loadProfiles();
});

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
    const now = new Date();
    const timeStr = now.toISOString().replace('T', ' ').substring(0, 19);
    const tsEl = document.getElementById('liveTimestamp');
    if (tsEl) tsEl.innerText = `UTC_CLOCK: ${timeStr}`;
}

function addLog(message, type = "PROCESS") {
    const logsContainer = document.getElementById('terminalLogs');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<span style="color: #64748b">[${new Date().toLocaleTimeString()}]</span> <span style="color: ${type === "ERROR" ? "#ef4444" : "#818cf8"}"> > ${message}</span>`;
    logsContainer.prepend(entry);

    if (logsContainer.children.length > 50) {
        logsContainer.removeChild(logsContainer.lastChild);
    }
}

async function runSimulation() {
    const runBtn = document.getElementById("runBtn");
    const btnText = runBtn.querySelector(".btn-text");
    const gridSize = document.getElementById("gridSize").value;
    const profileId = document.getElementById("cpuProfile").value;
    const loadPercent = document.getElementById("loadPercent").value;

    runBtn.disabled = true;
    btnText.innerText = "PROCESSING...";
    addLog(`INIT_SIMULATION: PROFILE=${profileId}, LOAD=${loadPercent}%`, "PROCESS");

    const startTime = performance.now();

    try {
        addLog("REQUESTING_DATA_FROM_COMPUTE_NODE...", "NETWORK");

        const response = await fetch("/simulate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                profile_id: profileId,
                load_percent: loadPercent,
                grid_size: gridSize
            })
        });

        const data = await response.json();
        if (data.status === "error") throw new Error(data.message);

        const endTime = performance.now();
        const duration = (endTime - startTime).toFixed(2);

        addLog(`COMPUTE_SUCCESS: DURATION=${duration}ms`, "SUCCESS");
        document.getElementById("simulationTime").innerText = `LAST_RUNTIME: ${duration}ms`;

        const grid = data.grid;

        addLog("RENDERING_3D_THERMAL_MESH...", "GFX");

        const surfaceData = [{
            z: grid,
            type: "surface",
            colorscale: [
                [0, '#030712'],
                [0.2, '#1e1b4b'],
                [0.4, '#4c1d95'],
                [0.6, '#06b6d4'],
                [0.8, '#f59e0b'],
                [1, '#ef4444']
            ],
            contours: {
                z: {
                    show: true,
                    usecolormap: true,
                    highlightcolor: "#fff",
                    project: { z: true }
                }
            },
            showscale: true,
            colorbar: {
                title: 'ENERGY_SCAN',
                titlefont: { color: '#06b6d4', family: 'JetBrains Mono', size: 10 },
                tickfont: { color: '#64748b', family: 'JetBrains Mono', size: 9 },
                thickness: 20
            },
            lighting: {
                ambient: 0.6,
                diffuse: 0.8,
                fresnel: 0.5,
                specular: 0.5,
                roughness: 0.3
            }
        }];

        const layout3D = {
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { family: 'Outfit, sans-serif', color: '#f8fafc', size: 10 },
            margin: { t: 0, r: 0, b: 0, l: 0 },
            scene: {
                xaxis: {
                    title: 'X_AXIS',
                    gridcolor: 'rgba(6, 182, 212, 0.1)',
                    backgroundcolor: 'rgba(0,0,0,0)',
                    showbackground: true,
                    tickfont: { color: '#64748b' }
                },
                yaxis: {
                    title: 'Y_AXIS',
                    gridcolor: 'rgba(6, 182, 212, 0.1)',
                    backgroundcolor: 'rgba(0,0,0,0)',
                    showbackground: true,
                    tickfont: { color: '#64748b' }
                },
                zaxis: {
                    title: 'TEMP',
                    gridcolor: 'rgba(6, 182, 212, 0.1)',
                    backgroundcolor: 'rgba(0,0,0,0)',
                    showbackground: true,
                    tickfont: { color: '#64748b' }
                },
                camera: {
                    eye: { x: 1.8, y: 1.8, z: 1.5 }
                }
            }
        };

        Plotly.react("heatmap", surfaceData, layout3D, { responsive: true, displayModeBar: false });

        const maxValues = grid.map(row => Math.max(...row));
        const gradientData = [{
            y: maxValues,
            type: "scatter",
            mode: "lines",
            fill: 'tozeroy',
            fillcolor: 'rgba(6, 182, 212, 0.05)',
            line: {
                color: '#06b6d4',
                width: 3,
                shape: 'spline',
                smoothing: 1.5
            }
        }];

        const layoutGradient = {
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { family: 'JetBrains Mono', color: '#64748b', size: 9 },
            margin: { t: 30, r: 30, b: 40, l: 40 },
            xaxis: {
                gridcolor: 'rgba(255,255,255,0.03)',
                zeroline: false,
                title: 'NODAL_INDEX'
            },
            yaxis: {
                gridcolor: 'rgba(255,255,255,0.03)',
                zeroline: false,
                title: 'VAL_MAX'
            }
        };

        Plotly.newPlot("graph", gradientData, layoutGradient, { responsive: true, displayModeBar: false });

        const suggestionEl = document.getElementById("suggestion");
        suggestionEl.style.opacity = "0";
        setTimeout(() => {
            suggestionEl.innerText = `>> ${data.suggestion.toUpperCase()}`;
            suggestionEl.style.opacity = "1";
        }, 300);

    } catch (error) {
        addLog(`CRITICAL_FAILURE: ${error.message}`, "ERROR");
        document.getElementById("suggestion").innerText = `>> SYSTEM_FAULT: ${error.message.toUpperCase()}`;
    } finally {
        runBtn.disabled = false;
        btnText.innerText = "RUN_SIMULATION";
    }
}
