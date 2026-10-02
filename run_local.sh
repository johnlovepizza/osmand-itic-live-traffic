#!/usr/bin/env bash
set -euo pipefail

mkdir -p public

python3 scripts/itic_to_gpx.py \
  --url "https://event.longdo.com/feed/json" \
  --gpx public/itic_events.gpx \
  --geojson public/itic_events.geojson \
  --json public/itic_events.json \
  --debug /tmp/itic_debug.json \
  --max-events 1000

echo "Generated:"
echo "  public/itic_events.gpx"
echo "  public/itic_events.geojson"
echo "  public/itic_events.json"
