// Minimal in-memory Cloudflare D1 binding stub.
//
// D1StateStore only uses a tiny slice of the D1 prepared-statement API:
//   db.prepare(sql).run()
//   db.prepare(sql).bind(...args).first()
//   db.prepare(sql).bind(...args).run()
// against a single `app_state(id, payload, updated_at)` table. This stub
// recognizes those three statements by keyword and keeps rows in a Map so the
// Worker entrypoint can be driven end-to-end without a real D1 database.
export function createD1Stub() {
  const rows = new Map(); // id -> payload (string)

  function prepare(sql) {
    const text = String(sql);
    let bound = [];
    const stmt = {
      bind(...args) {
        bound = args;
        return stmt;
      },
      async first() {
        if (/select\s+payload\s+from\s+app_state/i.test(text)) {
          const id = bound[0];
          return rows.has(id) ? { payload: rows.get(id) } : null;
        }
        return null;
      },
      async run() {
        if (/insert\s+into\s+app_state/i.test(text)) {
          const [id, payload] = bound;
          rows.set(id, String(payload));
        }
        // `create table if not exists ...` and anything else is a no-op.
        return { success: true, meta: {} };
      },
    };
    return stmt;
  }

  return { prepare, _rows: rows };
}

// Build a fresh Worker env with an isolated D1 stub. No ARK_API_KEY is set, so
// AI analysis stays on the deterministic local-fallback path during tests.
export function createTestEnv(overrides = {}) {
  return {
    DB: createD1Stub(),
    ENVIRONMENT: 'test',
    HUAGE_CORS_ORIGIN: 'http://127.0.0.1:5173',
    HUAGE_ALLOW_HEADER_AUTH: '0',
    ARK_MODEL: 'ark-code-latest',
    ARK_BASE_URL: 'https://ark.invalid',
    ...overrides,
  };
}

const TEST_ORIGIN = 'http://127.0.0.1:5173';

export function makeRequest(method, path, { token, body, origin = TEST_ORIGIN } = {}) {
  const headers = {};
  if (origin) headers.Origin = origin;
  let payload;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = typeof body === 'string' ? body : JSON.stringify(body);
  }
  if (token) headers.Authorization = `Bearer ${token}`;
  return new Request(`https://worker.test${path}`, { method, headers, body: payload });
}

// Call the Worker handler and return { status, headers, body }.
export async function call(worker, env, method, path, options = {}) {
  const response = await worker.fetch(makeRequest(method, path, options), env);
  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  return { status: response.status, headers: response.headers, body: json };
}
