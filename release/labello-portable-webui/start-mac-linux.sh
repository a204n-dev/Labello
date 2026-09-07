#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

PORT=8080

echo "=========================================================="
echo "  Labello - Vocal Labeling Workstation (Local WebUI)"
echo "=========================================================="

ROOT_DIR="$DIR"
if [ -f "$DIR/dist/index.html" ]; then
  ROOT_DIR="$DIR/dist"
fi

# Function to open browser
open_browser() {
  sleep 1
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://localhost:$PORT"
  elif command -v open >/dev/null 2>&1; then
    open "http://localhost:$PORT"
  else
    echo "Please open http://localhost:$PORT in your web browser."
  fi
}

open_browser &

echo "Starting local server at http://localhost:$PORT..."
echo "Keep this terminal open while using Labello. Press Ctrl+C to stop."

cd "$ROOT_DIR"

if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server "$PORT"
elif command -v python >/dev/null 2>&1; then
  python -m http.server "$PORT"
elif command -v bun >/dev/null 2>&1; then
  bun x serve -p "$PORT" .
elif command -v npx >/dev/null 2>&1; then
  npx --yes serve -l "$PORT" .
else
  echo "Error: No Python or web runtime found. Please install Python 3."
  exit 1
fi
