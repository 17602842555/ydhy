import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const schemaPath = resolve('docs/schema.sql');
const schema = readFileSync(schemaPath, 'utf8');
const checksum = createHash('sha256').update(schema).digest('hex');
const migration = {
  version: '001_init_schema',
  description: 'Initial HUAGE commercial OS PostgreSQL schema',
  checksum,
};

if (dryRun) {
  console.log(JSON.stringify({ ok: true, mode: 'dry-run', schemaPath, migration }, null, 2));
  process.exit(0);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error(JSON.stringify({ ok: false, error: 'missing_database_url', reason: 'DATABASE_URL is required for db:migrate' }, null, 2));
  process.exit(1);
}

const psqlVersion = spawnSync('psql', ['--version'], { encoding: 'utf8' });
if (psqlVersion.status !== 0) {
  console.error(JSON.stringify({ ok: false, error: 'missing_psql', reason: 'psql CLI is required to run migrations' }, null, 2));
  process.exit(1);
}

const hasMigrationTable = query("select coalesce(to_regclass('public.schema_migrations')::text, '');");
if (hasMigrationTable === 'schema_migrations') {
  const existingChecksum = query(`select checksum from schema_migrations where version='${migration.version}';`);
  if (existingChecksum === migration.checksum) {
    console.log(JSON.stringify({ ok: true, mode: 'noop', migration, psql: psqlVersion.stdout.trim() }, null, 2));
    process.exit(0);
  }
  if (existingChecksum) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: 'checksum_mismatch',
          migration,
          existingChecksum,
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }
}

const sql = [
  'begin;',
  schema,
  `insert into schema_migrations (version, description, checksum) values ('${migration.version}', '${migration.description}', '${migration.checksum}');`,
  'commit;',
].join('\n\n');

const applied = spawnSync('psql', [databaseUrl, '-v', 'ON_ERROR_STOP=1'], {
  input: sql,
  encoding: 'utf8',
  maxBuffer: 1024 * 1024 * 10,
});
if (applied.status !== 0) {
  console.error(JSON.stringify({ ok: false, error: 'migration_failed', stderr: applied.stderr.trim() }, null, 2));
  process.exit(applied.status ?? 1);
}

console.log(JSON.stringify({ ok: true, mode: 'applied', migration, psql: psqlVersion.stdout.trim() }, null, 2));

function query(sql) {
  const result = spawnSync('psql', [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-Atc', sql], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  });
  if (result.status !== 0) {
    console.error(JSON.stringify({ ok: false, error: 'query_failed', sql, stderr: result.stderr.trim() }, null, 2));
    process.exit(result.status ?? 1);
  }
  return result.stdout.trim();
}
