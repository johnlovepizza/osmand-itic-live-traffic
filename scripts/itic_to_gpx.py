#!/usr/bin/env python3
import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests
import xml.etree.ElementTree as ET

UA = {
    "User-Agent": "osmand-itic-live-traffic/1.0 (+https://github.com/)"
}

LAT_KEYS = {
    "lat",
    "latitude",
    "y",
    "point_lat",
    "latlng_lat",
}

LON_KEYS = {
    "lon",
    "lng",
    "long",
    "longitude",
    "x",
    "point_lon",
}

COORD_KEYS = {
    "latlng",
    "location",
    "coordinate",
    "coordinates",
    "coord",
    "coords",
    "point",
    "geo",
    "geolocation",
}

NAME_KEYS = {
    "title",
    "name",
    "text",
    "message",
    "event",
    "type",
    "topic",
    "subject",
}

DESC_KEYS = {
    "description",
    "desc",
    "detail",
    "details",
    "message",
    "text",
    "note",
}

TIME_KEYS = {
    "timestamp",
    "time",
    "date",
    "created",
    "created_at",
    "updated",
    "updated_at",
    "lastupdate",
    "last_update",
    "event_time",
}

ITEM_LIST_KEYS = {
    "events",
    "items",
    "data",
    "results",
    "features",
    "records",
    "incidents",
}


def to_float(value):
    try:
        if isinstance(value, (int, float)):
            return float(value)

        text = str(value).strip()
        if not text:
            return None

        return float(text)
    except Exception:
        return None


def valid_coord(lat, lon):
    return (
        lat is not None
        and lon is not None
        and -90 <= lat <= 90
        and -180 <= lon <= 180
    )


def parse_coord_value(value):
    if isinstance(value, (list, tuple)) and len(value) >= 2:
        a = to_float(value[0])
        b = to_float(value[1])

        if valid_coord(a, b):
            return a, b

        if valid_coord(b, a):
            return b, a

        return None

    if isinstance(value, str):
        text = value.strip()
        parts = re.split(r"[,;\s]+", text)
        numbers = []

        for part in parts:
            number = to_float(part)
            if number is not None:
                numbers.append(number)

        if len(numbers) >= 2:
            a = numbers[0]
            b = numbers[1]

            if valid_coord(a, b):
                return a, b

            if valid_coord(b, a):
                return b, a

    if isinstance(value, dict):
        return find_coord(value)

    return None


def find_coord(obj, depth=0):
    if depth > 8:
        return None

    if isinstance(obj, dict):
        if obj.get("type") == "Feature":
            geometry = obj.get("geometry")

            if isinstance(geometry, dict) and geometry.get("type") == "Point":
                coordinates = geometry.get("coordinates")
                parsed = parse_coord_value(coordinates)

                if parsed:
                    return parsed

        if obj.get("type") == "Point" and "coordinates" in obj:
            parsed = parse_coord_value(obj.get("coordinates"))

            if parsed:
                return parsed

        lat = None
        lon = None

        for key, value in obj.items():
            key_lower = str(key).lower()

            if key_lower in LAT_KEYS:
                lat = to_float(value)

            if key_lower in LON_KEYS:
                lon = to_float(value)

        if valid_coord(lat, lon):
            return lat, lon

        for key, value in obj.items():
            key_lower = str(key).lower()

            if key_lower in COORD_KEYS or key_lower.endswith("_coord") or key_lower.endswith("_coords"):
                parsed = parse_coord_value(value)

                if parsed:
                    return parsed

        if isinstance(obj.get("properties"), dict):
            parsed = find_coord(obj["properties"], depth + 1)

            if parsed:
                return parsed

        for value in obj.values():
            parsed = find_coord(value, depth + 1)

            if parsed:
                return parsed

    elif isinstance(obj, list):
        for value in obj:
            parsed = find_coord(value, depth + 1)

            if parsed:
                return parsed

    return None


def find_text(obj, keys, depth=0):
    if depth > 8:
        return None

    if isinstance(obj, dict):
        if isinstance(obj.get("properties"), dict):
            found = find_text(obj["properties"], keys, depth + 1)

            if found:
                return found

        for key, value in obj.items():
            key_lower = str(key).lower()

            if key_lower in keys and isinstance(value, (str, int, float)):
                text = str(value).strip()

                if text:
                    return text

        for value in obj.values():
            found = find_text(value, keys, depth + 1)

            if found:
                return found

    elif isinstance(obj, list):
        for value in obj:
            found = find_text(value, keys, depth + 1)

            if found:
                return found

    return None


def parse_time_value(value):
    if value is None:
        return None

    if isinstance(value, (int, float)):
        timestamp = float(value)

        if timestamp > 1_000_000_000_000:
            timestamp /= 1000.0

        try:
            return datetime.fromtimestamp(timestamp, tz=timezone.utc)
        except Exception:
            return None

    if isinstance(value, str):
        text = value.strip()

        if not text:
            return None

        if re.fullmatch(r"\d+", text):
            return parse_time_value(float(text))

        try:
            if text.endswith("Z"):
                text = text[:-1] + "+00:00"

            parsed = datetime.fromisoformat(text)

            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)

            return parsed
        except Exception:
            return None

    return None


