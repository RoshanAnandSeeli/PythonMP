# Roshan — backend/cpu-profiles

## Your Branch
`backend/cpu-profiles`

## Your Task
Add more CPU/GPU profiles to the database and improve the heat simulation logic.

## Files To Edit In Your VS Code
Navigate to these exact files in your PythonMP folder:

```
PythonMP/
 ├── database/
 │    └── seed.py               ← edit this (add more profiles)
 └── simulation/
      └── heat_equation.py      ← edit this (improve simulation)
```

## Specific Things To Do
1. In `seed.py` — add more profiles (more Intel, AMD, Nvidia GPUs)
2. In `heat_equation.py` — improve heat diffusion accuracy:
   - Add thermal conductivity coefficient per chip type
   - Increase simulation steps for more accuracy

## How To Push
```bash
git checkout backend/cpu-profiles
git add .
git commit -m "feat: add more CPU/GPU profiles and improve simulation"
git push origin backend/cpu-profiles
```

## Rules
- DO NOT touch webapp/, templates/, or static/
- DO NOT touch database/models.py
