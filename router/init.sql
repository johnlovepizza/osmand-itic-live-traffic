-- Example tables for iTIC traffic-aware routing.
--
-- You still need to load OpenStreetMap Thailand data into PostGIS,
-- usually with osm2pgsql, and create pgRouting topology.

CREATE TABLE IF NOT EXISTS itic_traffic_links (
    itic_link_id TEXT PRIMARY KEY,
    road_name TEXT,
    congestion_level INTEGER,
    speed_kmh DOUBLE PRECISION,
    blocked BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS itic_osm_mapping (
    itic_link_id TEXT REFERENCES itic_traffic_links(itic_link_id),
    osm_way_id BIGINT,
    PRIMARY KEY (itic_link_id, osm_way_id)
);

CREATE TABLE IF NOT EXISTS traffic_speed (
    osm_way_id BIGINT PRIMARY KEY,
    speed_kmh DOUBLE PRECISION,
    blocked BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
