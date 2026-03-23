import sys
import os
from flask import Flask, render_template, request, jsonify
import numpy as np

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(BASE_DIR)

from simulation.heat_equation import simulate_heat, cooling_suggestion

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, "webapp", "templates"),
    static_folder=os.path.join(BASE_DIR, "webapp", "static")
)

@app.route("/")
def home():
    return render_template("index.html")


@app.route("/simulate", methods=["POST"])
def simulate():
    try:
        data = request.get_json()
        grid_size = int(data.get("grid_size", 20))
        temperature = float(data.get("temperature", 100))

        grid_size = max(5, min(grid_size, 100))

        grid = simulate_heat(grid_size, temperature)
        max_temp = np.max(grid)
        suggestion = cooling_suggestion(max_temp)

        return jsonify({
            "grid": grid,
            "max_temp": float(max_temp),
            "suggestion": suggestion,
            "status": "success"
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400


if __name__ == "__main__":
    app.run(debug=True)
