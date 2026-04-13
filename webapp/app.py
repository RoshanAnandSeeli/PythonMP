import sys
import os
import time
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
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

database_url = os.environ.get("DATABASE_URL", "sqlite:///thermal.db")
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
    "pool_size": 5,
    "max_overflow": 2
}
app.secret_key = os.environ.get("SECRET_KEY", "thermal-secret-2025")

if os.environ.get("RENDER") or os.environ.get("FLASK_ENV") == "production":
    app.config["SESSION_COOKIE_SECURE"] = True
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

APP_USERNAME = os.environ.get("APP_USERNAME", "admin")
APP_PASSWORD = os.environ.get("APP_PASSWORD", "thermal2025")

def login_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("logged_in"):
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return decorated

db.init_app(app)

with app.app_context():
    db.create_all()
    seed_cpu_profiles()


latest_sensor_temp = 30.0
last_sensor_update = None
latest_thermal_frame = None
latest_thermal_stats = {
    "max_temp": 30.0,
    "avg_temp": 30.0,
    "rows": 0,
    "cols": 0
}


@app.route("/")
def landing():
    return render_template("landing.html")


@app.route("/login", methods=["GET"])
def login():
    if session.get("logged_in"):
        return redirect(url_for("home"))
    return render_template("login.html")


@app.route("/login", methods=["POST"])
def do_login():
    data = request.get_json()
    if data.get("username") == APP_USERNAME and data.get("password") == APP_PASSWORD:
        session["logged_in"] = True
        return jsonify({"status": "success"})
    return jsonify({"status": "error", "message": "Invalid credentials"}), 401


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/app")
@login_required
def home():
    return render_template("index.html")


@app.route("/sensor")
@login_required
def sensor_page():
    return render_template("sensor.html")


@app.route("/sensor-data", methods=["POST", "OPTIONS"])
def sensor_data():
    global latest_sensor_temp, last_sensor_update, latest_thermal_frame, latest_thermal_stats
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    try:
        data = request.get_json() or {}

        # Thermal camera payload path: expects a 2D array of temperature values.
        if "thermal_frame" in data:
            frame = data.get("thermal_frame")
            if not isinstance(frame, list) or not frame or not isinstance(frame[0], list):
                return jsonify({"status": "error", "message": "thermal_frame must be a non-empty 2D list"}), 400

            frame_array = np.array(frame, dtype=float)
            if frame_array.ndim != 2:
                return jsonify({"status": "error", "message": "thermal_frame must be 2-dimensional"}), 400

            frame_max = float(np.max(frame_array))
            frame_avg = float(np.mean(frame_array))

            latest_sensor_temp = frame_max
            latest_thermal_frame = frame
            latest_thermal_stats = {
                "max_temp": frame_max,
                "avg_temp": frame_avg,
                "rows": int(frame_array.shape[0]),
                "cols": int(frame_array.shape[1])
            }
            last_sensor_update = time.time()

            return jsonify({
                "status": "success",
                "source": "thermal_camera",
                "latest_temp": latest_sensor_temp,
                "thermal_stats": latest_thermal_stats
            })

        # Backward-compatible path for direct temperature payloads.
        if "temperature" in data:
            latest_sensor_temp = float(data["temperature"])
            last_sensor_update = time.time()
            latest_thermal_frame = None
            latest_thermal_stats = {
                "max_temp": latest_sensor_temp,
                "avg_temp": latest_sensor_temp,
                "rows": 0,
                "cols": 0
            }
            return jsonify({"status": "success", "source": "temperature", "latest_temp": latest_sensor_temp})

        return jsonify({"status": "error", "message": "No thermal_frame or temperature provided"}), 400
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
            "thermal_stats": latest_thermal_stats,
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
