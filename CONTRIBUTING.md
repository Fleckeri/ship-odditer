# Contributing to Ship Odditer

Thanks for helping. Read [CLAUDE.md](CLAUDE.md) first: it explains the formulas, the data format, how the
page is built, and which design decisions are settled.

## Setup

1. Install **Python 3.10+** with Pillow and NumPy (`pip install pillow numpy`; add `scipy` only if you re-run
   `tools/fit_egg.py`).
2. Install **Node 18+**, then `npm install` and `npx playwright install chromium` for the tests.
3. Build everything once: `tools/update_data.sh`. It clones just the needed parts of the upstream data and
   image repos into `vendor/` (git-ignored), builds the data, and builds the site into `docs/` (also git-ignored).

## Making changes

- **UI and logic** live in one file: `app/ship-odditer.html` (CSS, HTML, and JS together). `tools/build_pwa.py`
  wraps it into the site in `docs/`.
- **No third-party requests.** Data, images, icons, and fonts all ship as files next to the page, so the app works
  offline and nothing leaves the visitor's device. The page has a Content Security Policy that only allows the
  site itself; inline scripts are allowed by hash, recomputed on every build, so just rebuild after editing.
- **Item text goes into the page as HTML**, so `tools/build_data.py` refuses upstream text containing `< > & "`.
  Never put user input into HTML.
- **Colours are tokens.** Define each new colour on `:root` and redefine it in both dark blocks; never use a
  literal colour that only works in one theme.
- **Anything a slider affects must also update in the light path** (`renderValues`). New numbers go through
  `N(key, value, format)` with a unique key, so they roll and get patched in place. See "Two render paths" in
  CLAUDE.md.
- **Keep motion optional.** Check `prefers-reduced-motion` for anything you animate.
- **Check phones.** Test at 390 px wide in portrait and landscape, and make sure the page never scrolls
  sideways.
- **Writing style.** Use the Oxford comma in user-facing lists, and keep the text short.

## Data and deploys

You don't refresh the data by hand: `.github/workflows/deploy.yml` fetches the latest upstream data, builds,
tests, and deploys on every push to `main` and once a day. To build locally with the latest data, run
`tools/update_data.sh`; after editing only the page, `python3 tools/build_pwa.py` is enough. The footer's
"Data updated" date and version fill themselves in. Spot-check a few numbers against the
[wasmegg-carpet artifact explorer](https://wasmegg-carpet.netlify.app/artifact-explorer/). Use the
wasmegg-**carpet** site; the old wasmegg.netlify.app is no longer updated.

## Testing

```bash
python3 tools/build_pwa.py
node tests/smoke.js        # must end with "all checks passed"
node tests/bench.js top    # slider frame times on a slowed, emulated phone; compare before/after
```

## Install assets

The iOS launch screens (`app/launch/`) and the install-dialog screenshots (`app/screenshots/`) are committed, since
CI doesn't have Pillow. Regenerate them only when needed: `python3 tools/make_launch_screens.py` for a new iPhone or
iPad screen size (add it to `DEVICES`) or a new icon, and `python3 tools/build_pwa.py && node tools/make_screenshots.js
&& python3 tools/build_pwa.py` when the page looks noticeably different.

## Pull requests

- Keep each PR to one topic and describe what changed and why.
- Don't commit `docs/`, `app/data.json`, or `app/targets/`: they're generated, and the workflow builds them.
- Include before/after screenshots for visual changes (light and dark, desktop and phone).
- If you change a formula, cite the upstream source (file and function in carpetsage/egg) in the PR and in CLAUDE.md.
- If you change a data, icon, or font source, credit it in README.md, the page footer, and THIRD_PARTY_NOTICES.md.
- Add a line to [CHANGELOG.md](CHANGELOG.md) for anything a user would notice.

## Credits and etiquette

The drop data is contributed by players through Menno's drop data tool, and the data pipeline and assets
come from CarpetSage's projects. Keep the credits in the page footer and README intact. If you want to add
something that leans on their services (for example an Egg ID lookup through carpetsage's relay), ask
CarpetSage first; the [carpetsage/egg README](https://github.com/carpetsage/egg) says to reach out on
Discord (@carpetsage).
