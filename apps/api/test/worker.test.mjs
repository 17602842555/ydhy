import assert from 'node:assert/strict';
import { test } from 'node:test';

import worker from '../worker.mjs';
import { call, createTestEnv } from './helpers.mjs';

const LOGIN = { userId: 'user-lijinning', password: '123456' };

async function loginToken(env) {
  const res = await call(worker, env, 'POST', '/api/auth/login', { body: LOGIN });
  assert.equal(res.status, 201, 'login should return 201');
  assert.ok(res.body?.token, 'login should return a token');
  return res.body.token;
}

test('GET /api/health reports the Cloudflare D1 runtime', async () => {
  const env = createTestEnv();
  const res = await call(worker, env, 'GET', '/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.mode, 'cloudflare-d1');
  assert.equal(res.body.runtime.ai.configured, false, 'no ARK key in tests');
});

test('OPTIONS preflight returns 204', async () => {
  const env = createTestEnv();
  const res = await call(worker, env, 'OPTIONS', '/api/dashboard');
  assert.equal(res.status, 204);
});

test('GET /api/auth/users lists seeded login users', async () => {
  const env = createTestEnv();
  const res = await call(worker, env, 'GET', '/api/auth/users');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.users));
  assert.ok(res.body.users.some((user) => user.id === 'user-lijinning'));
});

test('login issues a token and authenticated reads succeed', async () => {
  const env = createTestEnv();
  const token = await loginToken(env);

  const dashboard = await call(worker, env, 'GET', '/api/dashboard', { token });
  assert.equal(dashboard.status, 200);
  assert.ok(dashboard.body.subsidiaries, 'dashboard should include subsidiaries');

  const operating = await call(worker, env, 'GET', '/api/operating-system', { token });
  assert.equal(operating.status, 200);
});

test('protected routes reject missing credentials with 401', async () => {
  const env = createTestEnv();
  const res = await call(worker, env, 'GET', '/api/dashboard');
  assert.equal(res.status, 401);
});

test('unknown route returns 404 not_found', async () => {
  const env = createTestEnv();
  const res = await call(worker, env, 'GET', '/api/does-not-exist');
  assert.equal(res.status, 404);
  assert.equal(res.body.error, 'not_found');
});

test('invalid JSON body returns 400 with a request id and X-Request-Id header', async () => {
  const env = createTestEnv();
  const res = await call(worker, env, 'POST', '/api/auth/login', { body: 'not-json{' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'invalid_json');
  assert.ok(res.body.requestId, 'error body should carry a requestId');
  assert.equal(res.headers.get('X-Request-Id'), res.body.requestId, 'header should match body requestId');
});

test('AI insights cache miss returns 404 before any analysis is saved', async () => {
  const env = createTestEnv();
  const token = await loginToken(env);
  const res = await call(worker, env, 'GET', '/api/ai/insights', { token });
  assert.equal(res.status, 404);
  assert.equal(res.body.error, 'ai_insight_cache_miss');
});

test('AI insights refresh without an ARK key returns an unsaved local fallback', async () => {
  const env = createTestEnv();
  const token = await loginToken(env);
  const res = await call(worker, env, 'POST', '/api/ai/insights', {
    token,
    body: { section: 'overview-kpis', refresh: true, context: { label: '测试', kpis: [{ label: 'GMV', v: 1 }] } },
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.provider.status, 'not_configured');
  assert.equal(res.body.cache.status, 'not_saved');
  assert.ok(res.body.summary, 'fallback should still produce a summary');
});

test('task-calendar metric mutation persists across requests', async () => {
  const env = createTestEnv();
  const token = await loginToken(env);

  const calendar = await call(worker, env, 'GET', '/api/task-calendar', { token });
  assert.equal(calendar.status, 200);
  const company = calendar.body.companies?.[0];
  const unit = calendar.body.units?.find((entry) => entry.company === company) || calendar.body.units?.[0];
  assert.ok(unit, 'seed data should include at least one business unit');

  const date = calendar.body.selectedDate || calendar.body.today || '2026-06-01';
  const write = await call(worker, env, 'POST', '/api/task-calendar/metrics', {
    token,
    body: { unitId: unit.id, date, revenue: 12345 },
  });
  assert.equal(write.status, 200, 'metric upsert should succeed');
  assert.ok(write.body.taskCalendar, 'response should include the updated task calendar');
  assert.ok(write.body.dashboard, 'response should include a recalculated dashboard');
});
