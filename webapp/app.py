"""
=============================================================================
  Thermal OS — Flask Backend
  -------------------------
  Main application: serves the web dashboard, live thermal sensor API,
  CPU/GPU profile simulation, simulation history, and a WhatsApp chatbot
  via Twilio webhook.

  Routes:
    /               — Landing page (public)
    /login          — Authentication page (GET/POST)
    /logout         — Clear session
    /app            — Main dashboard (login required)
    /sensor         — Thermal camera feed page (login required)
    /calculator     — Standalone calculator tool (public)
    /sensor-data    — POST endpoint to receive thermal frames from phone
    /live-simulate  — POST endpoint for live-mode simulation
    /profiles       — GET all CPU/GPU profiles
    /simulate       — POST profile-based simulation
    /history        — GET last 10 simulation results
    /whatsapp       — Twilio WhatsApp webhook (menu-driven chatbot)
    /debug-images   — Diagnostic: check thermal image URLs
=============================================================================
"""

import re
import sys
import os
import time
import threading
from functools import wraps
from datetime import datetime, timezone
from flask import Response
from typing import Dict, Optional

import requests as http_requests  # aliased to avoid clash with flask.request
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import numpy as np
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Environment & path setup
# ---------------------------------------------------------------------------
load_dotenv()

# Resolve project root so sibling packages (simulation/, database/) are importable.
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, BASE_DIR)

from simulation.heat_equation import simulate_heat, cooling_suggestion
from database.models import db, CPUProfile, SimulationHistory
from database.seed import seed_cpu_profiles

# ---------------------------------------------------------------------------
# Flask application factory
# ---------------------------------------------------------------------------
app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, "webapp", "templates"),
    static_folder=os.path.join(BASE_DIR, "webapp", "static"),
)

# ---------------------------------------------------------------------------
# Database configuration
# ---------------------------------------------------------------------------
database_url = os.environ.get("DATABASE_URL", "sqlite:///thermal.db")
# Render (and some other hosts) still expose postgres:// instead of postgresql://
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Connection pool settings — only applied for PostgreSQL (not SQLite).
if not database_url.startswith("sqlite"):
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_recycle": 300,
        "pool_pre_ping": True,
        "pool_size": 5,
        "max_overflow": 2,
    }

# ---------------------------------------------------------------------------
# Session & security configuration
# ---------------------------------------------------------------------------
app.secret_key = os.environ.get("SECRET_KEY", "thermal-secret-2025")

if os.environ.get("RENDER") or os.environ.get("FLASK_ENV") == "production":
    app.config["SESSION_COOKIE_SECURE"] = True
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

# ---------------------------------------------------------------------------
# Simple credential-based authentication
# ---------------------------------------------------------------------------
APP_USERNAME = os.environ.get("APP_USERNAME", "admin")
APP_PASSWORD = os.environ.get("APP_PASSWORD", "thermal2025")


