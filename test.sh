#!/usr/bin/env bash
set -euo pipefail

echo "=================================================="
echo " Running Patient Health Screening Test Suite"
echo "=================================================="

# Run unit and integration tests via Python standard unittest discovery
python3 -m unittest discover -v -s . -p "test_*.py"

echo "=================================================="
echo " All tests passed successfully."
echo "=================================================="
