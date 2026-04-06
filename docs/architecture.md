# System Architecture

## Overview
Thermal profiling web app that simulates heat diffusion across electronic components using PDEs.

## Components

1. Simulation Engine (`simulation/heat_equation.py`)
   - Solves 2D heat diffusion PDE using finite-difference method
   - Supports multi-core CPU/GPU heat source layouts
   - Scales temperature based on CPU load percentage

2. Database Layer (`database/`)
   - `models.py` — CPUProfile and SimulationHistory tables
   - `seed.py` — Pre-seeded CPU/GPU profiles (Intel, AMD, Apple, Nvidia)
   - PostgreSQL on Render (production), SQLite locally (development)

3. Web Interface (`webapp/`)
   - Flask REST API with `/profiles`, `/simulate`, `/history` endpoints
   - Interactive 3D thermal surface visualization via Plotly
   - Cross-section gradient analysis
   - AI-based cooling recommendations

## Data Flow
```
Browser → Flask API → Fetch CPU Profile from DB →
Run PDE Simulation → Save to History → Return Heatmap
```

## API Endpoints
- `GET  /profiles`  — list all CPU/GPU profiles
- `POST /simulate`  — run simulation for a given profile and load %
- `GET  /history`   — fetch last 10 simulation runs

## Tech Stack
- Python, Flask, NumPy — backend
- PostgreSQL, SQLAlchemy — database
- Plotly, HTML/CSS/JS — frontend
- Render — hosting
