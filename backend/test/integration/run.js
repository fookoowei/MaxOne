/* eslint-disable @typescript-eslint/no-require-imports */
// Integration-test runner. Invoked as: dotenv -e ../.env -- node test/integration/run.js
// 1. Points DATABASE_URL at the TEST database (and refuses anything that isn't one).
// 2. Applies migrations + seeds roles/permissions there.
// 3. Runs the integration Jest lane in-band (the DB is shared between files).
const { execSync } = require('child_process');

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error('TEST_DATABASE_URL is not set (add it to the root .env)');
if (!/_test\b|_test\?|_test$/.test(url)) {
  throw new Error(`Refusing to run: TEST_DATABASE_URL must point at a *_test database (got ${url})`);
}
process.env.DATABASE_URL = url; // everything below (prisma, the app) now targets the test DB

// M16a: same idea for Redis — the lane uses db index 1 (flushed per test), never the app's db 0.
const redisUrl = process.env.TEST_REDIS_URL;
if (!redisUrl) throw new Error('TEST_REDIS_URL is not set (add it to the root .env)');
if (!/\/1$/.test(redisUrl)) {
  throw new Error(`Refusing to run: TEST_REDIS_URL must use Redis db index 1 (got ${redisUrl})`);
}
process.env.REDIS_URL = redisUrl;

// M16b: same idea for RabbitMQ — the lane uses vhost "test" (purged per test), never the app's "/".
// A vhost is a namespace inside one broker (exchanges/queues/bindings are per-vhost).
const mqUrl = process.env.TEST_RABBITMQ_URL;
if (!mqUrl) throw new Error('TEST_RABBITMQ_URL is not set (add it to the root .env)');
if (!/\/test$/.test(mqUrl)) {
  throw new Error(`Refusing to run: TEST_RABBITMQ_URL must use vhost "test" (got ${mqUrl})`);
}
process.env.RABBITMQ_URL = mqUrl;

// Create the vhost (+ guest permissions on it) through the management HTTP API if it's missing.
// Idempotent: PUT on an existing vhost/permission is a no-op.
async function ensureTestVhost() {
  const mgmt = process.env.RABBITMQ_MANAGEMENT_URL ?? 'http://localhost:15672';
  const auth = 'Basic ' + Buffer.from('guest:guest').toString('base64');
  const put = async (path, body) => {
    const res = await fetch(`${mgmt}/api${path}`, {
      method: 'PUT',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok && res.status !== 204) {
      throw new Error(`RabbitMQ management ${path} → ${res.status} ${await res.text()}`);
    }
  };
  await put('/vhosts/test');
  await put('/permissions/test/guest', { configure: '.*', write: '.*', read: '.*' });
}

const run = (cmd) => execSync(cmd, { stdio: 'inherit', env: process.env });

(async () => {
  await ensureTestVhost();
  run('npx prisma migrate deploy');
  run('npx ts-node prisma/seed.ts');
  run('npx jest --config test/jest-integration.json --runInBand');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
