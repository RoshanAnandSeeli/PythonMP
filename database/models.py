"""
Database models for Thermal OS.

Tables:
  cpu_profiles        — Pre-loaded CPU/GPU hardware profiles with core layouts.
  simulation_history  — Results from each simulation run (profile + live mode).
"""

from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class CPUProfile(db.Model):
    """
    Stores a hardware profile for a specific CPU or GPU.

    Fields:
        name        — Human-readable chip name (e.g. "Intel Core i9-13900K")
        cores       — Number of processing cores (used for display)
        tdp         — Thermal Design Power in Watts (affects simulation conductivity)
        max_temp    — Maximum rated temperature in °C (used as heat source temp)
        core_layout — JSON list of [row, col] positions normalised to 0–1 range
    """
    __tablename__ = "cpu_profiles"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    cores = db.Column(db.Integer, nullable=False)
    tdp = db.Column(db.Float, nullable=False)
    max_temp = db.Column(db.Float, nullable=False)
    core_layout = db.Column(db.JSON, nullable=False)


class SimulationHistory(db.Model):
    """
    Stores the result of each simulation run for historical comparison.

    Fields:
        cpu_profile_id — FK to the profile used
        cpu_name       — Denormalised name for quick display
        load_percent   — CPU load percentage used in the simulation (10–100)
        max_temp_result— Peak temperature from the simulation grid
        suggestion     — AI cooling recommendation text
        timestamp      — When the simulation was run (UTC)
    """
    __tablename__ = "simulation_history"

    id = db.Column(db.Integer, primary_key=True)
    cpu_profile_id = db.Column(
        db.Integer, db.ForeignKey("cpu_profiles.id"), nullable=False
    )
    cpu_name = db.Column(db.String(100), nullable=False)
    load_percent = db.Column(db.Float, nullable=False)
    max_temp_result = db.Column(db.Float, nullable=False)
    suggestion = db.Column(db.String(300), nullable=False)
    timestamp = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
    )
