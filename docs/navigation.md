# Making iTIC traffic affect actual navigation

The GPX feed in this repo is display-only.

To make OsmAnd calculate routes using iTIC traffic, traffic data must enter the router and modify road cost/speed.

## Required pipeline

```text
iTIC traffic feed
   ↓
parse traffic links / events
   ↓
match iTIC road links to OSM/OsmAnd road segments
   ↓
assign speed penalty or road block
   ↓
OsmAnd router uses modified speeds/costs
   ↓
route avoids traffic
```

## Real options

### Option 1: Fork OsmAnd

Patch OsmAnd so its router reads a local iTIC traffic cache.

This is the only true native OsmAnd live-routing path.

You need to:

1. Build OsmAnd from source.
2. Add an iTIC traffic fetcher.
3. Match iTIC links/TMC codes to OSM ways/OsmAnd segments.
4. Store traffic factors in a fast cache.
5. Patch router edge costing.
6. Trigger route recalculation when traffic changes.

Traffic factor example:

```text
green  = 1.0
yellow = 0.7
orange = 0.4
red    = 0.15
closed = blocked
```

### Option 2: External traffic router

Use GraphHopper, Valhalla, OSRM, or pgRouting.

Flow:

```text
iTIC + OSM → your traffic-aware router → GPX route → OsmAnd
```

This is easier than patching OsmAnd, but OsmAnd may not continuously reroute using your traffic router.

### Option 3: TMC bridge

Feed iTIC TMC data into Android/OsmAnd if your OsmAnd build supports external TMC.

This is limited and poorly documented.

## Hardest part

The hardest part is not fetching iTIC.

The hardest part is:

```text
iTIC road/link/TMC data → OSM/OsmAnd road segment mapping
```

Without that mapping, navigation cannot apply traffic penalties.
