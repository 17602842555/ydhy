import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const schemaPath = resolve('docs/schema.sql');
const schema = readFileSync(schemaPath, 'utf8');
const normalized = schema.replace(/--.*$/gm, '').replace(/\s+/g, ' ').trim().toLowerCase();

const requiredTables = [
  'schema_migrations',
  'groups',
  'roles',
  'role_permissions',
  'subsidiaries',
  'users',
  'person_profiles',
  'sessions',
  'metric_definitions',
  'import_batches',
  'source_rows',
  'validation_issues',
  'subsidiary_metrics',
  'workflow_items',
  'workflow_events',
  'operating_modules',
  'goal_branches',
  'module_contacts',
  'module_responsibilities',
  'reporting_lines',
  'handover_events',
  'brand_progress',
  'operating_tasks',
  'risk_items',
  'decision_packages',
  'supply_costs',
  'tax_cards',
  'commercial_modules',
  'master_data_records',
  'approval_flows',
  'commercial_work_orders',
  'integration_connectors',
  'report_packs',
  'client_targets',
  'system_policies',
  'audit_logs',
];

const requiredIndexes = [
  'import_batches_group_period_state_idx',
  'import_batches_group_hash_idx',
  'person_profiles_group_role_idx',
  'sessions_user_active_idx',
  'source_rows_batch_idx',
  'validation_issues_open_errors_idx',
  'subsidiary_metrics_dashboard_idx',
  'workflow_items_open_idx',
  'workflow_events_subsidiary_idx',
  'operating_modules_status_idx',
  'goal_branches_group_code_idx',
  'module_contacts_module_status_idx',
  'module_responsibilities_group_module_idx',
  'reporting_lines_person_idx',
  'handover_events_contact_idx',
  'brand_progress_period_status_idx',
  'operating_tasks_open_idx',
  'risk_items_open_idx',
  'decision_packages_source_risk_idx',
  'supply_costs_status_idx',
  'commercial_modules_status_idx',
  'master_data_records_type_status_idx',
  'approval_flows_state_idx',
  'commercial_work_orders_open_idx',
  'integration_connectors_status_idx',
  'report_packs_status_idx',
  'client_targets_status_idx',
  'system_policies_status_idx',
  'audit_logs_target_idx',
];

const requiredSnippets = [
  "state in ('raw', 'validated', 'published', 'corrected', 'archived')",
  "type in ('hev', 'task', 'risk', 'approval', 'decision')",
  "severity in ('warning', 'error')",
  'token_hash text not null unique',
  'file_hash text not null check',
  'raw_payload jsonb not null',
  'normalized_payload jsonb',
  'request_id text not null',
  'where revoked_at is null',
  "where severity = 'error' and resolved_at is null",
  "where state not in ('archived', 'closed', 'accepted')",
  "status in ('healthy', 'active', 'watch', 'risk', 'critical')",
  "status in ('待办', '进行中', '已完成')",
  "type in ('local', 'decision')",
  'owner_person_id uuid not null references person_profiles',
  'decision_maker_person_id uuid references person_profiles',
  'audit_event_id uuid',
  "record_type text not null check (record_type in ('legal_entity', 'brand', 'channel', 'product', 'supplier', 'warehouse'))",
  "status text not null check (status in ('待办', '进行中', '阻塞', '已完成'))",
  "status text not null check (status in ('active', 'manual_export', 'planned', 'scaffold'))",
];

const failures = [];
for (const table of requiredTables) {
  if (!normalized.includes(`create table ${table} `)) failures.push(`missing table: ${table}`);
}
for (const index of requiredIndexes) {
  if (!normalized.includes(`create index ${index} `) && !normalized.includes(`create unique index ${index} `)) {
    failures.push(`missing index: ${index}`);
  }
}
for (const snippet of requiredSnippets) {
  if (!normalized.includes(snippet)) failures.push(`missing schema invariant: ${snippet}`);
}

const tableBlocks = tableDefinitions(normalized);
for (const table of [
  'subsidiaries',
  'users',
  'person_profiles',
  'metric_definitions',
  'import_batches',
  'subsidiary_metrics',
  'workflow_items',
  'workflow_events',
  'operating_modules',
  'goal_branches',
  'module_contacts',
  'module_responsibilities',
  'reporting_lines',
  'handover_events',
  'brand_progress',
  'operating_tasks',
  'risk_items',
  'decision_packages',
  'supply_costs',
  'tax_cards',
  'commercial_modules',
  'master_data_records',
  'approval_flows',
  'commercial_work_orders',
  'integration_connectors',
  'report_packs',
  'client_targets',
  'system_policies',
  'audit_logs',
]) {
  if (!tableBlocks.get(table)?.includes('group_id')) failures.push(`${table} must carry group_id`);
}

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, schemaPath, failures }, null, 2));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      schemaPath,
      sha256: createHash('sha256').update(schema).digest('hex'),
      tables: requiredTables.length,
      indexes: requiredIndexes.length,
      invariants: requiredSnippets.length,
    },
    null,
    2,
  ),
);

function tableDefinitions(sql) {
  const definitions = new Map();
  const regex = /create table ([a-z_]+) \((.*?)\);/g;
  let match;
  while ((match = regex.exec(sql))) {
    definitions.set(match[1], match[2]);
  }
  return definitions;
}
