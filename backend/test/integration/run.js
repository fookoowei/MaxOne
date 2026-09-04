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
const run = (cmd) => execSync(cmd, { stdio: 'inherit', env: process.env });

run('npx prisma migrate deploy');
run('npx ts-node prisma/seed.ts');
run('npx jest --config test/jest-integration.json --runInBand');
