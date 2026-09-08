// Screenshots of the running apps for design review. Usage:
//   node scripts/screenshot.mjs staff  <outDir>   (needs backend :3100 + frontend :3200, seeded admin)
//   node scripts/screenshot.mjs customer <outDir> (needs backend :3100 + customer :3300, a customer account via env CUST_EMAIL/CUST_PASSWORD)
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const puppeteer = require('../frontend/node_modules/puppeteer-core');

const [, , which = 'staff', outDir = 'shots'] = process.argv;
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
    routes: ['/', '/markets', '/pay', '/deposit', '/profile'],
    sizes: [[390, 844], [768, 1024], [1440, 900]],
  },
}[which];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
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
for (const [w, h] of cfg.sizes) {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  for (const r of cfg.routes) {
    await page.goto(cfg.base + r, { waitUntil: 'networkidle0' });
    const name = `${outDir}/${which}-${w}${r === '/' ? '-home' : r.replaceAll('/', '-').slice(0, 24)}.png`;
    await page.screenshot({ path: name, fullPage: true });
    console.log('shot', name);
  }
}
await browser.close();
