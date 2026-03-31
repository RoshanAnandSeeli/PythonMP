# Bermin — backend/simulation-history

## Your Branch
`backend/simulation-history`

## Your Task
Improve the simulation history API — add filtering by CPU name and date.

## Files To Edit In Your VS Code
Navigate to this exact file in your PythonMP folder:

```
PythonMP/
 └── webapp/
      └── app.py                ← edit this only
```

## Specific Things To Do
1. Update the `/history` route to support query filters:
```python
@app.route("/history", methods=["GET"])
def history():
    cpu_name = request.args.get("cpu_name")
    # filter SimulationHistory by cpu_name if provided
```
2. Add a `/history/stats` endpoint that returns:
   - Total simulations run
   - Most simulated CPU
   - Average max temperature

## How To Push
```bash
git checkout backend/simulation-history
git add .
git commit -m "feat: history filtering and stats endpoint"
git push origin backend/simulation-history
```

## Rules
- DO NOT touch database/models.py or simulation/
- DO NOT touch any frontend files
- Only edit webapp/app.py
