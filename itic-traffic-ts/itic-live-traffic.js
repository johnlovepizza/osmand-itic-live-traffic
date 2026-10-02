const https = require("https");
const http = require("http");
const fs = require("fs/promises");
const path = require("path");

// Constants mapping the original Python sets/lists
const LAT_KEYS = new Set(["lat", "latitude", "y", "point_lat", "latlng_lat"]);
const LON_KEYS = new Set(["lon", "lng", "long", "longitude", "x", "point_lon"]);
const COORD_KEYS = new Set(["latlng", "location", "coordinate", "coordinates", "coord", "coords", "point", "geo", "geolocation"]);
const NAME_KEYS = new Set(["title", "name", "text", "message", "event", "type", "topic", "subject"]);
const DESC_KEYS = new Set(["description", "desc", "detail", "details", "message", "text", "note"]);
const TIME_KEYS = new Set(["timestamp", "time", "date", "created", "created_at", "updated", "updated_at", "lastupdate", "last_update", "event_time"]);
const ITEM_LIST_KEYS = ["events", "items", "data", "results", "features", "records", "incidents"];

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith("https:") ? https : http;
        const req = client.get(url, { headers: { "User-Agent": "osmand-itic-live-traffic/1.0" } }, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => resolve(data));
        });
        req.on("error", reject);
    });
}

function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

function toFloat(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === "number") return value;
    if (typeof value === "string") {
        const text = value.trim();
        if (!text) return null;
        const num = parseFloat(text);
        return isNaN(num) ? null : num;
    }
    return null;
}

function validCoord(lat, lon) {
    return (
        lat !== null &&
        lon !== null &&
        lat >= -90 && lat <= 90 &&
        lon >= -180 && lon <= 180
    );
}

function parseCoordValue(value) {
    if (Array.isArray(value) && value.length >= 2) {
        const a = toFloat(value[0]);
        const b = toFloat(value[1]);

        if (validCoord(a, b)) return [a, b];
        if (validCoord(b, a)) return [b, a];
        return null;
    }

    if (typeof value === "string") {
        const parts = value.trim().split(/[,;\s]+/);
        const numbers = [];

        for (const part of parts) {
            const num = toFloat(part);
            if (num !== null) numbers.push(num);
        }

        if (numbers.length >= 2) {
            const a = numbers[0];
            const b = numbers[1];

            if (validCoord(a, b)) return [a, b];
            if (validCoord(b, a)) return [b, a];
        }
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
        return findCoord(value);
    }

    return null;
}

function findCoord(obj, depth = 0) {
    if (depth > 8) return null;

    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        if (obj.type === "Feature") {
            const geometry = obj.geometry;
            if (geometry && typeof geometry === "object" && geometry.type === "Point") {
                const parsed = parseCoordValue(geometry.coordinates);
                if (parsed) return parsed;
            }
        }

        if (obj.type === "Point" && "coordinates" in obj) {
            const parsed = parseCoordValue(obj.coordinates);
            if (parsed) return parsed;
        }

        let lat = null;
        let lon = null;

        for (const [key, value] of Object.entries(obj)) {
            const keyLower = key.toLowerCase();
            if (LAT_KEYS.has(keyLower)) lat = toFloat(value);
            if (LON_KEYS.has(keyLower)) lon = toFloat(value);
        }

        if (validCoord(lat, lon)) return [lat, lon];

        for (const [key, value] of Object.entries(obj)) {
            const keyLower = key.toLowerCase();
            if (COORD_KEYS.has(keyLower) || keyLower.endsWith("_coord") || keyLower.endsWith("_coords")) {
                const parsed = parseCoordValue(value);
                if (parsed) return parsed;
            }
        }

        if (obj.properties && typeof obj.properties === "object") {
            const parsed = findCoord(obj.properties, depth + 1);
            if (parsed) return parsed;
        }

        for (const value of Object.values(obj)) {
            const parsed = findCoord(value, depth + 1);
            if (parsed) return parsed;
        }
    } else if (Array.isArray(obj)) {
        for (const value of obj) {
            const parsed = findCoord(value, depth + 1);
            if (parsed) return parsed;
        }
    }

    return null;
}

function findText(obj, keys, depth = 0) {
    if (depth > 8) return null;

    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        if (obj.properties && typeof obj.properties === "object") {
            const found = findText(obj.properties, keys, depth + 1);
            if (found) return found;
        }

        for (const [key, value] of Object.entries(obj)) {
            const keyLower = key.toLowerCase();
            if (keys.has(keyLower) && (typeof value === "string" || typeof value === "number")) {
                const text = String(value).trim();
                if (text) return text;
            }
        }

        for (const value of Object.values(obj)) {
            const found = findText(value, keys, depth + 1);
            if (found) return found;
        }
    } else if (Array.isArray(obj)) {
        for (const value of obj) {
            const found = findText(value, keys, depth + 1);
            if (found) return found;
        }
    }

    return null;
}

