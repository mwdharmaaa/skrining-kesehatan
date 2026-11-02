#!/usr/bin/env bash
set -euo pipefail

echo "=================================================="
echo " Redeploying Patient Health Screening Web App"
echo "=================================================="

./test.sh

if command -v docker >/dev/null 2>&1; then
  docker compose down --remove-orphans || true
  docker compose build --no-cache
  docker compose up -d
  echo "[OK] Redeployment complete on http://localhost:8000"
else
  pkill -f "python3 app.py" || true
  nohup python3 app.py > server.log 2>&1 &
  echo "[OK] Redeployment complete (native Python PID: $!)"
fi
