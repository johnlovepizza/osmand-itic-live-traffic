# Traffic-aware routing scaffold

This folder is a starter for the real navigation-calculated traffic system.

The GPX feed in the root repo is display-only.

For actual routing, you need a routing engine plus live traffic matching.

## Possible stack

- PostGIS
- pgRouting
- osm2pgsql
- Thailand OSM PBF
- iTIC traffic feed
- Python matcher

## Flow

```text
Thailand OSM PBF → PostGIS
iTIC feed → normalized traffic table
matcher maps iTIC links → OSM ways
pgRouting calculates route using traffic-modified cost
route exported as GPX
GPX opened in OsmAnd
```

## Files

- `docker-compose.yml` starts PostGIS.
- `init.sql` creates example traffic tables.
- `example_route.sql` shows the shape of traffic-aware routing SQL.

This is not a complete routing system yet. It is the scaffold for the real navigation pipeline.