def login_required(f):
    """Decorator: redirects unauthenticated users to the login page."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("logged_in"):
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return decorated


# ---------------------------------------------------------------------------
# Database initialisation
# ---------------------------------------------------------------------------
db.init_app(app)

with app.app_context():
    db.create_all()
    seed_cpu_profiles()

# ---------------------------------------------------------------------------
# Thread-safe live sensor state
# ---------------------------------------------------------------------------
# These globals are updated by /sensor-data and read by /live-simulate.
# A lock protects concurrent access when running under gunicorn with threads.
_sensor_lock = threading.Lock()

# Placeholder defaults — replace these with actual sensor baseline values
# once your hardware is configured.
_SENSOR_DEFAULTS = {
    "temp": 30.0,       # Baseline temperature (°C)
    "max_temp": 30.0,
    "avg_temp": 30.0,
}

latest_sensor_temp: float = _SENSOR_DEFAULTS["temp"]
last_sensor_update: Optional[float] = None
latest_thermal_frame: Optional[list] = None
latest_thermal_stats: Dict = {
    "max_temp": _SENSOR_DEFAULTS["max_temp"],
    "avg_temp": _SENSOR_DEFAULTS["avg_temp"],
    "rows": 0,
    "cols": 0,
}


# ═══════════════════════════════════════════════════════════════════════════
#  PAGE ROUTES
# ═══════════════════════════════════════════════════════════════════════════

@app.route("/")
def landing():
    """Public landing / marketing page."""
    return render_template("landing.html")


@app.route("/login", methods=["GET"])
def login():
    """Show login form (redirect to dashboard if already authenticated)."""
    if session.get("logged_in"):
        return redirect(url_for("home"))
    return render_template("login.html")


@app.route("/login", methods=["POST"])
def do_login():
    """Authenticate via JSON credentials."""
    data = request.get_json() or {}
    if data.get("username") == APP_USERNAME and data.get("password") == APP_PASSWORD:
        session["logged_in"] = True
        return jsonify({"status": "success"})
    return jsonify({"status": "error", "message": "Invalid credentials"}), 401


@app.route("/logout")
def logout():
    """Clear session and redirect to login."""
    session.clear()
    return redirect(url_for("login"))


@app.route("/app")
@login_required
def home():
    """Main thermal analysis dashboard (requires login)."""
    return render_template("index.html")


@app.route("/sensor")
@login_required
def sensor_page():
    """Thermal camera feed page (requires login)."""
    return render_template("sensor.html")


@app.route("/calculator")
def calculator_page():
    """Standalone calculator tool (public, no login required)."""
    return render_template("calculator.html")


# ═══════════════════════════════════════════════════════════════════════════
#  SENSOR DATA API
# ═══════════════════════════════════════════════════════════════════════════

@app.route("/sensor-data", methods=["POST", "OPTIONS"])
def sensor_data():
    """
    Receives thermal data from a phone/camera client.

    Accepts two payload formats:
      1. { "thermal_frame": [[...], ...] }   — 2D array of temperatures
      2. { "temperature": 42.5 }             — Single scalar value

    Returns the processed stats back to the client.
    """
    global latest_sensor_temp, last_sensor_update
    global latest_thermal_frame, latest_thermal_stats

    # Handle CORS preflight for cross-origin phone requests.
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        return response, 200

    try:
        data = request.get_json() or {}

        # ── Path A: Full thermal camera frame ──
        if "thermal_frame" in data:
            frame = data["thermal_frame"]

            # Validate: must be a non-empty 2D list
            if not isinstance(frame, list) or not frame or not isinstance(frame[0], list):
                return jsonify({
                    "status": "error",
                    "message": "thermal_frame must be a non-empty 2D list",
                }), 400

            frame_array = np.array(frame, dtype=float)
            if frame_array.ndim != 2:
                return jsonify({
                    "status": "error",
                    "message": "thermal_frame must be 2-dimensional",
                }), 400

            frame_max = float(np.max(frame_array))
            frame_avg = float(np.mean(frame_array))

            with _sensor_lock:
                latest_sensor_temp = frame_max
                latest_thermal_frame = frame
                latest_thermal_stats = {
                    "max_temp": frame_max,
                    "avg_temp": frame_avg,
                    "rows": int(frame_array.shape[0]),
                    "cols": int(frame_array.shape[1]),
                }
                last_sensor_update = time.time()

            response = jsonify({
                "status": "success",
                "source": "thermal_camera",
                "latest_temp": frame_max,
                "thermal_stats": latest_thermal_stats,
            })
            response.headers["Access-Control-Allow-Origin"] = "*"
            return response

        # ── Path B: Backward-compatible single temperature value ──
        if "temperature" in data:
            temp_value = float(data["temperature"])

            with _sensor_lock:
                latest_sensor_temp = temp_value
                last_sensor_update = time.time()
                latest_thermal_frame = None
                latest_thermal_stats = {
                    "max_temp": temp_value,
                    "avg_temp": temp_value,
                    "rows": 0,
                    "cols": 0,
                }

            response = jsonify({
                "status": "success",
                "source": "temperature",
                "latest_temp": temp_value,
            })
            response.headers["Access-Control-Allow-Origin"] = "*"
            return response

        return jsonify({
            "status": "error",
            "message": "No thermal_frame or temperature provided",
        }), 400

    except (ValueError, TypeError, KeyError) as e:
        return jsonify({"status": "error", "message": str(e)}), 400
    except Exception as e:
        app.logger.error("sensor-data error: %s", e, exc_info=True)
        return jsonify({"status": "error", "message": "Internal server error"}), 500


# ═══════════════════════════════════════════════════════════════════════════
#  SIMULATION ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@app.route("/live-simulate", methods=["POST"])
def live_simulate():
    """
    Runs a heat simulation using the latest live sensor temperature.
    Called periodically by the frontend in Live Mode.
    """
    try:
        data = request.get_json() or {}
        grid_size = int(data.get("grid_size", 40))
        grid_size = max(5, min(grid_size, 100))  # Clamp to safe range

        # Read sensor state under lock
        with _sensor_lock:
            temp = latest_sensor_temp
            update_time = last_sensor_update
            stats = dict(latest_thermal_stats)

        grid = simulate_heat(grid_size, temp)
        max_temp = float(np.max(grid))
        suggestion = cooling_suggestion(max_temp)

        return jsonify({
            "grid": grid,
            "max_temp": max_temp,
            "suggestion": suggestion,
            "latest_temp": temp,
            "last_update_time": update_time,
            "thermal_stats": stats,
            "status": "success",
        })
    except Exception as e:
        app.logger.error("live-simulate error: %s", e, exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 400


@app.route("/profiles", methods=["GET"])
def get_profiles():
    """Returns all CPU/GPU profiles as JSON."""
    profiles = CPUProfile.query.all()
    return jsonify([
        {
            "id": p.id,
            "name": p.name,
            "cores": p.cores,
            "tdp": p.tdp,
            "max_temp": p.max_temp,
        }
        for p in profiles
    ])


@app.route("/simulate", methods=["POST"])
def simulate():
    """
    Runs a profile-based heat simulation.

    Expects JSON:
      { "profile_id": 1, "load_percent": 80, "grid_size": 40 }
    """
    try:
        data = request.get_json() or {}

        # Validate required field
        raw_profile_id = data.get("profile_id")
        if raw_profile_id is None:
            return jsonify({
                "status": "error",
                "message": "profile_id is required",
            }), 400

        profile_id = int(raw_profile_id)
        load_percent = float(data.get("load_percent", 100))
        grid_size = int(data.get("grid_size", 40))
        grid_size = max(5, min(grid_size, 100))

        profile = CPUProfile.query.get(profile_id)
        if not profile:
            return jsonify({"status": "error", "message": "Profile not found"}), 404

        # Scale temperature based on load percentage and profile max temp
        source_temp = (load_percent / 100) * profile.max_temp

        grid = simulate_heat(
            grid_size, source_temp,
            core_layout=profile.core_layout,
            tdp=profile.tdp,
        )
        max_temp = float(np.max(grid))
        suggestion = cooling_suggestion(max_temp, tdp=profile.tdp)

        # Persist to simulation history
        record = SimulationHistory(
            cpu_profile_id=profile.id,
            cpu_name=profile.name,
            load_percent=load_percent,
            max_temp_result=max_temp,
            suggestion=suggestion,
        )
        db.session.add(record)
        db.session.commit()

        return jsonify({
            "grid": grid,
            "max_temp": max_temp,
            "suggestion": suggestion,
            "cpu_name": profile.name,
            "status": "success",
        })

    except (ValueError, TypeError) as e:
        return jsonify({"status": "error", "message": f"Invalid input: {e}"}), 400
    except Exception as e:
        db.session.rollback()
        app.logger.error("simulate error: %s", e, exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/history", methods=["GET"])
def history():
    """Returns the last 10 simulation records as JSON."""
    records = (
        SimulationHistory.query
        .order_by(SimulationHistory.timestamp.desc())
        .limit(10)
        .all()
    )
    return jsonify([
        {
            "cpu_name": r.cpu_name,
            "load_percent": r.load_percent,
            "max_temp_result": r.max_temp_result,
            "suggestion": r.suggestion,
            "timestamp": r.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
        }
        for r in records
    ])


# ═══════════════════════════════════════════════════════════════════════════
#  WHATSAPP CHATBOT (Twilio Webhook)
# ═══════════════════════════════════════════════════════════════════════════
#
#  Stateless, menu-driven Thermal Profiling Assistant.
#
#  Menu Structure:
#    "hi" / "hello"    →  Main menu
#    "1"               →  Processor catalog (18 chips, categorized)
#    "p1" … "p18"      →  Detailed specs for a specific processor
#    "2"               →  Live Sensor Data
#    "3"               →  Exit
#    anything else     →  Error + menu prompt
#
#  Test locally:
#    curl -X POST http://127.0.0.1:5000/whatsapp -d "Body=hi"
#    curl -X POST http://127.0.0.1:5000/whatsapp -d "Body=1"
#    curl -X POST http://127.0.0.1:5000/whatsapp -d "Body=p1"
#    curl -X POST http://127.0.0.1:5000/whatsapp -d "Body=p11"
#    curl -X POST http://127.0.0.1:5000/whatsapp -d "Body=2"
#    curl -X POST http://127.0.0.1:5000/whatsapp -d "Body=3"
# ═══════════════════════════════════════════════════════════════════════════

# Image base URL — single source of truth
_IMAGE_BASE_URL = "https://thermalprofiling.tech/static/3d"

# Timeout (seconds) for the debug-images GET check.
_IMAGE_DEBUG_TIMEOUT = 2

# Regex for matching processor commands (p1–p18, case-insensitive)
_PROC_CMD_RE = re.compile(r"^p(\d+)$")

from twilio.twiml.messaging_response import MessagingResponse

# ---------------------------------------------------------------------------
# Processor database — all 18 chips with full specs.
# To add a new processor, just append to this list. The menu auto-updates.
# ---------------------------------------------------------------------------
PROCESSORS = [
    # ── 🟦 Intel CPUs (p1–p4) ──
    {
        "name": "Intel Core i5-12400",
        "category": "🟦 Intel CPUs",
        "short": "6C / 65W",
        "cores": "6 (6P + 0E)", "threads": 12,
        "tdp": "65W", "max_temp": "100°C",
        "arch": "Alder Lake", "socket": "LGA 1700",
        "cooling": "Stock cooler or basic tower air cooler",
    },
    {
        "name": "Intel Core i7-13700K",
        "category": "🟦 Intel CPUs",
        "short": "8C / 125W",
        "cores": "16 (8P + 8E)", "threads": 24,
        "tdp": "125W (PBP) / 253W (MTP)", "max_temp": "100°C",
        "arch": "Raptor Lake", "socket": "LGA 1700",
        "cooling": "240mm AIO or high-end tower cooler",
    },
    {
        "name": "Intel Core i9-13900K",
        "category": "🟦 Intel CPUs",
        "short": "16C / 253W",
        "cores": "24 (8P + 16E)", "threads": 32,
        "tdp": "125W (PBP) / 253W (MTP)", "max_temp": "100°C",
        "arch": "Raptor Lake", "socket": "LGA 1700",
        "cooling": "360mm AIO or custom loop liquid cooling",
    },
    {
        "name": "Intel Core i3-12100",
        "category": "🟦 Intel CPUs",
        "short": "4C / 60W",
        "cores": "4 (4P + 0E)", "threads": 8,
        "tdp": "60W", "max_temp": "100°C",
        "arch": "Alder Lake", "socket": "LGA 1700",
        "cooling": "Stock cooler (included) is sufficient",
    },
    # ── 🔴 AMD CPUs (p5–p8) ──
    {
        "name": "AMD Ryzen 5 5600X",
        "category": "🔴 AMD CPUs",
        "short": "6C / 65W",
        "cores": "6", "threads": 12,
        "tdp": "65W", "max_temp": "95°C",
        "arch": "Zen 3 (Vermeer)", "socket": "AM4",
        "cooling": "Wraith Stealth (included) or budget tower cooler",
    },
    {
        "name": "AMD Ryzen 7 7700X",
        "category": "🔴 AMD CPUs",
        "short": "8C / 105W",
        "cores": "8", "threads": 16,
        "tdp": "105W", "max_temp": "95°C",
        "arch": "Zen 4 (Raphael)", "socket": "AM5",
        "cooling": "Tower cooler (Noctua NH-U12S) or 240mm AIO",
    },
    {
        "name": "AMD Ryzen 9 7950X",
        "category": "🔴 AMD CPUs",
        "short": "16C / 170W",
        "cores": "16", "threads": 32,
        "tdp": "170W", "max_temp": "95°C",
        "arch": "Zen 4 (Raphael)", "socket": "AM5",
        "cooling": "280mm+ AIO or dual-tower air cooler",
    },
    {
        "name": "AMD Ryzen 5 3600",
        "category": "🔴 AMD CPUs",
        "short": "6C / 65W",
        "cores": "6", "threads": 12,
        "tdp": "65W", "max_temp": "95°C",
        "arch": "Zen 2 (Matisse)", "socket": "AM4",
        "cooling": "Wraith Stealth (included) or budget tower cooler",
    },
    # ── 🍎 Apple Silicon (p9–p10) ──
    {
        "name": "Apple M2",
        "category": "🍎 Apple Silicon",
        "short": "8C / 20W",
        "cores": "8 (4P + 4E)", "threads": 8,
        "tdp": "20W", "max_temp": "90°C",
        "arch": "Apple M2 (5nm TSMC)", "socket": "SoC (soldered)",
        "cooling": "Passive heatsink (fanless in MacBook Air)",
    },
    {
        "name": "Apple M2 Pro",
        "category": "🍎 Apple Silicon",
        "short": "12C / 30W",
        "cores": "12 (8P + 4E)", "threads": 12,
        "tdp": "30W", "max_temp": "90°C",
        "arch": "Apple M2 Pro (5nm TSMC)", "socket": "SoC (soldered)",
        "cooling": "Active fan system (MacBook Pro internal)",
    },
    # ── 🎮 GPUs (p11–p15) ──
    {
        "name": "Nvidia RTX 4090",
        "category": "🎮 GPUs",
        "short": "16C / 450W",
        "cores": "16384 CUDA cores", "threads": "N/A (GPU)",
        "tdp": "450W", "max_temp": "90°C",
        "arch": "Ada Lovelace (AD102)", "socket": "PCIe 4.0 x16",
        "cooling": "Triple-fan air or AIO waterblock required",
    },
    {
        "name": "Nvidia RTX 3080",
        "category": "🎮 GPUs",
        "short": "10C / 320W",
        "cores": "8704 CUDA cores", "threads": "N/A (GPU)",
        "tdp": "320W", "max_temp": "93°C",
        "arch": "Ampere (GA102)", "socket": "PCIe 4.0 x16",
        "cooling": "Dual/triple-fan air cooler or hybrid AIO",
    },
    {
        "name": "Nvidia RTX 4060",
        "category": "🎮 GPUs",
        "short": "8C / 115W",
        "cores": "3072 CUDA cores", "threads": "N/A (GPU)",
        "tdp": "115W", "max_temp": "87°C",
        "arch": "Ada Lovelace (AD107)", "socket": "PCIe 4.0 x16",
        "cooling": "Dual-fan air cooler (stock is adequate)",
    },
    {
        "name": "AMD Radeon RX 7900 XTX",
        "category": "🎮 GPUs",
        "short": "12C / 355W",
        "cores": "6144 stream processors", "threads": "N/A (GPU)",
        "tdp": "355W", "max_temp": "110°C (junction)",
        "arch": "RDNA 3 (Navi 31)", "socket": "PCIe 4.0 x16",
        "cooling": "Triple-fan air or waterblock recommended",
    },
    {
        "name": "Intel Arc A770",
        "category": "🎮 GPUs",
        "short": "8C / 225W",
        "cores": "4096 shading units", "threads": "N/A (GPU)",
        "tdp": "225W", "max_temp": "100°C",
        "arch": "Alchemist (ACM-G10)", "socket": "PCIe 4.0 x16",
        "cooling": "Dual-fan reference cooler is adequate",
    },
    # ── 🏢 Enterprise / Mobile (p16–p18) ──
    {
        "name": "Qualcomm Snapdragon 8 Gen 3",
        "category": "🏢 Enterprise / Mobile",
        "short": "8C / 10W",
        "cores": "8 (1+5+2)", "threads": 8,
        "tdp": "10W", "max_temp": "80°C",
        "arch": "Custom Kryo (4nm TSMC)", "socket": "SoC (mobile)",
        "cooling": "Vapour chamber (phone internal)",
    },
    {
        "name": "AMD EPYC 9654",
        "category": "🏢 Enterprise / Mobile",
        "short": "16C / 360W",
        "cores": "96", "threads": 192,
        "tdp": "360W", "max_temp": "95°C",
        "arch": "Zen 4c (Genoa)", "socket": "SP5 (LGA 6096)",
        "cooling": "Server-grade liquid cooling or high-RPM blower",
    },
    {
        "name": "Intel Xeon W9-3595X",
        "category": "🏢 Enterprise / Mobile",
        "short": "16C / 350W",
        "cores": "60", "threads": 120,
        "tdp": "350W", "max_temp": "100°C",
        "arch": "Sapphire Rapids", "socket": "LGA 4677 (W790)",
        "cooling": "Server-grade liquid cooling or industrial heatsink",
    },
]


def _build_processor_catalog():
    """Builds the categorized processor menu string for WhatsApp."""
    # Group by category in order of appearance
    categories = []
    seen = set()
    for p in PROCESSORS:
        cat = p["category"]
        if cat not in seen:
            categories.append(cat)
            seen.add(cat)

    lines = [
        "🔧 *Processor Catalog*",
        "━━━━━━━━━━━━━━━━━━━━━",
        "_Select a processor to view full thermal details._",
    ]
    idx = 1
    for cat in categories:
        lines.append(f"\n{cat}")
        for p in PROCESSORS:
            if p["category"] == cat:
                lines.append(f"  *p{idx}*  {p['name']}  ·  {p['short']}")
                idx += 1

    lines.append("\n━━━━━━━━━━━━━━━━━━━━━")
    lines.append("📌 Reply *p1* – *p18* for full specs")
    lines.append("🔁 Send *hi* for main menu")
    return "\n".join(lines)


# Pre-build the catalog (avoids rebuilding every request)
_PROCESSOR_CATALOG = _build_processor_catalog()


@app.route("/whatsapp", methods=["POST"])
def whatsapp_webhook():
    """
    Twilio webhook for incoming WhatsApp messages.
    Stateless, menu-driven Thermal Profiling Assistant.
    Returns valid TwiML via MessagingResponse.

    Uses resp.message("text") pattern for guaranteed valid TwiML.
    """
    try:
        # ── Step 1: Read & normalise the incoming message ──
        incoming_msg = request.values.get("Body", "").strip().lower()
        sender = request.values.get("From", "unknown")
        app.logger.info("WhatsApp [%s] incoming: '%s'", sender, incoming_msg)

        # ── Step 2: Build reply text based on menu logic ──
        reply_text = ""
        image_url = None  # Set for responses that include a thermal map

        # --- GREETING: Main menu ---
        if incoming_msg in ("hi", "hello", "hey", "menu", "start"):
            app.logger.info("WhatsApp → greeting menu")
            reply_text = (
                "🌡️ *Thermal Profiling Assistant*\n"
                "━━━━━━━━━━━━━━━━━━━━━\n\n"
                "Explore real-time processor heat insights.\n\n"
                "1️⃣  *Processor Catalog*  ·  18 chips\n"
                "2️⃣  *Live Sensor Monitor*  ·  real-time\n"
                "3️⃣  *Exit*\n\n"
                "👉 Reply with *1*, *2*, or *3*"
            )

        # --- OPTION 1: Full categorized processor catalog ---
        elif incoming_msg == "1":
            app.logger.info("WhatsApp → processor catalog")
            reply_text = _PROCESSOR_CATALOG

        # --- OPTION p1 through p18: Individual processor details ---
        elif _PROC_CMD_RE.match(incoming_msg):
            proc_num = int(_PROC_CMD_RE.match(incoming_msg).group(1))
            app.logger.info("WhatsApp → processor request p%d", proc_num)

            if 1 <= proc_num <= len(PROCESSORS):
                p = PROCESSORS[proc_num - 1]

                # Build bidirectional suggestion (prev + next)
                nav_parts = []
                if proc_num > 1:
                    nav_parts.append(f"p{proc_num - 1}")
                if proc_num < len(PROCESSORS):
                    nav_parts.append(f"p{proc_num + 1}")
                suggest_line = (
                    f"👉 Try *{' | '.join(nav_parts)}*"
                    if nav_parts
                    else "👉 Send *1* to browse all processors"
                )

                reply_text = (
                    f"🔍 *{p['name']}*  _(p{proc_num})_\n"
                    f"━━━━━━━━━━━━━━━━━━━━━\n\n"
                    f"📂 {p['category']}\n\n"
                    f"⚙️ Cores: *{p['cores']}*\n"
                    f"🧵 Threads: *{p['threads']}*\n"
                    f"⚡ TDP: *{p['tdp']}*\n"
                    f"🌡️ Max Temp: *{p['max_temp']}*\n"
                    f"🏗️ Architecture: {p['arch']}\n"
                    f"🔌 Socket: {p['socket']}\n\n"
                    f"❄️ *Cooling Recommendation:*\n{p['cooling']}\n\n"
                )

                # ── Attach thermal image directly (no HEAD check) ──
                image_url = f"{_IMAGE_BASE_URL}/p{proc_num}.png"
                app.logger.info("Sending image URL: %s", image_url)
                reply_text += "📊 *Thermal Map* 👇\n\n"
                reply_text += "_If image is not visible, open manually:_\n"
                reply_text += f"{image_url}\n\n"

                reply_text += (
                    "━━━━━━━━━━━━━━━━━━━━━\n"
                    f"{suggest_line}\n"
                    "🔁 *1* → catalog  ·  *hi* → menu"
                )
            else:
                app.logger.warning(
                    "WhatsApp → processor p%d out of range (1–%d)",
                    proc_num, len(PROCESSORS),
                )
                reply_text = (
                    f"⚠️ *Processor Not Found*\n\n"
                    f"_p{proc_num}_ is not in our catalog.\n"
                    f"Valid range: *p1* – *p{len(PROCESSORS)}*\n\n"
                    "👉 Send *1* to browse the full catalog"
                )

        # --- OPTION 2: Live Thermal Camera link ---
        elif incoming_msg == "2":
            app.logger.info("WhatsApp → live sensor link")
            reply_text = (
                "📡 *Live Thermal Monitor*\n"
                "━━━━━━━━━━━━━━━━━━━━━\n\n"
                "🔥 Real-time temperature tracking enabled\n\n"
                "👉 *Open dashboard:*\n"
                "https://thermalprofiling.tech/sensor\n\n"
                "⚡ Data updates dynamically from sensors\n\n"
                "🔁 Send *hi* to return"
            )

        # --- OPTION 3: Exit ---
        elif incoming_msg == "3":
            app.logger.info("WhatsApp → exit")
            reply_text = (
                "👋 *Session Ended*\n\n"
                "Thanks for exploring Thermal Profiling 🚀\n\n"
                "Stay cool under pressure 🌡️\n\n"
                "👉 Send *hi* anytime to restart"
            )

        # --- INVALID INPUT: Friendly error ---
        else:
            app.logger.info("WhatsApp → unrecognised command: '%s'", incoming_msg)
            reply_text = (
                "❌ *Invalid Input*\n\n"
                "Try one of these:\n\n"
                "• *hi*  →  Main menu\n"
                "• *1*  →  Processor catalog\n"
                "• *p1* – *p18*  →  Processor details\n"
                "• *2*  →  Live sensor monitor\n"
                "• *3*  →  Exit\n\n"
                "👉 Type *hi* to restart"
            )

        # ── Step 3: Build TwiML using resp.message("text") pattern ──
        resp = MessagingResponse()
        msg = resp.message(reply_text)
        if image_url:
            msg.media(image_url)

        # ── Debug: log generated TwiML ──
        twiml_str = str(resp)
        app.logger.info("WhatsApp TwiML (%d chars): %s", len(twiml_str), twiml_str)

        # ── Step 4: Return valid TwiML XML ──
        return Response(twiml_str, status=200, content_type="text/xml")

    except Exception as e:
        app.logger.error("whatsapp_webhook error: %s", e, exc_info=True)
        fallback = MessagingResponse()
        fallback.message("⚠️ Something went wrong. Please try again.\nSend *hi* for the menu.")
        return Response(str(fallback), status=200, content_type="text/xml")


# ═══════════════════════════════════════════════════════════════════════════
#  DEBUG & DIAGNOSTICS
# ═══════════════════════════════════════════════════════════════════════════

@app.route("/debug-images")
def debug_images():
    """
    Diagnostic endpoint: verifies availability of all 18 thermal map images.
    Uses GET (not HEAD) because some hosts block HEAD requests.
    Returns each URL with its HTTP status so broken links are easy to spot.
    """
    results = {}
    for i in range(1, len(PROCESSORS) + 1):
        url = f"{_IMAGE_BASE_URL}/p{i}.png"
        try:
            r = http_requests.get(url, timeout=_IMAGE_DEBUG_TIMEOUT, stream=True)
            results[f"p{i}"] = {"url": url, "status": r.status_code, "ok": r.status_code == 200}
            r.close()  # Don't download the full image body
        except http_requests.RequestException as e:
            results[f"p{i}"] = {"url": url, "status": "error", "ok": False, "detail": str(e)}
    return jsonify({
        "total": len(PROCESSORS),
        "base_url": _IMAGE_BASE_URL,
        "images": results,
    })


# ═══════════════════════════════════════════════════════════════════════════
#  HEALTH CHECK (useful for Render / uptime monitors)
# ═══════════════════════════════════════════════════════════════════════════

@app.route("/health")
def health_check():
    """Simple health-check endpoint for deployment monitoring."""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


# ═══════════════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_ENV") != "production"
    app.run(host="0.0.0.0", port=port, debug=debug)
