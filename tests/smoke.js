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
    // Column labels pin under the toolbar while a table scrolls by: at rest the copy sits exactly over the real label
    // row (below the "Any rarity" band); scrolled, it stays just under the toolbar while the real row goes under it
    const pin = await p.evaluate(async () => {
      const frames = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      Object.assign(state, { ship: 'atreggies', len: 2, star: 8, target: 'none', cat: 'art', rar: 'all' }); render();
      await new Promise(r => setTimeout(r, 1200));  // let "keep your place" finish
      scrollTo(0, 0); await frames();
      const atTop = document.getElementById('controls').classList.contains('stuck');
      // Every tier card stays inside the page's margins (seen on screen, so none is skipped by content-visibility)
      const box = document.getElementById('tiers').getBoundingClientRect(); let over = 0;
      for (const t of document.querySelectorAll('#tiers > section.tier')) { t.scrollIntoView(); await frames(); over = Math.max(over, t.getBoundingClientRect().right - box.right); }
      const sec = document.querySelector('#tiers section.tier[data-t="1"]'), real = sec.querySelector(':scope > .scroll thead tr:last-child'), copy = sec.querySelector('.pin tr');
      const bar = () => document.getElementById('controls').getBoundingClientRect().bottom;
      scrollBy(0, real.getBoundingClientRect().top - bar() - 100); await frames();
      const rest = [copy.getBoundingClientRect().top, real.getBoundingClientRect().top];
      scrollBy(0, 300); await frames();
      return { rest, pinned: [copy.getBoundingClientRect().top, real.getBoundingClientRect().top, bar()], over, atTop, stuck: document.getElementById('controls').classList.contains('stuck') };
    });
    check(pin.over <= 0.5, `${name}: tier tables stay inside the page margins (${pin.over.toFixed(1)} px over)`);
    check(Math.abs(pin.rest[0] - pin.rest[1]) < 1 && Math.abs(pin.pinned[0] - pin.pinned[2]) < 1.5 && pin.pinned[1] < pin.pinned[2],
      `${name}: column labels line up at rest and pin under the toolbar ${JSON.stringify(pin)}`);
    check(!pin.atTop && pin.stuck, `${name}: toolbar is marked stuck (edge and shadow) only once it sticks`);
    // Simulator: groups run artifacts, stones, ingredients, then stone fragments (only tier 1 stones), the same in the
    // tiles and the list; each group's header sticks under the toolbar while you scroll through that group
    const sim = await p.evaluate(async () => {
      const frames = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const bar = () => document.getElementById('controls').getBoundingClientRect().bottom;
      const g = [...document.querySelectorAll('#reward-grid .rg-head')].map(h => h.dataset.c), l = [...document.querySelectorAll('#reward-list .rl-head')].map(h => h.dataset.c);
      const isFrag = id => DATA.items[id].c === 'stone' && DATA.items[id].t === 1;
      const fragHead = document.querySelector('#reward-grid .rg-head[data-c="frag"]');
      const fragOk = !fragHead || [...fragHead.parentElement.querySelectorAll('.rw[data-id]')].every(t => isFrag(t.dataset.id));
      const strays = [...document.querySelectorAll('#reward-grid .rg-head:not([data-c="frag"])')].some(h => [...h.parentElement.querySelectorAll('.rw[data-id]')].some(t => isFrag(t.dataset.id)));
      const head = document.querySelector('#reward-grid .rg-head'), lhead = document.querySelector('#reward-list .rl-head');
      scrollBy(0, head.parentElement.getBoundingClientRect().top - bar() + 100); await frames();
      const gh = head.getBoundingClientRect().top - bar();
      scrollBy(0, lhead.parentElement.getBoundingClientRect().top - bar() + 40); await frames();
      const lh = lhead.getBoundingClientRect().top - bar();
      return { g, l, hasFrag: reward.some(([id]) => isFrag(id)), fragOk, strays, gh, lh };
    });
    const order = ['art', 'stone', 'ing', 'frag'].filter(c => sim.g.includes(c));
    check(JSON.stringify(sim.g) === JSON.stringify(order) && JSON.stringify(sim.l) === JSON.stringify(sim.g) && sim.g.includes('frag') === sim.hasFrag && sim.fragOk && !sim.strays,
      `${name}: simulator groups stone fragments last, in the tiles and the list ${JSON.stringify(sim)}`);
    check(Math.abs(sim.gh) < 1.5 && Math.abs(sim.lh) < 1.5, `${name}: simulator group headers stick under the toolbar (${sim.gh.toFixed(1)}, ${sim.lh.toFixed(1)})`);
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
      const lines = await p.evaluate(() => [...document.querySelectorAll('#tiers section.tier')].map(sec => [...sec.querySelectorAll('.summary span')].find(x => /target in \d|target (never drops|doesn't drop)/i.test(x.textContent))?.textContent.replace(/\s+/g, ' ').trim() || ''));
      check(lines.every(Boolean) && lines.some(l => /^Target never drops here$/.test(l)), `each tier has a target line ${JSON.stringify(lines)}`);
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
  // Links (short codes, see linkCode): a link opens its view and is cleared from the address once saved, a shorter code
  // (a shortcut's) opened in the running page sets only its fields, #sim goes to the simulator, unknown values change
  // nothing, and the share button's link opens the same view in a fresh browser
  {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && !ignore(m.text()) && errs.push(m.text()));
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: srv.url });
    const view = () => p.evaluate(() => [state.ship, state.len, state.star, state.target, state.cat, state.rar, state.zerog, state.ftl, state.odds, state.dcap, state.sort]);
    // Henerprise, standard, 4★, Book of Basan (afx 10), stones with epic, Zero-G 3, FTL 12, odds 90, triple, by rarity
    await p.goto(srv.url + '#9140a830c2i5');
    await p.waitForFunction(() => curTgt === '10' && document.querySelectorAll('#tiers tbody tr').length > 0, null, { timeout: 15000 });
    const opened = await view();
    check(JSON.stringify(opened) === '["henerprise",1,4,"10","stone",2,3,12,90,3,"rarity"]', `a link opens its view, research and all ${JSON.stringify(opened)}`);
    const clean = await p.evaluate(() => [location.href, JSON.parse(localStorage.getItem('mission-odds')).zerog]);
    check(clean[0] === srv.url && clean[1] === 3, `the link is saved and cleared from the address ${JSON.stringify(clean)}`);
    await p.evaluate(() => { document.getElementById('star-2').click(); const o = document.getElementById('odds'); o.value = 75; o.dispatchEvent(new Event('input')); });
    await p.waitForTimeout(500);
    check(await p.evaluate(() => location.href) === srv.url, 'the address stays clean as settings change');
    await p.evaluate(() => { location.hash = '#80'; });  // Voyegger, short
    await p.waitForFunction(() => state.ship === 'voyegger', null, { timeout: 5000 }).catch(() => {});
    const sc = await view();
    check(JSON.stringify(sc) === '["voyegger",0,2,"10","stone",2,3,12,75,3,"rarity"]' && await p.evaluate(() => location.hash) === '', `a shortcut's code applies in the open page, keeping everything else ${JSON.stringify(sc)}`);
    await p.evaluate(() => { scrollTo(0, 0); location.hash = '#sim'; }); await p.waitForTimeout(1500);  // held in place for ~1 s
    const sim = await p.evaluate(() => [document.querySelector('.reward').getBoundingClientRect().top - document.getElementById('controls').getBoundingClientRect().bottom, location.hash]);
    check(sim[0] >= 0 && sim[0] < 30 && sim[1] === '', `#sim goes to the simulator ${JSON.stringify(sim)}`);
    await p.evaluate(() => { location.hash = '#~~~~~~~~~~~~'; }); await p.waitForTimeout(1300);  // past "keep your place"
    const bad = await view();
    check(JSON.stringify(bad) === JSON.stringify(sc), `unknown link values change nothing ${JSON.stringify(bad)}`);
    // Desktop: the mission card's button copies the link, which opens the same view in a fresh browser
    await p.evaluate(() => scrollTo(0, 0)); await p.click('#share-link');
    const copied = await p.evaluate(async () => [await navigator.clipboard.readText(), document.getElementById('share-flash').textContent]);
    const fresh = await b.newContext({ viewport: { width: 1280, height: 900 } }), fp = await fresh.newPage();
    await fp.goto(copied[0]); await fp.waitForFunction(() => curTgt === '10' && document.querySelectorAll('#tiers tbody tr').length > 0, null, { timeout: 15000 }).catch(() => {});
    const there = await fp.evaluate(() => [state.ship, state.len, state.star, state.target, state.cat, state.rar, state.zerog, state.ftl, state.odds, state.dcap, state.sort]);
    await fresh.close();
    check(/#[0-9a-z]{4}[0-9a-z]{8}$/.test(copied[0]) && copied[1] === 'Link copied' && JSON.stringify(there) === JSON.stringify(sc),
      `the share button copies a short link that opens the same view ${JSON.stringify([copied, there])}`);
    await p.evaluate(() => { Object.assign(state, { zerog: 10, ftl: 60, odds: 50, dcap: 1, sort: 'tier', cat: 'art', rar: 'all', target: 'none' }); render(); });
    await p.waitForTimeout(1300);  // past "keep your place"
    // The haul is saved as a picture
    const dl = p.waitForEvent('download', { timeout: 10000 });
    await p.click('#share-haul');
    const file = await (await dl).path(), png = require('fs').readFileSync(file);
    const [pw, ph] = [png.readUInt32BE(16), png.readUInt32BE(20)];
    check(png.toString('latin1', 1, 4) === 'PNG' && pw === 1080 && ph > 400, `the haul is saved as a picture (${pw} × ${ph})`);
    // View transitions: the theme spreads from its button; a new ship flies in (the page's own swap is instant)
    await p.evaluate(() => { const st = document.startViewTransition.bind(document); window.__vt = 0; document.startViewTransition = f => { __vt++; return st(f); }; });
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(100);  // the ship flies only where the mission card is in view
    await p.click('#theme'); await p.waitForTimeout(700);
    await p.click('#ship-dd .dd-btn'); await p.click('#ship-dd li:has-text("Henerprise")'); await p.waitForTimeout(900);
    const vt = await p.evaluate(() => [__vt, document.documentElement.dataset.theme, state.ship, document.getElementById('ship-img').getAttribute('src'), document.getElementById('ship-img').style.viewTransitionName]);
    check(JSON.stringify(vt) === '[2,"light","henerprise","icons/afx_ship_henerprise.webp",""]', `theme and ship changes run view transitions ${JSON.stringify(vt)}`);
    check(errs.length === 0, `links and sharing: no script errors ${errs.join(' | ')}`);
    await ctx.close();
  }
  // Phones: both buttons use the share sheet (stubbed: headless Chromium has none); a relaunch that brings a legendary
  // buzzes once; installed, the app asks to keep its storage
  {
    const ctx = await b.newContext(devices['iPhone 13']); const p = await ctx.newPage();
    await ctx.addInitScript(() => {
      window.__shared = []; window.__vib = []; window.__persist = 0;
      navigator.share = async d => { __shared.push(d); }; navigator.canShare = d => !!(d && d.files);
      navigator.vibrate = pat => { __vib.push(pat); return true; };
      Object.defineProperty(navigator, 'standalone', { get: () => true });
      navigator.storage.persisted = async () => false; navigator.storage.persist = async () => { __persist++; return true; };
    });
    await p.goto(srv.url + '#a28');  // Atreggies Henliner, extended, 8★
    await p.waitForFunction(() => document.querySelectorAll('#tiers tbody tr').length > 0, null, { timeout: 15000 });
    check(await p.evaluate(() => __persist === 1), 'installed: asks the browser to keep the offline copy');
    await p.click('#share-link');
    const s1 = await p.evaluate(() => __shared[0] && [__shared[0].url === linkURL(), /extended Atreggies Henliner at 8★/.test(__shared[0].text)]);
    check(JSON.stringify(s1) === '[true,true]', `phones share the mission's link with the share sheet ${JSON.stringify(s1)}`);
    await p.evaluate(() => document.getElementById('share-haul').scrollIntoView({ block: 'center' }));
    await p.click('#share-haul'); await p.waitForFunction(() => __shared.length === 2, null, { timeout: 10000 }).catch(() => {});
    const s2 = await p.evaluate(async () => { const f = __shared[1] && __shared[1].files && __shared[1].files[0]; return f ? [f.type, (await createImageBitmap(f)).width] : null; });
    check(JSON.stringify(s2) === '["image/png",1080]', `phones share the haul picture with the share sheet ${JSON.stringify(s2)}`);
    const buzzes = await p.evaluate(() => {
      const out = [];
      for (let i = 0; i < 6; i++) {
        const before = __vib.length; document.getElementById('reroll').click();
        const legend = reward.some(([, r]) => r === 3), buzzed = __vib.length - before;
        out.push(legend ? buzzed === 1 && __vib[__vib.length - 1] === 90 : buzzed === 0);
      }
      return out;
    });
    check(buzzes.every(Boolean), `a relaunch buzzes once when it brings a legendary ${JSON.stringify(buzzes)}`);
    await ctx.close();
  }
  // PWA: installable and works offline
  const ctx = await b.newContext(); const p = await ctx.newPage();
  await p.goto(srv.url); await p.waitForTimeout(2500);
  const cdp = await ctx.newCDPSession(p);
  const inst = (await cdp.send('Page.getInstallabilityErrors')).installabilityErrors;
  check(inst.length === 0, `PWA installable ${JSON.stringify(inst)}`);
  // Shortcuts open their missions; screenshots and iOS launch screens are served at their stated sizes
  const extras = await p.evaluate(async () => {
    const man = await (await fetch('manifest.webmanifest')).json();
    const size = src => new Promise(res => { const im = new Image(); im.onload = () => res(`${im.naturalWidth}x${im.naturalHeight}`); im.onerror = () => res('missing'); im.src = src; });
    const shots = await Promise.all(man.screenshots.map(async s => (await size(s.src)) === s.sizes));
    const launch = [...document.querySelectorAll('link[rel="apple-touch-startup-image"]')];
    const m = /device-width: (\d+)px\) and \(device-height: (\d+)px\) and \(-webkit-device-pixel-ratio: (\d)\) and \(orientation: (\w+)/.exec(launch[0].media);
    const want = m[4] === 'portrait' ? `${m[1] * m[3]}x${m[2] * m[3]}` : `${m[2] * m[3]}x${m[1] * m[3]}`;
    return { shortcuts: man.shortcuts.map(s => s.url), shots, launch: launch.length, first: (await size(launch[0].href)) === want };
  });
  check(extras.shortcuts.length === 4 && extras.shortcuts.every(u => /^\.\/#([0-9a-z]2|sim)$/.test(u)) && extras.shots.length === 4 && extras.shots.every(Boolean) && extras.launch > 20 && extras.first,
    `manifest shortcuts, screenshots, and iOS launch screens ${JSON.stringify(extras)}`);
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