def find_time(obj, depth=0):
    if depth > 8:
        return None

    if isinstance(obj, dict):
        for key, value in obj.items():
            key_lower = str(key).lower()

            if key_lower in TIME_KEYS:
                parsed = parse_time_value(value)

                if parsed:
                    return parsed

        if isinstance(obj.get("properties"), dict):
            parsed = find_time(obj["properties"], depth + 1)

            if parsed:
                return parsed

        for value in obj.values():
            parsed = find_time(value, depth + 1)

            if parsed:
                return parsed

    elif isinstance(obj, list):
        for value in obj:
            parsed = find_time(value, depth + 1)

            if parsed:
                return parsed

    return None


def extract_items(data):
    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        if data.get("type") == "FeatureCollection" and isinstance(data.get("features"), list):
            return data["features"]

        for key in ITEM_LIST_KEYS:
            value = data.get(key)

            if isinstance(value, list):
                return value

        for value in data.values():
            if isinstance(value, list):
                return value

        return [data]

    return []


def main():
    parser = argparse.ArgumentParser(
        description="Convert iTIC/Longdo JSON feed into GPX/GeoJSON for OsmAnd."
    )

    parser.add_argument("--url", required=True)
    parser.add_argument("--gpx", required=True)
    parser.add_argument("--geojson")
    parser.add_argument("--json")
    parser.add_argument("--debug")
    parser.add_argument("--max-events", type=int, default=1000)

    args = parser.parse_args()

    response = requests.get(args.url, headers=UA, timeout=60)
    response.raise_for_status()

    content_type = response.headers.get("Content-Type", "")
    text = response.text

    try:
        if "json" in content_type:
            data = response.json()
        else:
            data = json.loads(text)
    except Exception:
        print("Feed is not JSON.", file=sys.stderr)
        print("Content-Type:", content_type, file=sys.stderr)
        print(text[:1000], file=sys.stderr)
        sys.exit(2)

    if args.debug:
        debug_path = Path(args.debug)
        debug_path.parent.mkdir(parents=True, exist_ok=True)

        debug_path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2)[:5_000_000],
            encoding="utf-8",
        )

    items = extract_items(data)
    normalized = []
    features = []

    gpx = ET.Element(
        "gpx",
        {
            "version": "1.1",
            "creator": "osmand-itic-live-traffic",
            "xmlns": "http://www.topografix.com/GPX/1/1",
            "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
            "xsi:schemaLocation": "http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd",
        },
    )

    metadata = ET.SubElement(gpx, "metadata")
    ET.SubElement(metadata, "name").text = "iTIC live events"
    ET.SubElement(
        metadata,
        "desc",
    ).text = "Generated from iTIC/Longdo open feeds. Data belongs to iTIC/Longdo."

    for item in items:
        if len(normalized) >= args.max_events:
            break

        coord = find_coord(item)

        if not coord:
            continue

        lat, lon = coord

        name = find_text(item, NAME_KEYS) or "iTIC event"
        desc = find_text(item, DESC_KEYS) or ""
        time_value = find_time(item) or datetime.now(timezone.utc)

        name = str(name)[:200]
        desc = str(desc)[:2000]

        wpt = ET.SubElement(
            gpx,
            "wpt",
            {
                "lat": f"{lat:.6f}",
                "lon": f"{lon:.6f}",
            },
        )

        ET.SubElement(wpt, "name").text = name

        if desc:
            ET.SubElement(wpt, "desc").text = desc

        ET.SubElement(wpt, "time").text = time_value.isoformat()
        ET.SubElement(wpt, "type").text = "iTIC"

        normalized.append(
            {
                "lat": lat,
                "lon": lon,
                "name": name,
                "description": desc,
                "time": time_value.isoformat(),
            }
        )

        features.append(
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [lon, lat],
                },
                "properties": {
                    "name": name,
                    "description": desc,
                    "time": time_value.isoformat(),
                    "source": "iTIC/Longdo",
                },
            }
        )

    gpx_path = Path(args.gpx)
    gpx_path.parent.mkdir(parents=True, exist_ok=True)

    xml_bytes = ET.tostring(gpx, encoding="utf-8")
    gpx_path.write_bytes(b'<?xml version="1.0" encoding="utf-8"?>\n' + xml_bytes)

    if args.geojson:
        geojson_path = Path(args.geojson)
        geojson_path.parent.mkdir(parents=True, exist_ok=True)

        geojson = {
            "type": "FeatureCollection",
            "features": features,
        }

        geojson_path.write_text(
            json.dumps(geojson, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    if args.json:
        json_path = Path(args.json)
        json_path.parent.mkdir(parents=True, exist_ok=True)

        json_path.write_text(
            json.dumps(normalized, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    print(f"total_items={len(items)} events_with_coords={len(normalized)}")


if __name__ == "__main__":
    main()
