#!/usr/bin/env bash
# Launches the Tron Disc Arena on http://localhost:8080
cd "$(dirname "$0")"
PORT="${1:-8080}"
echo "TRON :: DISC ARENA  ->  http://localhost:$PORT"
if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server "$PORT"
elif command -v python >/dev/null 2>&1; then
  python -m SimpleHTTPServer "$PORT"
elif command -v npx >/dev/null 2>&1; then
  npx --yes serve -l "$PORT" .
else
  echo "Need python3 or node installed." && exit 1
fi
