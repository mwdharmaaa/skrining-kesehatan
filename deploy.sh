#!/usr/bin/env bash
set -euo pipefail

echo "=================================================="
echo " Deploying Patient Health Screening Web App"
echo "=================================================="

# Verify test suite before deployment
./test.sh

# Check if Docker is available
if command -v docker >/dev/null 2>&1; then
  echo "[*] Building and starting container via Docker Compose..."
  docker compose down --remove-orphans || true
  docker compose build
  docker compose up -d
  echo "[OK] Container running on http://localhost:8000"
else
  echo "[*] Docker not found; launching natively via Python..."
  nohup python3 app.py > server.log 2>&1 &
  echo "[OK] Python server running on http://localhost:8000 (PID: $!)"
fi
