# System Architecture

The system consists of four main components:

1. Thermal Simulation Engine
   Implements heat diffusion using PDEs.

2. Grid Model
   Represents the electronic component as a 2D grid.

3. Visualization Module
   Converts temperature matrices into heatmaps.

4. Web Interface
   Allows users to run simulations and view results.

Data Flow:

User Request
     ↓
Flask Server
     ↓
Simulation Engine
     ↓
Temperature Matrix
     ↓
Heatmap Visualization