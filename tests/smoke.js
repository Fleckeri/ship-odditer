// Smoke test for the built app in docs/. Run:  python3 tools/build_pwa.py && node tests/smoke.js
// Needs Playwright with Chromium (npm i -D playwright && npx playwright install chromium).
const { chromium, devices } = require('playwright');
const serve = require('./serve');
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) failures++; };
(async () => {
  const srv = await serve();
  const b = await chromium.launch();
  const ignore = m => /fonts\.g|ERR_TUNNEL|ERR_INTERNET|net::ERR_FAILED/.test(m);  // Google Fonts may be unreachable in CI
  for (const [name, opts] of [['desktop', { viewport: { width: 1280, height: 900 } }], ['iPhone', devices['iPhone 13']], ['iPhone landscape', devices['iPhone 13 landscape']]]) {
    const ctx = await b.newContext(opts); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && !ignore(m.text()) && errs.push(m.text()));
    await p.goto(srv.url); await p.waitForFunction(() => document.querySelectorAll('#tiers tbody tr').length > 0, null, { timeout: 15000 });
    check(errs.length === 0, `${name}: no script errors ${errs.join(' | ')}`);
    check(await p.title() === 'Ship Odditer: Egg Inc. Mission Drop Calculator', `${name}: title is "Ship Odditer: Egg Inc. Mission Drop Calculator"`);
    const w = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    check(w[0] <= w[1], `${name}: no sideways scroll (${w[0]} <= ${w[1]})`);
    // Sliders, stars and relaunch still work
    await p.evaluate(() => { const o = document.getElementById('odds'); o.value = 90; o.dispatchEvent(new Event('input')); });
    await p.waitForTimeout(1200);
    check(await p.$eval('th .odds-txt', e => e.textContent) === '90', `${name}: odds slider updates the column headers`);
    await p.evaluate(() => document.getElementById('star-0').click()); await p.waitForTimeout(1200);
    check(await p.evaluate(() => state.star === 0 && document.querySelector('[data-k="h|s"]').textContent === '0'), `${name}: star buttons update the mission card`);
    if (name !== 'desktop') {
      // Compact toolbar: everything folds behind the summary button, the table options are dropdowns in it, and
      // the tables show just the item icons
      await p.evaluate(() => { Object.assign(state, { ship: 'atreggies', len: 2, star: 8, target: 'none', cat: 'art', rar: 'all' }); render(); scrollTo(0, 0); });
      const c = await p.evaluate(() => [getComputedStyle(document.querySelector('.tb-table')).display, document.querySelector('#tiers td.name').getBoundingClientRect().width, document.querySelector('#tiers td.name .item-n').getBoundingClientRect().width]);
      check(c[0] === 'none' && c[1] <= 60 && c[2] <= 1, `${name}: table options folded away, item column is just the icon (${Math.round(c[1])} px)`);
      await p.click('#tb-toggle');
      await p.click('#stars-dd .dd-btn'); await p.click('#stars-dd li:has-text("3★")');
      await p.click('#rar-dd .dd-btn'); await p.click('#rar-dd li:has-text("Legendary")');
      await p.click('#cats-dd .dd-btn'); await p.click('#cats-dd li:has-text("Stones")');
      const d = await p.evaluate(() => [state.star, state.cat, state.rar, document.getElementById('rar-dd-group').hidden, document.getElementById('tb-summary').textContent,
        [...document.querySelectorAll('#tb-pills .tb-pill')].map(e => e.innerText.trim() || (e.querySelector('img') ? 'icon' : 'dot'))]);
      check(d[0] === 3 && d[1] === 'stone' && d[2] === 3 && d[3] && /3 stars, Stones, Zero-G/.test(d[4]) && d[5].includes('3★') && d[5].length === 7,  // ship, length, stars, items, Zero-G, FTL, odds (no target; no rarity for stones)
        `${name}: Stars, Items, and Rarity dropdowns work and every setting shows as a pill ${JSON.stringify(d)}`);
      const fit = await p.evaluate(() => [...document.querySelectorAll('#tb-mission .tb-slider input')].every(i => i.getBoundingClientRect().width >= 100));
      check(fit, `${name}: sliders have room (each at least 100 px wide)`);
      await p.evaluate(() => { Object.assign(state, { cat: 'art', rar: 'all' }); render(); document.getElementById('tb-toggle').click(); });
    }
    if (name === 'desktop') {
      // Self-hosted fonts load (no third-party requests), and the mission card labels explain themselves
      check(await p.evaluate(async () => { await document.fonts.ready; return document.fonts.check('700 16px "Chakra Petch"') && document.fonts.check('400 15px "Atkinson Hyperlegible"'); }), 'self-hosted fonts load');
      await p.evaluate(() => scrollTo(0, 0)); await p.hover('#hero-stats .hero-tip >> nth=0'); await p.waitForTimeout(150);
      check(await p.evaluate(() => !document.getElementById('tip').hidden && /Capacity/.test(document.getElementById('tip').textContent)), 'mission card labels show their tooltips');
      // Targeting: pick Book of Basan from the dropdown on a Henliner extended 8★; its share should rise
      await p.evaluate(() => { state.ship = 'atreggies'; state.len = 2; state.star = 8; state.target = 'none'; render(); });
      const untargeted = await p.evaluate(() => Math.round(share('book-of-basan-1', 'all', 8) * 1e6));
      await p.click('#tgt-dd .dd-btn');
      await p.click('#tgt-dd li:has-text("Book of Basan")');
      await p.waitForFunction(() => curTgt === '10', null, { timeout: 10000 });
      const t = await p.evaluate(() => [Math.round(share('book-of-basan-1', 'all', 8) * 1e6), document.getElementById('hero-kicker').textContent, document.querySelector('#tgt-dd .dd-val').textContent]);
      check(t[0] > untargeted * 1.5 && /targeting Book of Basan/.test(t[1]) && t[2] === 'Book of Basan', `targeting raises the target's share (${untargeted} → ${t[0]} ppm) and shows it`);
      // The target's rows are marked, each tier says how many launches to see it, and a tier where it never drops says so
      const marks = await p.evaluate(() => [...document.querySelectorAll('#tiers tr.tgt')].map(tr => [tr.dataset.id, !!tr.querySelector('.tgt-mark')]));
      check(marks.length > 0 && marks.every(([id, m]) => id.startsWith('book-of-basan-') && m), `target rows highlighted and marked ${JSON.stringify(marks)}`);
      const lines = await p.evaluate(() => [...document.querySelectorAll('#tiers section.tier')].map(sec => [...sec.querySelectorAll('.summary span')].find(x => /chance of getting target|target (never drops|doesn't drop)/i.test(x.textContent))?.textContent.replace(/\s+/g, ' ').trim() || ''));
      check(lines.every(Boolean) && lines.some(l => /^Target never drops from this mission$/.test(l)), `each tier has a target line ${JSON.stringify(lines)}`);
      const k0 = await p.evaluate(() => document.querySelector('[data-k="t3|tgt"]').dataset.v);
      await p.evaluate(() => { const o = document.getElementById('zerog'); o.value = 0; o.dispatchEvent(new Event('input')); });
      await p.evaluate(() => document.querySelector('[data-k="t3|tgt"]').scrollIntoView());  // off-screen tables catch up when seen
      await p.waitForTimeout(600);
      check(await p.evaluate(k0 => document.querySelector('[data-k="t3|tgt"]').dataset.v !== k0, k0), 'target line follows the Zero-G slider');
      // Capacity event toggle: off → 2× → 3× → off (Zero-G is 0 here, so capacity is exactly ×2 and ×3); the mission
      // card, button, and folded-toolbar summary follow
      const cap0 = await p.evaluate(() => capAt(state.star));
      const dcap = () => p.evaluate(() => [capAt(state.star), +document.querySelector('[data-k="h|cap"]').dataset.v, document.getElementById('dcap').dataset.x, document.getElementById('hero-kicker').textContent, document.getElementById('tb-summary').textContent]);
      await p.click('#dcap'); await p.waitForTimeout(400); const d2 = await dcap();
      await p.click('#dcap'); await p.waitForTimeout(400); const d3 = await dcap();
      await p.click('#dcap'); await p.waitForTimeout(400); const d1 = await dcap();
      check(d2[0] === cap0 * 2 && d2[1] === d2[0] && d2[2] === '2' && /double capacity/.test(d2[3]) && /double capacity/.test(d2[4])
        && d3[0] === cap0 * 3 && d3[1] === d3[0] && d3[2] === '3' && /triple capacity/.test(d3[3]) && /triple capacity/.test(d3[4])
        && d1[0] === cap0 && d1[2] === '1' && !/capacity/.test(d1[3]), `capacity event toggle cycles off → 2× → 3× → off (${cap0}: ${JSON.stringify([d2, d3, d1])})`);
      check(await p.evaluate(() => warmIcons.length > 40 && warmIcons.every(im => im.complete && im.naturalWidth > 0)), 'dropdown icons preloaded');
      // Rolling numbers stay inside their (fixed-width) cells while a slider moves: BCR stones at 0★ used to spill over
      const spill = await p.evaluate(async () => {
        Object.assign(state, { ship: 'bcr', len: 2, star: 0, target: 'none', cat: 'stone', rar: 'all', odds: 1 }); render();
        document.querySelector('#tiers section.tier').scrollIntoView(); await new Promise(r => setTimeout(r, 300));
        let worst = 0, what = ''; const o = document.getElementById('odds');
        const look = () => { for (const td of document.querySelectorAll('#tiers tbody td:not(.name)')) { const n = td.querySelector('.n'); if (!n) continue;
          const a = td.getBoundingClientRect(), r = n.getBoundingClientRect(), d = r.right - (a.right - parseFloat(getComputedStyle(td).paddingRight));
          if (d > worst) { worst = d; what = `"${n.textContent}" in column ${[...td.parentNode.children].indexOf(td)} (${Math.round(a.width)} px)`; } } };
        for (let v = 1; v <= 99; v += 2) { o.value = v; o.dispatchEvent(new Event('input')); await new Promise(r => requestAnimationFrame(r)); look(); }
        for (let i = 0; i < 60; i++) { await new Promise(r => requestAnimationFrame(r)); look(); }
        return [Math.round(worst), what];
      });
      check(spill[0] <= 0, `numbers stay in their cells while the odds slider moves (worst overflow ${spill[0]}px ${spill[1]})`);
      // The launch counter sits next to the item total and only shows after a relaunch; the floating copy flies in
      await p.evaluate(() => { Object.assign(state, { ship: 'atreggies', star: 8, cat: 'art', target: '10' }); render(); });
      check(await p.evaluate(() => document.getElementById('launch-count').parentNode.id === 'reward-stats' && !document.getElementById('launch-count').classList.contains('show')), 'launch counter hidden next to the item total');
      await p.click('#reroll'); await p.waitForTimeout(1200);  // let the count roll to its new value
      check(await p.evaluate(() => document.getElementById('launch-count').classList.contains('show') && /2/.test(document.getElementById('launch-count').textContent)), 'launch counter appears after a relaunch');
      const flew = await p.evaluate(async () => {
        // Put the button just below the sticky toolbar, then scroll it under: the copy should fly out
        const btn = document.getElementById('reroll'), bar = document.getElementById('controls').getBoundingClientRect().bottom;
        scrollTo(0, btn.getBoundingClientRect().top + scrollY - bar - 30); await new Promise(r => setTimeout(r, 150));
        scrollBy(0, 120); await new Promise(r => setTimeout(r, 80));
        const fab = document.getElementById('reroll-float'); return !!fab._fly || fab.getAnimations().length > 0;
      });
      check(flew, 'floating Relaunch flies in from the button');
      // Pre-FTL ships can't target: the dropdown is disabled and the tables fall back to untargeted
      await p.evaluate(() => { state.ship = 'bcr'; render(); });
      check(await p.evaluate(() => curTgt === null && document.querySelector('#tgt-dd .dd-btn').disabled && state.target === '10'), 'pre-FTL ship disables targeting and keeps the choice');
      check(errs.length === 0, `targeting: no script errors ${errs.join(' | ')}`);
    }
    await ctx.close();
  }
  // Install panel: opens by itself where the browser can install, stays dismissed, and the intro link reopens it
  for (const [name, opts, re, where] of [['desktop', {}, /address bar/, 'Chrome'], ['iPhone', devices['iPhone 13'], /Add to Home Screen/, 'iPhone']]) {
    const ctx = await b.newContext(opts); const p = await ctx.newPage();
    await p.goto(srv.url); await p.waitForFunction(() => document.querySelectorAll('#tiers tbody tr').length > 0);
    const how = await p.evaluate(() => !document.getElementById('install').hidden && !document.getElementById('install-link').hidden && document.getElementById('install-how').textContent);
    check(!!how && re.test(how), `${name}: install panel shows the right steps (${how})`);
    check(await p.$eval('#h-install', e => e.textContent) === `Install Ship Odditer on ${where}`, `${name}: install panel names the device`);
    await p.click('#install-x'); await p.reload(); await p.waitForFunction(() => document.querySelectorAll('#tiers tbody tr').length > 0);
    check(await p.evaluate(() => document.getElementById('install').hidden), `${name}: dismissed install panel stays hidden after reload`);
    await p.click('#install-link');
    check(await p.evaluate(() => !document.getElementById('install').hidden), `${name}: intro link reopens the install panel`);
    await ctx.close();
  }
  // Damaged or old saved settings fall back to defaults instead of breaking the page
  {
    const ctx = await b.newContext(); const p = await ctx.newPage(); const errs = [];
    await ctx.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('mission-odds', JSON.stringify({ ship: 'nope', len: 7, star: 'x', rar: 9, cat: 'bogus', zerog: 'abc', dcap: 'yes', ftl: -5, odds: 500, target: '48', sort: 'type' })); sessionStorage.setItem('seeded', '1'); } });
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && !ignore(m.text()) && errs.push(m.text()));
    await p.goto(srv.url); await p.waitForFunction(() => document.querySelectorAll('#tiers tbody tr').length > 0, null, { timeout: 15000 }).catch(() => {});
    const st = await p.evaluate(() => JSON.stringify([state.ship, state.len, state.star, state.rar, state.cat, state.zerog, state.dcap, state.ftl, state.odds, curTgt]));
    check(errs.length === 0 && st === JSON.stringify(['atreggies', 2, 8, 'all', 'art', 10, 1, 0, 99, null]), `damaged saved settings are repaired ${st} ${errs.join(' | ')}`);
    await ctx.close();
  }
  // A browser that can't install shows neither the link nor the panel; an installed app says it's installed
  for (const [name, opts, init, want] of [
    ['desktop Firefox', { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0' }, null, [true, true, true]],
    ['installed iPhone', devices['iPhone 13'], () => Object.defineProperty(navigator, 'standalone', { get: () => true }), [true, true, false]],
  ]) {
    const ctx = await b.newContext(opts); if (init) await ctx.addInitScript(init); const p = await ctx.newPage();
    await p.goto(srv.url); await p.waitForFunction(() => document.querySelectorAll('#tiers tbody tr').length > 0);
    const got = await p.evaluate(() => ['install', 'install-link', 'install-status'].map(id => document.getElementById(id).hidden));
    check(JSON.stringify(got) === JSON.stringify(want), `${name}: install link and panel state ${JSON.stringify(got)}`);
    await ctx.close();
  }
  // PWA: installable and works offline
  const ctx = await b.newContext(); const p = await ctx.newPage();
  await p.goto(srv.url); await p.waitForTimeout(2500);
  const cdp = await ctx.newCDPSession(p);
  const inst = (await cdp.send('Page.getInstallabilityErrors')).installabilityErrors;
  check(inst.length === 0, `PWA installable ${JSON.stringify(inst)}`);
  await p.reload(); await p.waitForTimeout(800);
  check(await p.evaluate(() => !!navigator.serviceWorker.controller), 'service worker controls the page');
  await ctx.setOffline(true); await p.reload(); await p.waitForTimeout(1500);
  check(await p.$eval('#hero-title', e => e.textContent).catch(() => '') !== 'Loading drop data…', 'loads offline');
  await p.evaluate(() => { state.ship = 'voyegger'; state.target = '18'; render(); });
  check(await p.waitForFunction(() => curTgt === '18' && !!level(state.star), null, { timeout: 5000 }).then(() => true, () => false), 'targeted data loads offline');
  await ctx.close();
  // Updates: an installed copy picks up a new deploy by itself, downloads only what changed, reloads into it at the
  // first quiet moment keeping your place, says so, and keeps working offline with the new data. Runs on a scratch
  // copy of docs/ so it can "deploy".
  {
    const fs = require('fs'), os = require('os'), path = require('path');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'odditer-update-'));
    fs.cpSync(path.join(__dirname, '..', 'docs'), dir, { recursive: true });
    const log = [], srv2 = await serve(dir, log), ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }), p = await ctx.newPage();
    await p.goto(srv2.url); await p.waitForFunction(() => navigator.serviceWorker.controller && document.querySelectorAll('#tiers tbody tr').length > 0, null, { timeout: 15000 });
    // Read tier 3, just under the toolbar
    const before = await p.evaluate(async () => {
      const t3 = document.querySelector('#tiers section.tier[data-t="3"]');
      scrollTo(0, t3.getBoundingClientRect().top + scrollY - document.getElementById('controls').getBoundingClientRect().bottom - 40);
      await new Promise(r => setTimeout(r, 300)); return t3.getBoundingClientRect().top;
    });
    // "Deploy" a new version: new data date, new service-worker version and data.json hash
    const data = JSON.parse(fs.readFileSync(path.join(dir, 'data.json'))); data.dataUpdated = '2030-01-02';
    const dataText = JSON.stringify(data), dataHash = require('crypto').createHash('sha256').update(dataText).digest('hex').slice(0, 16);
    fs.writeFileSync(path.join(dir, 'data.json'), dataText);
    const swPath = path.join(dir, 'sw.js'); fs.writeFileSync(swPath, fs.readFileSync(swPath, 'utf8')
      .replace(/const VERSION = "\w+"/, 'const VERSION = "test-update"').replace(/"data\.json": "\w+"/, `"data.json": "${dataHash}"`));
    log.length = 0;
    const reloaded = p.waitForEvent('load', { timeout: 20000 }).then(() => true, () => false);
    await p.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()));
    const fetched = await reloaded.then(() => [...new Set(log)].sort());
    check(JSON.stringify(fetched) === '["/data.json","/sw.js"]', `the update downloads only the changed files ${JSON.stringify(fetched)}`);
    const shown = await p.waitForFunction(() => !document.getElementById('update-note').hidden, null, { timeout: 10000 }).then(() => true, () => false);
    await p.waitForTimeout(600);
    const after = await p.evaluate(() => [document.getElementById('data-date').textContent, document.getElementById('update-note').textContent,
      document.querySelector('#tiers section.tier[data-t="3"]').getBoundingClientRect().top]);
    check(shown && /2 Jan 2030/.test(after[0]) && /updated/.test(after[1]), `a new deploy reloads by itself and says so ${JSON.stringify(after.slice(0, 2))}`);
    check(Math.abs(after[2] - before) < 40, `the reload keeps your place (tier 3 at ${Math.round(before)} → ${Math.round(after[2])} px)`);
    await ctx.setOffline(true); await p.reload(); await p.waitForTimeout(1500);
    check(/2 Jan 2030/.test(await p.$eval('#data-date', e => e.textContent).catch(() => '')) && await p.evaluate(() => document.querySelectorAll('#tiers tbody tr').length > 0), 'the updated version works offline');
    // Another deploy takes over while the page is open. Picking a target before the quiet reload needs a targeted
    // file, which would come from the new version, so the page reloads into it at once, keeping the target.
    await ctx.setOffline(false);
    data.dataUpdated = '2030-01-03';
    const dataText2 = JSON.stringify(data), dataHash2 = require('crypto').createHash('sha256').update(dataText2).digest('hex').slice(0, 16);
    fs.writeFileSync(path.join(dir, 'data.json'), dataText2);
    fs.writeFileSync(swPath, fs.readFileSync(swPath, 'utf8')
      .replace(/const VERSION = "[\w-]+"/, 'const VERSION = "test-update-2"').replace(/"data\.json": "\w+"/, `"data.json": "${dataHash2}"`));
    await p.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()));
    await p.waitForFunction(() => replaced, null, { timeout: 15000 });
    const reloaded2 = p.waitForEvent('load', { timeout: 10000 }).then(() => true, () => false);
    await p.evaluate(() => { scrollTo(0, 0); document.querySelector('#tgt-dd .dd-btn').click(); });
    await p.click('#tgt-dd li:has-text("Book of Basan")');
    const kept = await reloaded2 && await p.waitForFunction(() => curTgt === '10', null, { timeout: 10000 }).then(() => true, () => false);
    check(kept && /3 Jan 2030/.test(await p.$eval('#data-date', e => e.textContent)), 'a target picked after an update reloads into the new version, keeping the target');
    await ctx.close(); srv2.close(); fs.rmSync(dir, { recursive: true, force: true });
  }
  await b.close(); srv.close();
  console.log(failures ? `${failures} check(s) failed` : 'all checks passed');
  process.exit(failures ? 1 : 0);
})();
