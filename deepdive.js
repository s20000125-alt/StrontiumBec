/* deepdive.js
   Page transition for strontiumbec.com — leaving a page reads as sinking away
   from the water surface; the arriving page settles into place from below.

   Drop-in: <script src="deepdive.js" defer></script> on every page.
   Opt a link out with  <a data-no-dive href="...">.
   Tuning lives in CONF below.
*/
(() => {
'use strict';

const CONF = {
  outMs:     1150,      // descent, before navigation
  inMs:      1000,      // settle, on the arriving page
  maxDepth:  340,       // metres shown on the readout
  sceneSel:  null,      // null = every direct child of <body> except the overlay
  deep:      [ 9, 12, 15 ],   // rgb of deep water
  pale:      [238, 234, 225], // the site's brightest ink, used for light and snow
};

const RM = matchMedia('(prefers-reduced-motion: reduce)');
const KEY = 'deepdive:arriving';

/* ---------- overlay ---------- */
const css = `
#dive{position:fixed;inset:0;z-index:60;pointer-events:none;contain:strict;opacity:0}
#dive.on{opacity:1}
#dive canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
#dive .depth{position:absolute;left:32px;bottom:26px;font-family:"IBM Plex Mono",ui-monospace,monospace;
  font-size:11px;letter-spacing:.14em;color:rgba(226,222,213,.62);opacity:0;font-variant-numeric:tabular-nums}
#dive .depth b{font-weight:500;color:rgba(238,234,225,.92)}
@media (max-width:720px){#dive .depth{left:20px;bottom:20px}}
body.dive-busy{overflow:hidden}
body.dive-busy .dive-scene{will-change:transform,opacity,filter}
`;
const st = document.createElement('style'); st.textContent = css;
document.head.appendChild(st);

const root = document.createElement('div');
root.id = 'dive'; root.setAttribute('aria-hidden', 'true');
root.innerHTML = '<canvas></canvas><div class="depth"><b>0</b> m</div>';
const cv = root.querySelector('canvas');
const depthEl = root.querySelector('.depth');
const depthNum = root.querySelector('.depth b');
const ctx = cv.getContext('2d');

let W = 0, H = 0, dpr = 1;
function size() {
  W = innerWidth; H = innerHeight;
  dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = W * dpr; cv.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/* ---------- drifting matter ---------- */
/* Snow rises on screen because the viewer is the thing going down. */
const SNOW = [], BUB = [];
function seed() {
  SNOW.length = 0; BUB.length = 0;
  const n = Math.round(Math.min(180, (W * H) / 9000));
  for (let i = 0; i < n; i++) SNOW.push({
    x: Math.random() * W, y: Math.random() * H,
    r: 0.4 + Math.random() * 1.5, s: 0.35 + Math.random() * 1.25,
    w: Math.random() * 6.283, wf: 0.6 + Math.random() * 1.4, a: 0.25 + Math.random() * 0.75,
  });
  for (let i = 0; i < 11; i++) BUB.push({
    x: Math.random() * W, y: Math.random() * H * 1.4,
    r: 1.6 + Math.random() * 5, s: 1.1 + Math.random() * 2.2,
    w: Math.random() * 6.283, wf: 1.1 + Math.random() * 1.8,
  });
}

/* ---------- one frame at descent fraction p ---------- */
const [dr, dg, db] = CONF.deep;
const [pr, pg, pb] = CONF.pale;

function draw(p, vel, t) {
  ctx.clearRect(0, 0, W, H);

  // water veil: thickens with depth, and is never quite black at the top
  const veil = Math.min(1, p * 1.18);
  const wg = ctx.createLinearGradient(0, 0, 0, H);
  wg.addColorStop(0, `rgba(${dr + 8},${dg + 9},${db + 10},${veil * 0.90})`);
  wg.addColorStop(0.55, `rgba(${dr + 2},${dg + 3},${db + 3},${veil * 0.97})`);
  wg.addColorStop(1, `rgba(${dr},${dg},${db},${veil})`);
  ctx.fillStyle = wg; ctx.fillRect(0, 0, W, H);

  // the surface, receding overhead
  const surfY = H * 0.60 - p * H * 1.9;
  const near = Math.max(0, 1 - p * 1.55);          // how much daylight still reaches
  if (surfY > -H * 0.5 && near > 0.01) {
    ctx.globalCompositeOperation = 'lighter';

    // light spilling down from it
    const sh = ctx.createLinearGradient(0, surfY, 0, surfY + H * 0.55);
    sh.addColorStop(0, `rgba(${pr},${pg},${pb},${0.13 * near})`);
    sh.addColorStop(0.4, `rgba(${pr},${pg},${pb},${0.045 * near})`);
    sh.addColorStop(1, `rgba(${pr},${pg},${pb},0)`);
    ctx.fillStyle = sh; ctx.fillRect(0, surfY, W, H * 0.55);

    // three shafts, leaning, breathing slightly
    for (let i = 0; i < 3; i++) {
      const cx = W * (0.22 + i * 0.29) + Math.sin(t * 0.35 + i) * W * 0.02;
      const lean = (i - 1) * W * 0.10;
      const wTop = W * 0.045, wBot = W * 0.16;
      const g = ctx.createLinearGradient(0, surfY, 0, surfY + H * 0.8);
      g.addColorStop(0, `rgba(${pr},${pg},${pb},${0.055 * near})`);
      g.addColorStop(1, `rgba(${pr},${pg},${pb},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(cx - wTop, surfY); ctx.lineTo(cx + wTop, surfY);
      ctx.lineTo(cx + wBot + lean, surfY + H * 0.8);
      ctx.lineTo(cx - wBot + lean, surfY + H * 0.8);
      ctx.closePath(); ctx.fill();
    }

    // the surface line itself — same hairline vocabulary as the home page
    const lg = ctx.createLinearGradient(W * 0.08, 0, W * 0.92, 0);
    lg.addColorStop(0, `rgba(${pr},${pg},${pb},0)`);
    lg.addColorStop(0.5, `rgba(${pr},${pg},${pb},${0.55 * near})`);
    lg.addColorStop(1, `rgba(${pr},${pg},${pb},0)`);
    ctx.strokeStyle = lg; ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 12) {
      const y = surfY + Math.sin(x * 0.012 + t * 1.3) * 2.4 + Math.sin(x * 0.031 - t * 0.8) * 1.1;
      x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }

  // matter streaming past
  ctx.globalCompositeOperation = 'lighter';
  const rise = 30 + vel * 900;
  const snowA = Math.min(1, p * 2.6);
  for (const s of SNOW) {
    s.y -= (s.s * rise) / 60;
    s.w += s.wf / 60;
    if (s.y < -6) { s.y = H + 6; s.x = Math.random() * W; }
    ctx.fillStyle = `rgba(${pr},${pg},${pb},${0.30 * s.a * snowA})`;
    ctx.beginPath();
    ctx.arc(s.x + Math.sin(s.w) * 3.5, s.y, s.r, 0, 6.283);
    ctx.fill();
  }
  ctx.strokeStyle = `rgba(${pr},${pg},${pb},${0.26 * snowA})`;
  ctx.lineWidth = 0.8;
  for (const b of BUB) {
    b.y -= (b.s * (rise * 1.7)) / 60;
    b.w += b.wf / 60;
    if (b.y < -20) { b.y = H + 20; b.x = Math.random() * W; }
    ctx.beginPath();
    ctx.arc(b.x + Math.sin(b.w) * 7, b.y, b.r, 0, 6.283);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';

  // pressure closing in at the edges
  const vg = ctx.createRadialGradient(W / 2, H * 0.48, Math.min(W, H) * 0.18,
                                      W / 2, H * 0.48, Math.max(W, H) * 0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, `rgba(0,0,0,${0.62 * p})`);
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
}

/* ---------- scene handling ---------- */
function sceneEls() {
  const list = CONF.sceneSel
    ? [...document.querySelectorAll(CONF.sceneSel)]
    : [...document.body.children].filter(el => el !== root && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE');
  list.forEach(el => el.classList.add('dive-scene'));
  return list;
}
function applyScene(els, p, dir) {
  // descending: the page you leave slides up out of frame and blurs out.
  // settling:   the page you arrive at rises into place from below.
  const lift = dir === 'out' ? -16 * p : 13 * p;
  const sc = dir === 'out' ? 1 + 0.075 * p : 1 - 0.03 * p;
  const bl = (dir === 'out' ? 5 : 3.4) * p;
  const op = dir === 'out' ? 1 - p * p * 1.05 : 1 - p * 0.9;
  for (const el of els) {
    if (!el.hasAttribute('data-dive-fade'))
      el.style.transform = `translate3d(0,${lift.toFixed(2)}vh,0) scale(${sc.toFixed(4)})`;
    el.style.filter = bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : '';
    el.style.opacity = Math.max(0, op).toFixed(3);
  }
}
function clearScene(els) {
  for (const el of els) {
    el.style.transform = ''; el.style.filter = ''; el.style.opacity = '';
    el.classList.remove('dive-scene');
  }
}

const easeIn = t => Math.pow(t, 1.55);                 // gathering speed
const easeOut = t => 1 - Math.pow(1 - t, 2.6);         // slowing to rest

let busy = false;

function run(dir, ms, done) {
  busy = true;
  document.body.classList.add('dive-busy');
  if (!root.isConnected) document.body.appendChild(root);
  root.classList.add('on');
  size(); seed();
  const els = sceneEls();
  const t0 = performance.now();
  let prev = 0;

  depthEl.style.transition = 'opacity .35s ease';
  depthEl.style.opacity = dir === 'out' ? '0' : '1';
  if (dir === 'out') requestAnimationFrame(() => { depthEl.style.opacity = '1'; });
  else setTimeout(() => { depthEl.style.opacity = '0'; }, ms * 0.55);

  (function tick(now) {
    const u = Math.min(1, (now - t0) / ms);
    const e = dir === 'out' ? easeIn(u) : easeIn(1 - easeOut(u));
    const p = dir === 'out' ? e : e;                    // 0 = at the surface, 1 = deep
    const vel = Math.abs(p - prev); prev = p;

    draw(p, vel, (now - t0) / 1000);
    applyScene(els, dir === 'out' ? easeIn(u) : 1 - easeOut(u), dir);
    depthNum.textContent = Math.round(p * CONF.maxDepth);

    if (u < 1) requestAnimationFrame(tick);
    else {
      if (dir === 'in') {
        ctx.clearRect(0, 0, W, H);
        root.classList.remove('on');
        clearScene(els);
        document.body.classList.remove('dive-busy');
        root.remove();
      }
      busy = false;
      done && done();
    }
  })(t0);
}

/* ---------- leaving ---------- */
function go(url) {
  if (RM.matches) { location.href = url; return; }
  if (busy) return;
  try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
  run('out', CONF.outMs, () => { location.href = url; });
}
window.deepDive = go;

document.addEventListener('click', e => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest && e.target.closest('a[href]');
  if (!a || a.hasAttribute('data-no-dive')) return;
  const href = a.getAttribute('href') || '';
  if (!href || href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) return;
  if (a.target && a.target !== '_self') return;
  if (/\.(pdf|zip|jpe?g|png|mp4)$/i.test(new URL(a.href, location.href).pathname)) return;
  e.preventDefault();
  go(a.href);
}, true);

/* ---------- arriving ---------- */
addEventListener('resize', () => { if (busy) { size(); seed(); } });

function maybeSettle() {
  let flag = null;
  try { flag = sessionStorage.getItem(KEY); sessionStorage.removeItem(KEY); } catch (e) {}
  if (flag !== '1' || RM.matches) return;
  run('in', CONF.inMs);
}
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', maybeSettle);
else maybeSettle();

// coming back with the browser button should not leave the page mid-dive
addEventListener('pageshow', ev => {
  if (!ev.persisted) return;
  busy = false;
  document.body.classList.remove('dive-busy');
  clearScene([...document.querySelectorAll('.dive-scene')]);
  root.remove();
});
})();
