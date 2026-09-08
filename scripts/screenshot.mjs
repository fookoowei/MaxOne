// Screenshots of the running apps for design review. Usage:
//   node scripts/screenshot.mjs staff  <outDir>   (needs backend :3100 + frontend :3200, seeded admin)
//   node scripts/screenshot.mjs customer <outDir> (needs backend :3100 + customer :3300, a customer account via env CUST_EMAIL/CUST_PASSWORD)
//   --dark            shoot in dark mode (sets next-themes' localStorage key before the first paint)
//   --sizes=1440,390  only these widths
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const puppeteer = require('../frontend/node_modules/puppeteer-core');

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith('--'));
const [which = 'staff', outDir = 'shots'] = args.filter((a) => !a.startsWith('--'));
const dark = flags.includes('--dark');
const onlyWidths = flags.find((a) => a.startsWith('--sizes='))?.slice(8).split(',').map(Number);
mkdirSync(outDir, { recursive: true });
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const cfg = {
  staff: {
    base: 'http://localhost:3200',
    login: { email: 'admin@wallet.local', password: 'ChangeMe123!' },
    routes: ['/', '/approvals', '/wallets', '/users', '/audit'],
    sizes: [[1440, 900], [1024, 800], [390, 844]],
  },
  customer: {
    base: 'http://localhost:3300',
    login: { email: process.env.CUST_EMAIL, password: process.env.CUST_PASSWORD },
    routes: ['/', '/markets', '/pay', '/pay/send', '/deposit', '/activity', '/profile', '/alerts', '/portfolio', '/convert'],
    sizes: [[390, 844], [768, 1024], [1440, 900]],
  },
}[which];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
// Both apps default to the system scheme, so pin it: next-themes reads localStorage.theme on
// hydration (set before any page script runs) and the media query is emulated to match.
const scheme = dark ? 'dark' : 'light';
await page.evaluateOnNewDocument((t) => localStorage.setItem('theme', t), scheme);
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(`${cfg.base}/login`, { waitUntil: 'networkidle0' });
await page.type('input[type=email], input[name=email]', cfg.login.email);
await page.type('input[type=password]', cfg.login.password);
await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.keyboard.press('Enter')]);
console.log('logged in →', page.url());
// staff: also the first wallet's detail page (dynamic id)
if (which === 'staff') {
  await page.goto(cfg.base + '/wallets', { waitUntil: 'networkidle0' });
  const href = await page.$eval('a[href^="/wallets/"]', (a) => a.getAttribute('href')).catch(() => null);
  if (href) cfg.routes.push(href);
}
if (onlyWidths) cfg.sizes = cfg.sizes.filter(([w]) => onlyWidths.includes(w));
const suffix = dark ? '-dark' : '';
for (const [w, h] of cfg.sizes) {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  for (const r of cfg.routes) {
    await page.goto(cfg.base + r, { waitUntil: 'networkidle0' });
    // the Next dev-tools badge sits over the sidebar footer; it isn't ours
    await page.evaluate(() => document.querySelectorAll('nextjs-portal').forEach((el) => el.remove()));
    const name = `${outDir}/${which}-${w}${r === '/' ? '-home' : r.replaceAll('/', '-').slice(0, 24)}${suffix}.png`;
    await page.screenshot({ path: name, fullPage: true });
    console.log('shot', name);
  }
}
if (errors.length) console.log('console errors:\n  ' + [...new Set(errors)].join('\n  '));
await browser.close();
