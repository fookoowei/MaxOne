// Demo data for design review (local only): a few customers, wallets, pending requests and some
// decisions so the console has rows to show. Idempotent-ish: skips users that already exist.
// Usage: node scripts/seed-demo.mjs   (API on :3100, seeded super-admin)
const API = process.env.API_BASE_URL ?? 'http://localhost:3100';
const j = (r) => r.json();
const post = (path, body, token, extra = {}) =>
  fetch(API + path, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...extra }, body: JSON.stringify(body) });
const idem = () => crypto.randomUUID();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// /auth/login is throttled to 5/min/IP — one login per customer, spaced out.

const customers = [
  { email: 'jane.doe@example.com', handle: 'janedoe', firstName: 'Jane', lastName: 'Doe' },
  { email: 'omar.haddad@example.com', handle: 'omarh', firstName: 'Omar', lastName: 'Haddad' },
  { email: 'mei.chen@example.com', handle: 'meichen', firstName: 'Mei', lastName: 'Chen' },
  { email: 'lucas.silva@example.com', handle: 'lucass', firstName: 'Lucas', lastName: 'Silva' },
  { email: 'priya.nair@example.com', handle: 'priyan', firstName: 'Priya', lastName: 'Nair' },
];
const password = 'Demo12345!';

const admin = await post('/auth/login', { email: 'admin@wallet.local', password: 'ChangeMe123!' }).then(j);
const adminTok = admin.tokens.accessToken;

let pendingIds = [];
for (const [i, c] of customers.entries()) {
  const reg = await post('/auth/register', { ...c, password });
  if (!reg.ok && reg.status !== 409) { console.log('register failed', c.email, reg.status, await reg.text()); continue; }
  if (i > 0 && i % 3 === 0) await sleep(61_000); // stay under the login throttle
  const login = await post('/auth/login', { email: c.email, password }).then(j);
  if (!login.tokens) { console.log('login failed', c.email, JSON.stringify(login).slice(0, 120)); continue; }
  const tok = login.tokens.accessToken;
  let wallets = await fetch(API + '/wallets', { headers: { authorization: `Bearer ${tok}` } }).then(j);
  if (!Array.isArray(wallets) || wallets.length === 0) {
    await post('/wallets', { name: 'Main', currency: 'USD' }, tok);
    wallets = await fetch(API + '/wallets', { headers: { authorization: `Bearer ${tok}` } }).then(j);
  }
  const w = wallets[0];
  // two deposit requests + one withdrawal request per customer (withdrawal needs balance → approve first deposit below)
  const amounts = [25000 + i * 7300, 120000 + i * 15000];
  for (const amount of amounts) {
    const r = await post(`/wallets/${w.id}/deposits`, { amount, note: i % 2 ? 'Salary top-up' : undefined }, tok, { 'idempotency-key': idem() }).then(j);
    if (r.id) pendingIds.push({ id: r.id, tok, walletId: w.id });
  }
  console.log('customer ready', c.email, 'wallet', w.id.slice(0, 8));
}

// Approve the first deposit of each customer (audit rows + balances), leave the rest pending;
// then request a withdrawal for two customers so the queue has both types.
let n = 0;
for (const p of pendingIds) {
  if (n++ % 2 === 0) {
    const r = await fetch(`${API}/transactions/${p.id}/approve`, { method: 'POST', headers: { authorization: `Bearer ${adminTok}` } });
    console.log('approved', p.id.slice(0, 8), r.status);
  }
}
for (const p of pendingIds.filter((_, i) => i % 2 === 0).slice(0, 2)) {
  const r = await post(`/wallets/${p.walletId}/withdrawals`, { amount: 4000, note: 'Rent' }, p.tok, { 'idempotency-key': idem() });
  console.log('withdrawal requested', r.status);
}
const ov = await fetch(API + '/admin/overview', { headers: { authorization: `Bearer ${adminTok}` } }).then(j);
console.log('overview:', JSON.stringify(ov.pending), 'today:', JSON.stringify(ov.today));
