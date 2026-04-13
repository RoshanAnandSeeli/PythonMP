# PythonMP — Thermal Profiling of Electronic Components using PDEs

## Project Overview
This project simulates thermal distribution across electronic components using the heat diffusion equation.
The system models heat propagation across a chip surface and visualizes thermal hotspots to help evaluate cooling strategies.

## Objectives
- Model heat diffusion using PDEs
- Generate thermal maps of electronic components
- Analyze hotspot formation
- Evaluate cooling strategies

## System Architecture
```
User Browser → Web Interface (Flask) → Thermal Simulation Engine → Visualization (Heatmaps)
```

## Technology Stack
- Python, Flask, NumPy, Matplotlib, Plotly

## Features
- Heat diffusion simulation (vectorized finite-difference solver)
- Interactive 3D thermal surface visualization
- Cross-section gradient analysis
- AI-based cooling recommendations
- Web-based interface

## Team Members

| Name | Roll No | GitHub |
|---|---|---|
| Roshan Anand | URK25CS1142 | [@RoshanAnandSeeli](https://github.com/RoshanAnandSeeli/) |
| Joshua Jeedi | URK25CS1140 | [@jeedijoshua-art](https://github.com/jeedijoshua-art) |
| S S Angelin Achsah | URK25CS1045 | [@angelinachsah](https://github.com/angelinachsah) |
| Susmitha A | URK25CS1167 | [@susmithaa-a](https://github.com/susmithaa-a) |
| Sham Kumar | URK25CS1222 | [@Sham11102007](https://github.com/Sham11102007) |
| Bermin Akash V | URK25CS1070 | [@berminakash-hue](https://github.com/berminakash-hue) |

## Quick HTTPS Tunnel For Thermal Camera Testing

Mobile browsers require HTTPS to allow camera access. Use this temporary workflow for local testing.

1. Start the Flask app in one terminal:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start_flask_dev.ps1
```

2. Start the HTTPS tunnel in a second terminal:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start_https_tunnel.ps1
```

3. Copy the `https://*.loca.lt` URL from terminal output and open it on your phone.

4. Log in, open `/sensor`, tap `ACTIVATE_THERMAL_CAMERA`, and allow camera permission.

Notes:
- If `npx` asks to install `localtunnel`, approve it.
- Keep both terminals running while testing.
- Localtunnel URLs are temporary and will change each run.
