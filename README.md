# Ship Odditer

[![Build and deploy](https://github.com/Fleckeri/ship-odditer/actions/workflows/deploy.yml/badge.svg)](https://github.com/Fleckeri/ship-odditer/actions/workflows/deploy.yml)
[![Release](https://img.shields.io/github/v/release/Fleckeri/ship-odditer)](https://github.com/Fleckeri/ship-odditer/releases/latest)
[![Data updated](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Ffleckeri.github.io%2Fship-odditer%2Fversion.json&query=%24.data&label=data%20updated&color=blue)](https://fleckeri.github.io/ship-odditer/)
[![License: MIT](https://img.shields.io/github/license/Fleckeri/ship-odditer)](LICENSE)
[![Stars](https://img.shields.io/github/stars/Fleckeri/ship-odditer)](https://github.com/Fleckeri/ship-odditer/stargazers)

**Egg Inc. Mission Drop Calculator.** Drop odds for every Egg, Inc. ship, mission length, target, and star
level, measured from player-logged missions. Adjusts to your Zero-G and FTL research, and simulates a launch's
rewards.

**Use it at <https://fleckeri.github.io/ship-odditer/>.** Version 1.4.0 · [Changelog](CHANGELOG.md)

## Features

- **Drop odds for every tier** of artifacts, stones, and ingredients:
  - expected copies per launch, by rarity;
  - the chance of at least one in a single launch;
  - how many launches you need for the odds you choose (1–99%), with the time that takes;
  - a heat strip across every star level;
  - tier summaries: the odds of getting everything in one launch, and the launches to see it all.
- **Mission targets** for FTL ships (Quintillion Chicken and up), using each target's own logged drops. Shows
  the launches to get your target in each tier, highlights it in the tables, and flags thin samples.
- **Mission card**: capacity, duration, and quality range (with explainers), plus the runs and minimum time to
  reach a star level.
- **Epic research sliders** for Zero-G Quantum Containment (capacity) and FTL Drive Upgrades (time). Every number
  updates live.
- **Mission Reward Simulator**: a simulated return grouped like the game, with rarity and tier counts. Relaunch
  as often as you like.
- **Share** what you're looking at as a short link (it opens exactly the same view, research included), or your
  simulated haul as a picture.
- **Tooltips** for every item (effects, slots, and odds per rarity), every column, and the mission stats.
- **Honest about data quality**: values resting on few sightings are marked, and missions or targets with small
  samples are flagged.
- **Always current**: the drop data refreshes daily, and installed copies update themselves.
- **Installs as an app and works offline**, with home-screen shortcuts to the newest ships and the simulator
  (long-press the icon). Light and dark themes, phone-friendly, keyboard and screen-reader
  accessible. No accounts, no tracking, no third-party requests: nothing leaves your device.

## Use it

Open <https://fleckeri.github.io/ship-odditer/>. Browsers that can install it show the steps for your device at
the top of the page (or tap "Can be installed to your device."). Once installed, it opens like an app and works
without a connection.

## How the numbers work (short version)

- Drop shares come from player-logged missions, kept separately for each mission target.
- Each launch returns *capacity* items, each drawn independently, so the chance of at least one copy of an item
  is 1 − (1 − share)^capacity.
- Capacity, durations, quality, and star thresholds follow the game's mission parameters, using the same
  formulas as the wasmegg tools.
- The full method is in the page's "Nerd Stuff" section and in [CLAUDE.md](CLAUDE.md).

## Credits

- **Menno**: the drop data comes from players who contribute missions to Menno's drop data tool. You can opt in
  from the [Rockets Tracker](https://wasmegg-carpet.netlify.app/rockets-tracker/).
- **CarpetSage** ([@carpetsage](https://github.com/carpetsage)):
  - [carpetsage/egg](https://github.com/carpetsage/egg) provides the drop data export, mission parameters, and
    item data, and the formulas match its `lib/missions.ts`;
  - [wasmegg-carpet](https://wasmegg-carpet.netlify.app/) is the live tool site;
  - [carpetsage/eggincassets](https://github.com/carpetsage/eggincassets) provides the item and ship images.
- **@mk2 / fanaticscripter**: the original [egg tools](https://github.com/fanaticscripter/egg) that
  carpetsage/egg forks (MIT).
- **Lucide**: [lucide-icons/lucide](https://github.com/lucide-icons/lucide) icons (ISC).
- **Fonts**: [Chakra Petch](https://github.com/m4rc1e/Chakra-Petch) and
  [Atkinson Hyperlegible](https://www.brailleinstitute.org/freefont/) (SIL Open Font License 1.1).
- Egg, Inc. and its artwork belong to [Auxbrain](https://www.auxbrain.com/). This project is a fan-made tool and
  is **not affiliated with Auxbrain**.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, the build pipeline, and testing, and [CLAUDE.md](CLAUDE.md) for
the full technical notes: formulas, data format, page architecture, and design decisions.

```bash
tools/update_data.sh      # fetch the latest drop data and build the site into docs/
node tests/smoke.js       # check it
```

The live site is built and deployed by GitHub Actions on every push and once a day, so it always has the latest
drop data. Installed copies update themselves and keep working offline.

## License

Code: [MIT](LICENSE). The bundled data, images, icons, and fonts keep their own terms; see
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
