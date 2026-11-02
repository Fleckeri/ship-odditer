// Screenshots for the install dialog's richer form (Chrome and Edge show them, like an app store listing): the drop
// tables and the simulator, wide (desktop) and narrow (phone), in the dark theme.
// Usage:  python3 tools/build_pwa.py && node tools/make_screenshots.js && python3 tools/build_pwa.py
// Writes app/screenshots/*.png and screenshots.json (file, form factor, label), which build_pwa.py lists in the
// manifest. Only worth rerunning when the page looks noticeably different. Needs Playwright with Chromium.
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path');
const serve = require('../tests/serve');
const OUT = path.join(__dirname, '..', 'app', 'screenshots');
const LINK = '#a280a';  // Atreggies Henliner, extended, 8★, targeting Book of Basan (see linkCode in the page)
const LABELS = {
  odds: 'Drop odds for every ship, mission length, target, and star level',
  sim: 'Mission Reward Simulator: one launch’s items by type, tier, and rarity',
};
const FORMS = {
  wide: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
  narrow: { ...devices['iPhone 13'], deviceScaleFactor: 2 },  // 780 × 1328
};
(async () => {
  const srv = await serve(), b = await chromium.launch(), list = [];
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
  for (const [form, opts] of Object.entries(FORMS)) {
    const ctx = await b.newContext({ ...opts, colorScheme: 'dark', reducedMotion: 'reduce' });
    await ctx.addInitScript(() => localStorage.setItem('mission-odds-install-dismissed', '1'));
    // Phones have a share sheet (headless Chromium doesn't), so their buttons say Share, as on a real phone
    if (form === 'narrow') await ctx.addInitScript(() => { navigator.share = async () => {}; navigator.canShare = () => true; });
    const p = await ctx.newPage();
    await p.goto(srv.url + LINK);
    await p.waitForFunction(() => curTgt && document.querySelectorAll('#tiers tbody tr').length > 0, null, { timeout: 15000 });
    await p.evaluate(() => document.fonts.ready);
    for (const view of ['odds', 'sim']) {
      // From the mission card down, or the simulator just under the toolbar (as its link shows it)
      await p.evaluate(view => {
        if (view === 'sim') location.hash = '#sim';
        else scrollBy(0, document.querySelector('.mission').getBoundingClientRect().top - 12);
      }, view);
      await p.waitForTimeout(1500);  // pictures in the newly shown blocks, and the link's view settling
      const file = `${form}-${view}.png`;
      await p.screenshot({ path: path.join(OUT, file) });
      list.push({ file, form_factor: form, label: LABELS[view] });
      console.log('wrote', file);
    }
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, 'screenshots.json'), JSON.stringify(list, null, 2) + '\n');
  await b.close(); srv.close();
})();
