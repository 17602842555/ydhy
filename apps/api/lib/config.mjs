import { join } from 'node:path';

const storeModes = new Set(['json']);

export function loadRuntimeConfig({ apiDir }) {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const storeMode = normalizeStoreMode(process.env.HUAGE_STORE || 'json');
  const corsOrigin = process.env.HUAGE_CORS_ORIGIN || '*';
  const databaseUrl = process.env.DATABASE_URL || '';
  const config = {
    nodeEnv,
    api: {
      host: process.env.API_HOST || '127.0.0.1',
      port: positiveInt(process.env.API_PORT, 8787, 'API_PORT'),
      corsOrigin,
    },
    store: {
      mode: storeMode,
      adapter: storeMode === 'postgres' ? 'postgres-planned' : 'json-file',
      dataFile: process.env.HUAGE_DATA_FILE || join(apiDir, 'data/runtime.json'),
      databaseUrlConfigured: databaseUrl.length > 0,
    },
    sourceFiles: {
      adapter: process.env.HUAGE_SOURCE_FILE_ADAPTER || 'local',
      rootDir: process.env.HUAGE_SOURCE_FILE_DIR || join(apiDir, 'storage'),
    },
    limits: {
      maxBodyBytes: positiveInt(process.env.HUAGE_MAX_BODY_BYTES, 15_000_000, 'HUAGE_MAX_BODY_BYTES'),
      maxSourceFileBytes: positiveInt(process.env.HUAGE_MAX_SOURCE_FILE_BYTES, 10_000_000, 'HUAGE_MAX_SOURCE_FILE_BYTES'),
    },
    auth: {
      allowHeaderFallback: process.env.HUAGE_ALLOW_HEADER_AUTH === '1',
    },
    ai: {
      provider: 'ark-coding-plan',
      apiKey: process.env.ARK_API_KEY || '',
      configured: Boolean(process.env.ARK_API_KEY),
      model: process.env.ARK_MODEL || 'ark-code-latest',
      baseUrl: process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/coding/v3',
      timeoutMs: positiveInt(process.env.ARK_TIMEOUT_MS, 75_000, 'ARK_TIMEOUT_MS'),
    },
    schema: {
      path: join(apiDir, '../../docs/schema.sql'),
      checkCommand: 'npm run db:schema:check',
    },
    warnings: [],
  };

  if (nodeEnv === 'production' && corsOrigin === '*') {
    config.warnings.push('HUAGE_CORS_ORIGIN is wildcard in production');
  }
  if (databaseUrl) {
    config.warnings.push('DATABASE_URL is configured, but the executable API is still using JsonFileStore until the PostgreSQL adapter is implemented');
  }
  if (nodeEnv === 'production' && config.auth.allowHeaderFallback) {
    config.warnings.push('HUAGE_ALLOW_HEADER_AUTH must be disabled in production');
  }

  return config;
}

export function healthFromConfig(config) {
  return {
    environment: config.nodeEnv,
    api: {
      host: config.api.host,
      port: config.api.port,
      corsOrigin: config.api.corsOrigin,
    },
    store: {
      mode: config.store.mode,
      adapter: config.store.adapter,
      dataFile: config.store.mode === 'json' ? config.store.dataFile : null,
      databaseUrlConfigured: config.store.databaseUrlConfigured,
    },
    sourceFiles: {
      adapter: config.sourceFiles.adapter,
      rootDir: config.sourceFiles.adapter === 'local' ? config.sourceFiles.rootDir : null,
    },
    auth: {
      allowHeaderFallback: config.auth.allowHeaderFallback,
    },
    ai: {
      provider: config.ai.provider,
      configured: config.ai.configured,
      model: config.ai.model,
      baseUrl: config.ai.baseUrl,
      timeoutMs: config.ai.timeoutMs,
    },
    schema: config.schema,
    warnings: config.warnings,
  };
}

function normalizeStoreMode(value) {
  const mode = String(value || '').toLowerCase();
  if (!storeModes.has(mode)) {
    throw new Error(`invalid HUAGE_STORE ${value}; expected json until the PostgreSQL adapter is implemented`);
  }
  return mode;
}

function positiveInt(value, fallback, name) {
  if (value === undefined || value === null || value === '') return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return number;
}
