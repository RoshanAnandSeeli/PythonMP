import sys
import os
import time
from flask import Flask, render_template, request, jsonify
import numpy as np
from dotenv import load_dotenv
load_dotenv()

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(BASE_DIR)

from simulation.heat_equation import simulate_heat, cooling_suggestion
from database.models import db, CPUProfile, SimulationHistory
from database.seed import seed_cpu_profiles

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, "webapp", "templates"),
    static_folder=os.path.join(BASE_DIR, "webapp", "static")
)

app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///thermal.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

with app.app_context():
    db.create_all()
    seed_cpu_profiles()


latest_sensor_temp = 30.0
last_sensor_update = None


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/sensor")
def sensor_page():
    return render_template("sensor.html")


@app.route("/sensor-data", methods=["POST", "OPTIONS"])
def sensor_data():
    global latest_sensor_temp, last_sensor_update
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    try:
        data = request.get_json()
        if "temperature" in data:
            latest_sensor_temp = float(data["temperature"])
            last_sensor_update = time.time()
            return jsonify({"status": "success", "latest_temp": latest_sensor_temp})
        return jsonify({"status": "error", "message": "No temperature provided"}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400


@app.route("/live-simulate", methods=["POST"])
def live_simulate():
    try:
        data = request.get_json()
        grid_size = int(data.get("grid_size", 40))
        grid_size = max(5, min(grid_size, 100))
        grid = simulate_heat(grid_size, latest_sensor_temp)
        max_temp = np.max(grid)
        suggestion = cooling_suggestion(max_temp)
        return jsonify({
            "grid": grid,
            "max_temp": float(max_temp),
            "suggestion": suggestion,
            "latest_temp": latest_sensor_temp,
            "last_update_time": last_sensor_update,
            "status": "success"
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400


@app.route("/profiles", methods=["GET"])
def get_profiles():
    profiles = CPUProfile.query.all()
    return jsonify([{
        "id": p.id,
        "name": p.name,
        "cores": p.cores,
        "tdp": p.tdp,
        "max_temp": p.max_temp
    } for p in profiles])


@app.route("/simulate", methods=["POST"])
def simulate():
    try:
        data = request.get_json()
        profile_id = int(data.get("profile_id"))
        load_percent = float(data.get("load_percent", 100))
        grid_size = int(data.get("grid_size", 40))

        profile = CPUProfile.query.get(profile_id)
        if not profile:
            return jsonify({"status": "error", "message": "Profile not found"}), 404

        # Scale temperature based on load and TDP
        source_temp = (load_percent / 100) * profile.max_temp

        grid = simulate_heat(grid_size, source_temp, core_layout=profile.core_layout, tdp=profile.tdp)
        max_temp = np.max(grid)
        suggestion = cooling_suggestion(max_temp, tdp=profile.tdp)

        # Save to history
        record = SimulationHistory(
            cpu_profile_id=profile.id,
            cpu_name=profile.name,
            load_percent=load_percent,
            max_temp_result=float(max_temp),
            suggestion=suggestion
        )
        db.session.add(record)
        db.session.commit()

        return jsonify({
            "grid": grid,
            "max_temp": float(max_temp),
            "suggestion": suggestion,
            "cpu_name": profile.name,
            "status": "success"
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400


@app.route("/history", methods=["GET"])
def history():
    records = SimulationHistory.query.order_by(SimulationHistory.timestamp.desc()).limit(10).all()
    return jsonify([{
        "cpu_name": r.cpu_name,
        "load_percent": r.load_percent,
        "max_temp_result": r.max_temp_result,
        "suggestion": r.suggestion,
        "timestamp": r.timestamp.strftime("%Y-%m-%d %H:%M:%S")
    } for r in records])


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)
