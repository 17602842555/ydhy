import { readFileSync, writeFileSync } from 'node:fs';

const configPath = 'wrangler.jsonc';
const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
const corsOrigin = process.env.HUAGE_CORS_ORIGIN;

let config = readFileSync(configPath, 'utf8');

if (config.includes('REPLACE_WITH_CLOUDFLARE_D1_DATABASE_ID')) {
  if (!databaseId) {
    console.error('CLOUDFLARE_D1_DATABASE_ID is required. Create a D1 database with `npx wrangler d1 create ydhy-db` and use the returned database_id.');
    process.exit(1);
  }
  config = config.replace('REPLACE_WITH_CLOUDFLARE_D1_DATABASE_ID', databaseId);
}

if (corsOrigin) {
  config = config.replace('"HUAGE_CORS_ORIGIN": "*"', `"HUAGE_CORS_ORIGIN": ${JSON.stringify(corsOrigin)}`);
}

writeFileSync(configPath, config);
console.log(JSON.stringify({ ok: true, configPath, databaseIdConfigured: !config.includes('REPLACE_WITH_CLOUDFLARE_D1_DATABASE_ID'), corsOrigin: corsOrigin || 'from-wrangler-config' }, null, 2));
