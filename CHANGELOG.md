# Changelog

All notable changes to Ship Odditer. Dates are UTC.

## 1.2.0 (2026-11-01)

- Updates apply by themselves: the app reloads into a new version at the first quiet moment, keeps your place,
  and briefly says it was updated (no more tapping Reload).
- The toolbar stops following you at Nerd Stuff, where it isn't needed, and comes back when you scroll up.
- Fixed: tier tables in Chrome showed a vertical scrollbar that moved a pixel or two.

## 1.1.0 (2026-11-01)

A better fit on phones, and consistent text everywhere.

### Text

- One consistent set of text sizes across the page, and no text enlarged by iPhone Safari in landscape.
- Numbers within sentences are sized to sit evenly with the text around them; ship and item names with icons,
  rarity words, and Nerd Stuff terms match the case, size, and weight of their sentence; the "·" separators are evenly spaced.
- Where the target can't drop, its tier now says so plainly: "TARGET never drops from this mission".
- ★, →, ≥, ≈, and ᴇ come from a small font of our own, so they look the same on every device.

### Phones and small screens

- Tier tables show just the item icons, leaving the width for the numbers. Tap a row for its name and details.
- The whole toolbar folds behind one summary button that shows every setting as a small pill (just the icon,
  where there is one, on phones). Stars, Items, and Rarity are dropdowns there, so nothing scrolls sideways.
- Each slider gets its own full-width row in the open toolbar, so they're easy to drag. The open toolbar is a
  drawer hanging from its button.
- When a table scrolls sideways, a divider marks the edge of the pinned item column.
- The target's row in the icon-only column keeps its green highlight, without the crosshair.
- Dropdown lists stay on screen: they line up with the right edge when they'd run off it, and stop at the
  bottom of the window.

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
- Light on data: the first visit downloads about 1.5 MB (everything needed to work offline), and drop data is
  stored as exact counts.
- Always current: the site rebuilds from the latest drop data daily (GitHub Actions), and installed copies check
  for updates, download only the files that changed (about 1.1 MB for a day's new data, each file checked against
  its hash), and switch over the next time the app is in the background, while the current version keeps working
  offline.
