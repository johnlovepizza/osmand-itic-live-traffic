# Next steps

## 1. Push to GitHub

If you have GitHub CLI:

```bash
gh repo create osmand-itic-live-traffic --public --source=. --remote=origin --push
```

Or manually:

```bash
git remote add origin https://github.com/YOUR_USERNAME/osmand-itic-live-traffic.git
git push -u origin main
```

## 2. Run GitHub Action

Go to:

```text
https://github.com/YOUR_USERNAME/osmand-itic-live-traffic/actions
```

Run:

```text
update-itic-feed
```

## 3. Use the generated GPX

After Action finishes:

```text
https://raw.githubusercontent.com/YOUR_USERNAME/osmand-itic-live-traffic/main/public/itic_events.gpx
```

Open that on your phone and import into OsmAnd.

## 4. Navigation calculation

For actual routing, read:

```text
docs/navigation.md
router/README.md
```
