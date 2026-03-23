from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class CPUProfile(db.Model):
    __tablename__ = "cpu_profiles"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    cores = db.Column(db.Integer, nullable=False)
    tdp = db.Column(db.Float, nullable=False)        # Watts
    max_temp = db.Column(db.Float, nullable=False)   # °C
    core_layout = db.Column(db.JSON, nullable=False) # list of [row, col] positions (normalized 0-1)

class SimulationHistory(db.Model):
    __tablename__ = "simulation_history"
    id = db.Column(db.Integer, primary_key=True)
    cpu_profile_id = db.Column(db.Integer, db.ForeignKey("cpu_profiles.id"), nullable=False)
    cpu_name = db.Column(db.String(100), nullable=False)
    load_percent = db.Column(db.Float, nullable=False)
    max_temp_result = db.Column(db.Float, nullable=False)
    suggestion = db.Column(db.String(300), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
