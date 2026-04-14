#!/bin/bash

PORT=5000

echo "Starting Flask app on port $PORT..."

cd "$(dirname "$0")/.."

python3 -u webapp/app.py