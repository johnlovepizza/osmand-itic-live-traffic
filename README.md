# OsmAnd iTIC Live Traffic Feed

This repo converts public iTIC/Longdo traffic incident data into GPX/GeoJSON files that can be imported into OsmAnd.

This is an external feed/overlay. It does **not** make OsmAnd route around traffic by itself.

## Generated files

After GitHub Actions runs, these files are updated:

```text
public/itic_events.gpx
public/itic_events.geojson
public/itic_events.json
```

## Raw URLs

Replace `YOUR_USERNAME` with your GitHub username.

GPX:

```text
https://raw.githubusercontent.com/YOUR_USERNAME/osmand-itic-live-traffic/main/public/itic_events.gpx
```

GeoJSON:

```text
https://raw.githubusercontent.com/YOUR_USERNAME/osmand-itic-live-traffic/main/public/itic_events.geojson
```

JSON:

```text
https://raw.githubusercontent.com/YOUR_USERNAME/osmand-itic-live-traffic/main/public/itic_events.json
```

## Use in OsmAnd

1. Open the raw GPX URL on your phone.
2. Download/open it with OsmAnd.
3. Show it as a GPX track/overlay.

Or manually copy the GPX file into OsmAnd's tracks folder and import it.

## Local test

```bash
python3 -m pip install -r requirements.txt
./run_local.sh
```

## Update frequency

GitHub Actions updates the feed every 10 minutes.

GitHub raw file caching may delay updates by a few minutes.

## Data source

Traffic data is from iTIC/Longdo open feeds.

- https://iticfoundation.org/
- https://traffic.longdo.com/feed/

Respect their terms and rate limits.