function parseTimeValue(value) {
    if (value === null || value === undefined) return null;

    if (typeof value === "number") {
        let timestamp = value;
        if (timestamp > 1_000_000_000_000) {
            timestamp /= 1000.0;
        }
        const d = new Date(timestamp * 1000);
        return isNaN(d.getTime()) ? null : d;
    }

    if (typeof value === "string") {
        const text = value.trim();
        if (!text) return null;

        if (/^\d+$/.test(text)) {
            return parseTimeValue(parseFloat(text));
        }

        let isoText = text;
        if (isoText.endsWith("Z")) {
            isoText = isoText.slice(0, -1) + "+00:00";
        }
        
        const d = new Date(isoText);
        return isNaN(d.getTime()) ? null : d;
    }

    return null;
}

function findTime(obj, depth = 0) {
    if (depth > 8) return null;

    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        for (const [key, value] of Object.entries(obj)) {
            const keyLower = key.toLowerCase();
            if (TIME_KEYS.has(keyLower)) {
                const parsed = parseTimeValue(value);
                if (parsed) return parsed;
            }
        }

        if (obj.properties && typeof obj.properties === "object") {
            const parsed = findTime(obj.properties, depth + 1);
            if (parsed) return parsed;
        }

        for (const value of Object.values(obj)) {
            const parsed = findTime(value, depth + 1);
            if (parsed) return parsed;
        }
    } else if (Array.isArray(obj)) {
        for (const value of obj) {
            const parsed = findTime(value, depth + 1);
            if (parsed) return parsed;
        }
    }

    return null;
}

function extractItems(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (data && typeof data === "object") {
        if (data.type === "FeatureCollection" && Array.isArray(data.features)) {
            return data.features;
        }

        for (const key of ITEM_LIST_KEYS) {
            const value = data[key];
            if (Array.isArray(value)) {
                return value;
            }
        }

        for (const value of Object.values(data)) {
            if (Array.isArray(value)) {
                return value;
            }
        }

        return [data];
    }

    return [];
}

async function main() {
    const url = "https://event.longdo.com/feed/json";
    console.log(`Fetching data from ${url}...`);
    
    let text;
    try {
        text = await fetchUrl(url);
    } catch (err) {
        console.error("Failed to fetch feed:", err);
        process.exit(1);
    }

    let data;
    try {
        data = JSON.parse(text);
    } catch (err) {
        console.error("Feed is not valid JSON:", err);
        process.exit(1);
    }

    const items = extractItems(data);
    console.log(`Found ${items.length} total items.`);
    
    const normalized = [];
    const features = [];
    
    let gpx = `<?xml version="1.0" encoding="utf-8"?>\n`;
    gpx += `<gpx version="1.1" creator="osmand-itic-live-traffic" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">\n`;
    gpx += `  <metadata>\n`;
    gpx += `    <name>iTIC live events</name>\n`;
    gpx += `    <desc>Generated from iTIC/Longdo open feeds. Data belongs to iTIC/Longdo.</desc>\n`;
    gpx += `  </metadata>\n`;

    const maxEvents = 1000;
    for (const item of items) {
        if (normalized.length >= maxEvents) break;

        const coord = findCoord(item);
        if (!coord) continue;

        const [lat, lon] = coord;
        const name = (findText(item, NAME_KEYS) || "iTIC event").slice(0, 200);
        const desc = (findText(item, DESC_KEYS) || "").slice(0, 2000);
        const timeValue = findTime(item) || new Date();

        gpx += `  <wpt lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}">\n`;
        gpx += `    <name>${escapeXml(name)}</name>\n`;
        if (desc) {
            gpx += `    <desc>${escapeXml(desc)}</desc>\n`;
        }
        gpx += `    <time>${timeValue.toISOString()}</time>\n`;
        gpx += `    <type>iTIC</type>\n`;
        gpx += `  </wpt>\n`;

        normalized.push({
            lat,
            lon,
            name,
            description: desc,
            time: timeValue.toISOString(),
        });

        features.push({
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [lon, lat],
            },
            properties: {
                name,
                description: desc,
                time: timeValue.toISOString(),
                source: "iTIC/Longdo",
            },
        });
    }
    
    gpx += `</gpx>\n`;

    const outDir = "public";
    await fs.mkdir(outDir, { recursive: true });

    await fs.writeFile(path.join(outDir, "itic_events.gpx"), gpx, "utf-8");
    console.log("Generated public/itic_events.gpx");

    const geojson = {
        type: "FeatureCollection",
        features,
    };
    await fs.writeFile(path.join(outDir, "itic_events.geojson"), JSON.stringify(geojson, null, 2), "utf-8");
    console.log("Generated public/itic_events.geojson");

    await fs.writeFile(path.join(outDir, "itic_events.json"), JSON.stringify(normalized, null, 2), "utf-8");
    console.log("Generated public/itic_events.json");

    console.log(`total_items=${items.length} events_with_coords=${normalized.length}`);
}

main();
