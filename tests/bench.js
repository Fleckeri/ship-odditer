// Slider drag benchmark: frame gaps while sweeping each slider one step per frame on an emulated phone
// with the CPU slowed 4x. Run:  node tests/bench.js [top|tables]   (after python3 tools/build_pwa.py)
const { chromium, devices } = require('playwright');
const serve = require('./serve');
(async () => {
  const srv = await serve();
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['Pixel 7'] });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(srv.url); await p.waitForTimeout(1500);
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const where = process.argv[2] || 'top';
  if (where === 'tables') await p.evaluate(() => { const s = document.querySelector('section.tier[data-t="2"]'); scrollBy(0, s.getBoundingClientRect().top - 150); });
  if (where === 'reward') await p.evaluate(() => { document.getElementById('reward-grid').scrollIntoView(); scrollBy(0, -120); });
  await p.waitForTimeout(800);
  for (const id of ['zerog', 'ftl', 'odds']) {
    const r = await p.evaluate(id => new Promise(res => {
      const el = document.getElementById(id), min = +el.min, max = +el.max;
      const gaps = []; let last = performance.now(), i = 0, long = 0;
      const po = new PerformanceObserver(l => { for (const e of l.getEntries()) long += e.duration; }); try { po.observe({ type: 'longtask', buffered: false }); } catch (e) {}
      const t0 = performance.now();
      const frame = t => { gaps.push(t - last); last = t;
        if (t - t0 < 2000) { // sweep the slider back and forth, one step per frame (like a finger drag)
          i++; const span = max - min, ph = (i % (2 * span)); el.value = min + (ph < span ? ph : 2 * span - ph); el.dispatchEvent(new Event('input', { bubbles: true }));
          requestAnimationFrame(frame);
        } else { po.disconnect(); gaps.shift(); gaps.sort((a, b) => a - b);
          res({ frames: gaps.length, avg: +(gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(1), p95: +gaps[Math.floor(gaps.length * .95)].toFixed(1), max: +gaps[gaps.length - 1].toFixed(1), longtask_ms: Math.round(long) }); }
      };
      requestAnimationFrame(frame);
    }), id);
    console.log(where, id, JSON.stringify(r));
    await p.waitForTimeout(1200);
  }
  console.log('errors', errs);
  await b.close(); srv.close();
})();
