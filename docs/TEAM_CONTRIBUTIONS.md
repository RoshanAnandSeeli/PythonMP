# Team Contributions

This document summarizes the planned and submitted contributions for the Thermal Profiling of Electronic Components using PDEs project.

## Project
- Title: Thermal Profiling of Electronic Components using PDEs
- Stack: Flask, NumPy, SQLAlchemy, Plotly, HTML, CSS, JavaScript
- Repository structure used for contribution tracking:
  - `webapp/`
  - `simulation/`
  - `database/`
  - `docs/`

## Contribution Summary

### Roshan Anand
- Role: Project lead, backend integration, deployment coordination
- Major contributions:
  - Built and integrated the Flask application routes in [`webapp/app.py`](/c:/Users/Roshan%20Anand/Documents/Karunya/Semester-2/Python/Mirco-Project/thermal-profiling-pde/webapp/app.py)
  - Connected the simulation engine from [`simulation/heat_equation.py`](/c:/Users/Roshan%20Anand/Documents/Karunya/Semester-2/Python/Mirco-Project/thermal-profiling-pde/simulation/heat_equation.py)
  - Configured database seeding through [`database/seed.py`](/c:/Users/Roshan%20Anand/Documents/Karunya/Semester-2/Python/Mirco-Project/thermal-profiling-pde/database/seed.py)
  - Added login/session flow, live sensor endpoints, history flow, and Render-ready environment handling

### Joshua Jeedi
- Branch used: `frontend/responsive-ui`
- Assigned files:
  - [`webapp/static/script.js`](/c:/Users/Roshan%20Anand/Documents/Karunya/Semester-2/Python/Mirco-Project/thermal-profiling-pde/webapp/static/script.js)
  - [`webapp/static/style.css`](/c:/Users/Roshan%20Anand/Documents/Karunya/Semester-2/Python/Mirco-Project/thermal-profiling-pde/webapp/static/style.css)
- Contribution area:
  - Responsive UI refinement
  - Theme styling
  - Plot rendering optimization
  - Client-side interactivity for dashboard/live mode

### Sham Kumar
- Branch used: `frontend/history-page`
- Assigned files:
  - [`webapp/templates/index.html`](/c:/Users/Roshan%20Anand/Documents/Karunya/Semester-2/Python/Mirco-Project/thermal-profiling-pde/webapp/templates/index.html)
  - [`webapp/templates/sensor.html`](/c:/Users/Roshan%20Anand/Documents/Karunya/Semester-2/Python/Mirco-Project/thermal-profiling-pde/webapp/templates/sensor.html)
- Contribution area:
  - Dashboard structure updates
  - Sensor page layout
  - Mode-switcher oriented UI markup
  - History-facing presentation layer changes

### S S Angelin Achsah
- Branch used: `frontend/live-sensor-feed`
- Assigned files:
  - [`webapp/templates/landing.html`](/c:/Users/Roshan%20Anand/Documents/Karunya/Semester-2/Python/Mirco-Project/thermal-profiling-pde/webapp/templates/landing.html)
  - [`webapp/templates/login.html`](/c:/Users/Roshan%20Anand/Documents/Karunya/Semester-2/Python/Mirco-Project/thermal-profiling-pde/webapp/templates/login.html)
- Contribution area:
  - Landing page
  - Login page
  - Entry flow polish for the web app

### Susmitha A
- Branch used: `backend/validation`
- Assigned file:
  - [`webapp/app.py`](/c:/Users/Roshan%20Anand/Documents/Karunya/Semester-2/Python/Mirco-Project/thermal-profiling-pde/webapp/app.py)
- Contribution area:
  - Request validation
  - Error handling
  - Backend input safety improvements

### Bermin Akash
- Branch used: `backend/simulation-history`
- Assigned file:
  - [`webapp/app.py`](/c:/Users/Roshan%20Anand/Documents/Karunya/Semester-2/Python/Mirco-Project/thermal-profiling-pde/webapp/app.py)
- Contribution area:
  - Simulation history workflow
  - History filtering or API enhancement
  - Backend route-level improvements

## Notes
- `team-packages/` was used as a temporary coordination area for sharing teammate-specific files, but it is git-ignored and not part of versioned project history.
- This document is versioned under `docs/` so it can be used as presentation evidence directly from the repository.
