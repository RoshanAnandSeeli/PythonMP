# Angelin — frontend/live-sensor-feed

## Your Branch
`frontend/live-sensor-feed`

## Your Task
Build the phone sensor page UI that shows live accelerometer data being sent to the server.

## Files To Edit In Your VS Code
Navigate to these exact files in your PythonMP folder:

```
PythonMP/
 └── webapp/
      ├── static/
      │    └── style.css        ← edit this (add sensor page styles)
      └── templates/
           └── index.html       ← edit this (add sensor status section)
```

## Specific Things To Build
1. Add a "LIVE SENSOR" status panel to index.html showing:
   - Connection status (green/red dot)
   - Last received temperature
   - Last updated timestamp
2. Style it to match the existing dark cyan theme

## API To Use
The server already has `/sensor-data` POST endpoint that receives:
```json
{ "temperature": "36.5", "x": "0.1", "y": "9.8", "z": "0.2" }
```

## How To Push
```bash
git checkout frontend/live-sensor-feed
git add .
git commit -m "feat: live sensor feed UI panel"
git push origin frontend/live-sensor-feed
```

## Rules
- DO NOT touch any files outside webapp/static/ and webapp/templates/
- DO NOT touch app.py, database/, or simulation/
