# Susmitha — backend/validation

## Your Branch
`backend/validation`

## Your Task
Add input validation and error handling to all API endpoints.

## Files To Edit In Your VS Code
Navigate to this exact file in your PythonMP folder:

```
PythonMP/
 └── webapp/
      └── app.py                ← edit this only
```

## Specific Things To Do
1. `/simulate` endpoint — validate inputs:
   - `profile_id` must exist in DB
   - `load_percent` must be between 10 and 100
   - `grid_size` must be between 5 and 100
   - Return clear error messages if invalid

2. `/sensor-data` endpoint — validate inputs:
   - `temperature` must be a number between 0 and 150
   - `x`, `y`, `z` must be valid floats
   - Reject and return 400 if invalid

3. Add a global error handler:
```python
@app.errorhandler(404)
def not_found(e):
    return jsonify({"status": "error", "message": "Route not found"}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"status": "error", "message": "Internal server error"}), 500
```

## How To Push
```bash
git checkout backend/validation
git add .
git commit -m "feat: input validation and error handling"
git push origin backend/validation
```

## Rules
- DO NOT touch database/, simulation/, or any frontend files
- Only edit webapp/app.py
