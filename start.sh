#!/bin/bash
# Start both SAM server and Memory Palace dev server
# Usage: ./start.sh

DIR="$(cd "$(dirname "$0")" && pwd)"
SAM_DIR="$HOME/utils/sam-server"

cleanup() {
  echo "Stopping servers..."
  [[ -n "$SAM_PID" ]] && kill "$SAM_PID" 2>/dev/null
  [[ -n "$DEV_PID" ]] && kill "$DEV_PID" 2>/dev/null
  exit 0
}
trap cleanup INT TERM

# Start SAM server
if [[ -d "$SAM_DIR" ]]; then
  echo "Starting SAM server on :8000..."
  cd "$SAM_DIR" && uv run server.py &
  SAM_PID=$!
  cd "$DIR"
  sleep 2
else
  echo "WARNING: SAM server not found at $SAM_DIR"
  echo "         Segmentation/image picker will not work."
fi

# Start dev server
echo "Starting Memory Palace dev server on :5174..."
npm run dev &
DEV_PID=$!

echo ""
echo "Memory Palace:  http://localhost:5174"
echo "SAM Server:     http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop both."

wait
