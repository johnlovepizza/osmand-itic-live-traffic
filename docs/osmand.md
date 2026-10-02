# OsmAnd Import

## Easiest method

Open this URL on your phone:

```text
https://raw.githubusercontent.com/YOUR_USERNAME/osmand-itic-live-traffic/main/public/itic_events.gpx
```

Your browser should download it. Open the downloaded file with OsmAnd.

## Manual method

Download `itic_events.gpx` and copy it to your phone.

Then import it in OsmAnd.

Depending on your OsmAnd version, look under:

```text
Menu → My Places → Tracks
```

or:

```text
Menu → Configure map → GPX/track overlay
```

## Auto refresh

OsmAnd does not automatically keep refreshing remote GPX files by itself.

You can automate re-download using:

- HTTP Request Shortcuts
- Tasker
- Termux script
- MacroDroid
- Automate

The target file is always:

```text
https://raw.githubusercontent.com/YOUR_USERNAME/osmand-itic-live-traffic/main/public/itic_events.gpx
```
