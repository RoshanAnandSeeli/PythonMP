# Sham — frontend/history-page

## Your Branch
`frontend/history-page`

## Your Task
Build a history page that shows the last 10 simulation runs fetched from the `/history` API endpoint.

## Files To Edit In Your VS Code
Navigate to these exact files in your PythonMP folder:

```
PythonMP/
 └── webapp/
      ├── static/
      │    ├── script.js        ← edit this
      │    └── style.css        ← edit this
      └── templates/
           └── index.html       ← edit this
```

## Specific Things To Build
1. Add a "HISTORY" section/panel to index.html
2. In script.js, fetch from `/history` endpoint on page load:
```js
const res = await fetch("/history");
const data = await res.json();
```
3. Display results in a table showing:
   - CPU Name
   - Load %
   - Max Temp
   - Suggestion
   - Timestamp
4. Style the table to match the existing dark cyan theme in style.css

## How To Push
```bash
git checkout frontend/history-page
git add .
git commit -m "feat: simulation history page"
git push origin frontend/history-page
```

## Rules
- DO NOT touch any files outside webapp/static/ and webapp/templates/
- DO NOT touch app.py, database/, or simulation/
