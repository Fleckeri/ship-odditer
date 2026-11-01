# Changelog

All notable changes to Ship Odditer. Dates are UTC.

## 1.0.0 (2026-11-01)

First public release, at <https://fleckeri.github.io/ship-odditer/>.

### Drop odds

- Per-launch drop odds for every ship, mission length, star level, and rarity, from player-logged missions
  (Menno's drop data tool, via carpetsage/egg). Uses the exact fixed-capacity model, 1 − (1 − share)^capacity.
- Tier tables with expected copies per launch, the chance of at least one, launches for your chosen odds (1–99%),
  and a heat strip across star levels. Columns line up across tiers, and nothing scrolls sideways on desktop.
- Tier summaries: the odds of getting everything in one launch, and the launches to see it all, with times.
- Live Zero-G and FTL research sliders; every number rolls smoothly to its new value.
- Low-confidence values (fewer than 5 sightings) are marked, and small or missing samples get a warning.

### Mission targets

- Target dropdown for FTL ships (Quintillion Chicken and up), using each target's own logged drops (no
  estimated multipliers). Shows how much data backs each target, in yellow when small and red when missing.
- The target is marked with a green crosshair in the tables, tooltips, reward list, and on the mission card, and
  each tier shows the launches to get it, or that it's unobtainable.
- Stone fragments are hidden from the list: targeting them is almost never worthwhile.

### Mission card and simulator

- Mission card with capacity, duration, and quality range (with explainers), plus runs and minimum time to reach
  a star level.
- Mission Reward Simulator: a simulated return grouped like the game, with rarity and tier counts. The Relaunch
  button floats in the corner once you scroll past it.

### App

- Installs as an app on iPhone, iPad, Mac, Android, Chrome, and Edge, with steps for your browser, and works
  fully offline.
- No third-party requests: fonts, data, and icons are served with the app, and nothing leaves your device.
  Content Security Policy on every page.
- Light and dark themes (or follow the system), phone layout, keyboard and screen-reader support (axe-core clean
  for ARIA and structure), and reduced-motion support.
- Rich link previews when shared, and search-engine metadata.
- Always current: the site rebuilds from the latest drop data daily (GitHub Actions), and installed copies check
  for updates, download them in the background, and switch over the next time the app is in the background,
  while the current version keeps working offline.
