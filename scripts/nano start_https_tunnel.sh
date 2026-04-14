#!/bin/bash

PORT=5000

echo "Starting HTTPS tunnel for localhost:$PORT ..."
echo "If prompted, approve installation."

cd "$(dirname "$0")/.."

npx localtunnel --port $PORT