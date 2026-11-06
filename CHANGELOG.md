# Changelog

All notable changes to Ship Odditer. Dates are UTC.

## 1.4.2 (2026-11-06)

- Opening the site in Chrome or Edge after installing the app says it's installed, instead of offering to install it
  again.
- After an update, the note says what changed (a new version, new drop data, or both) and stays for 4 seconds of time
  on screen, so switching away doesn't make you miss it.
- The intro says everything runs locally and nothing leaves your device, and "Installed to your device." now lines up
  with the text around it.

## 1.4.1 (2026-11-02)

- Sharing the simulated haul from a phone also sends a link to the same view, so whoever sees the picture can open
  that mission.

## 1.4.0 (2026-11-02)

- Share what you're looking at: the button on the mission card opens the share sheet on phones and copies a link on
  computers. The short link opens exactly the same view: ship, length, stars, target, table options, research, odds,
  and capacity event. Opening one saves it as your settings and leaves the address bar clean.
- Share your simulated haul as a picture (or save it, on computers).
- Installed, long-press the app icon (or right-click it on a computer) for shortcuts to the three newest ships'
  extended missions and the simulator. They keep your star level, target, and research.
- Chrome and Edge show screenshots in the install dialog, and iPhones and iPads show the app's eggs instead of a
  white screen while the installed app starts.
- Switching themes spreads the new one from the button; switching ships flies the old one out and the new one in.
- Android phones buzz when a relaunch brings a legendary.
- Installed copies ask the browser to keep their offline data even when the device is low on space.

## 1.3.0 (2026-11-02)

- A capacity event toggle beside Target: click once for double capacity, twice for triple (the rare 3× events), and a
  third time to turn it off. Capacity, the odds, and the simulator follow, and the mission card says which event is on.
- Tier tables keep their column labels in view while you scroll through them, and the toolbar casts a soft shadow
  once it sticks, so it's clearly separate from what scrolls beneath it.
- Shorter tier summaries ("All in one launch" · "At 50% odds: all in 412 launches, ⌖ target in 12"), and the
  single-rarity share column is now headed "% legendary" (or whichever rarity is chosen).
- The simulator shows stone fragments in their own group at the end, in both the tiles and the list, and each group's
  header stays in view while you scroll through it. Tier 1 in the Stones tables is now called "stone fragments".
- For development: `npm run dev` serves the site locally and rebuilds and reloads it on every save.

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
