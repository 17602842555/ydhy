-- Draft PostgreSQL-oriented schema for the 子公司监管 MVP.
-- This is a design artifact; migrations will be generated when the DB layer is added.

create table schema_migrations (
  version text primary key,
  description text not null,
  checksum text not null,
  applied_at timestamptz not null default now()
);

create table groups (
  id uuid primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table roles (
  id text primary key,
  name text not null,
  scope text not null check (scope in ('group', 'subsidiary', 'module')),
  created_at timestamptz not null default now()
);

create table role_permissions (
  role_id text not null references roles(id),
  permission text not null,
  primary key (role_id, permission)
);

create table subsidiaries (
  id uuid primary key,
  group_id uuid not null references groups(id),
  name text not null,
  owner_user_id uuid,
  active boolean not null default true,
  unique (group_id, name)
);

create table users (
  id uuid primary key,
  group_id uuid not null references groups(id),
  display_name text not null,
  role_code text not null references roles(id),
  subsidiary_id uuid references subsidiaries(id),
  active boolean not null default true
);

create table person_profiles (
  id uuid primary key,
  group_id uuid not null references groups(id),
  user_id uuid references users(id),
  display_name text not null,
  role_code text not null,
  title text not null,
  module text not null,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table sessions (
  id uuid primary key,
  user_id uuid not null references users(id),
  token_hash text not null unique,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create table metric_definitions (
  id uuid primary key,
  group_id uuid not null references groups(id),
  code text not null,
  name text not null,
  unit text not null,
  formula text,
  source_policy text not null,
  unique (group_id, code)
);

create table import_batches (
  id uuid primary key,
  group_id uuid not null references groups(id),
  period text not null,
  file_name text not null,
  source text not null,
  file_hash text not null check (file_hash ~ '^sha256-[a-f0-9]{12,64}$'),
  object_key text,
  source_mime_type text,
  source_file_size bigint check (source_file_size is null or source_file_size >= 0),
  uploaded_by uuid not null references users(id),
  state text not null check (state in ('raw', 'validated', 'published', 'corrected', 'archived')),
  row_count integer not null default 0,
  error_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table source_rows (
  id uuid primary key,
  batch_id uuid not null references import_batches(id),
  row_number integer not null,
  raw_payload jsonb not null,
  normalized_payload jsonb,
  validation_state text not null check (validation_state in ('valid', 'warning', 'error')),
  unique (batch_id, row_number)
);

create table validation_issues (
  id uuid primary key,
  batch_id uuid not null references import_batches(id),
  row_number integer not null,
  field text not null,
  severity text not null check (severity in ('warning', 'error')),
  message text not null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table subsidiary_metrics (
  id uuid primary key,
  group_id uuid not null references groups(id),
  subsidiary_id uuid not null references subsidiaries(id),
  metric_id uuid not null references metric_definitions(id),
  period text not null,
  value numeric not null,
  data_state text not null check (data_state in ('raw', 'validated', 'published', 'corrected', 'archived')),
  import_batch_id uuid not null references import_batches(id),
  source_row_id uuid not null references source_rows(id),
  created_at timestamptz not null default now()
);

create table workflow_items (
  id uuid primary key,
  group_id uuid not null references groups(id),
  subsidiary_id uuid references subsidiaries(id),
  type text not null check (type in ('hev', 'task', 'risk', 'approval', 'decision')),
  state text not null,
  title text not null,
  owner_user_id uuid references users(id),
  evidence jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table workflow_events (
  id uuid primary key,
  group_id uuid not null references groups(id),
  subsidiary_id uuid references subsidiaries(id),
  type text not null check (type in ('hev', 'task', 'risk', 'approval', 'decision')),
  actor_user_id uuid references users(id),
  before_state text not null,
  after_state text not null,
  reason text not null,
  request_id text not null,
  created_at timestamptz not null default now()
);

create table operating_modules (
  id text primary key,
  group_id uuid not null references groups(id),
  name text not null,
  owner_user_id uuid references users(id),
  status text not null check (status in ('healthy', 'active', 'watch', 'risk', 'critical')),
  summary text not null,
  open_items integer not null default 0,
  updated_at timestamptz not null default now()
);

create table goal_branches (
  id text primary key,
  group_id uuid not null references groups(id),
  code text not null,
  name text not null,
  owner_user_id uuid references users(id),
  status text not null check (status in ('healthy', 'active', 'watch', 'risk', 'critical')),
  objectives jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  unique (group_id, code)
);

create table module_contacts (
  id uuid primary key,
  group_id uuid not null references groups(id),
  module text not null,
  company text not null,
  contact_user_id uuid references users(id),
  contact_name text not null,
  reports_to_user_id uuid references users(id),
  status text not null check (status in ('正常', '预警', '停用')),
  remark text,
  updated_at timestamptz not null default now()
);

create table module_responsibilities (
  id uuid primary key,
  group_id uuid not null references groups(id),
  module text not null,
  owner_person_id uuid not null references person_profiles(id),
  accountable_person_id uuid not null references person_profiles(id),
  scope text not null,
  updated_at timestamptz not null default now()
);

create table reporting_lines (
  id uuid primary key,
  group_id uuid not null references groups(id),
  from_person_id uuid not null references person_profiles(id),
  to_person_id uuid not null references person_profiles(id),
  relation text not null,
  updated_at timestamptz not null default now()
);

create table handover_events (
  id uuid primary key,
  group_id uuid not null references groups(id),
  contact_id uuid references module_contacts(id),
  before_contact text not null,
  after_contact text not null,
  before_status text,
  after_status text,
  reason text not null,
  actor_user_id uuid references users(id),
  created_at timestamptz not null default now()
);

create table brand_progress (
  id uuid primary key,
  group_id uuid not null references groups(id),
  brand_name text not null,
  company text not null,
  owner_user_id uuid references users(id),
  period text not null,
  completion numeric not null check (completion >= 0),
  status text not null check (status in ('healthy', 'watch', 'risk', 'critical')),
  updated_at timestamptz not null default now(),
  unique (group_id, brand_name, period)
);

create table operating_tasks (
  id uuid primary key,
  group_id uuid not null references groups(id),
  module text not null,
  title text not null,
  owner_user_id uuid references users(id),
  owner_name text not null,
  due_date date,
  priority text not null check (priority in ('高', '中', '低')),
  status text not null check (status in ('待办', '进行中', '已完成')),
  source jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table risk_items (
  id uuid primary key,
  group_id uuid not null references groups(id),
  type text not null check (type in ('local', 'decision')),
  level text not null check (level in ('watch', 'risk', 'critical')),
  description text not null,
  owner_user_id uuid references users(id),
  owner_name text not null,
  status text not null default 'open' check (status in ('open', 'mitigating', 'closed', 'decided')),
  evidence jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create table decision_packages (
  id uuid primary key,
  group_id uuid not null references groups(id),
  title text not null,
  state text not null check (state in ('proposed', 'evidence_attached', 'pending_decision', 'decided', 'action_created', 'archived')),
  owner_user_id uuid references users(id),
  summary text not null,
  source_risk_id uuid references risk_items(id),
  owner_person_id uuid references person_profiles(id),
  escalation_reason text,
  impact_scope text,
  decision_maker_person_id uuid references person_profiles(id),
  evidence_refs jsonb not null default '[]',
  audit_event_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table supply_costs (
  id uuid primary key,
  group_id uuid not null references groups(id),
  brand text not null,
  spec text not null,
  product_cost numeric not null check (product_cost >= 0),
  logistics_cost numeric not null check (logistics_cost >= 0),
  total_cost numeric not null check (total_cost >= 0),
  status text not null check (status in ('healthy', 'watch', 'risk', 'critical')),
  updated_at timestamptz not null default now()
);

create table tax_cards (
  id uuid primary key,
  group_id uuid not null references groups(id),
  title text not null,
  status text not null check (status in ('normal', 'active', 'watch', 'risk')),
  description text not null,
  updated_at timestamptz not null default now()
);

create table commercial_modules (
  id text primary key,
  group_id uuid not null references groups(id),
  name text not null,
  layer text not null,
  owner_name text not null,
  status text not null check (status in ('healthy', 'active', 'watch', 'risk', 'critical', 'scaffold', 'manual_export', 'planned', 'draft')),
  coverage text not null,
  updated_at timestamptz not null default now()
);

create table master_data_records (
  id uuid primary key,
  group_id uuid not null references groups(id),
  record_type text not null check (record_type in ('legal_entity', 'brand', 'channel', 'product', 'supplier', 'warehouse')),
  external_id text not null,
  name text not null,
  status text not null,
  payload jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  unique (group_id, record_type, external_id)
);

create table approval_flows (
  id uuid primary key,
  group_id uuid not null references groups(id),
  title text not null,
  type text not null,
  state text not null,
  current_node text not null,
  owner_name text not null,
  sla text not null,
  evidence_refs jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create table commercial_work_orders (
  id uuid primary key,
  group_id uuid not null references groups(id),
  title text not null,
  module text not null,
  owner_name text not null,
  priority text not null check (priority in ('高', '中', '低')),
  status text not null check (status in ('待办', '进行中', '阻塞', '已完成')),
  due_date date,
  source text not null,
  updated_at timestamptz not null default now()
);

create table integration_connectors (
  id uuid primary key,
  group_id uuid not null references groups(id),
  name text not null,
  category text not null,
  status text not null check (status in ('active', 'manual_export', 'planned', 'scaffold')),
  adapter text not null,
  owner_name text not null,
  objects jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create table report_packs (
  id uuid primary key,
  group_id uuid not null references groups(id),
  name text not null,
  frequency text not null,
  owner_name text not null,
  status text not null check (status in ('active', 'draft', 'planned')),
  sections jsonb not null default '[]',
  recipients jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create table client_targets (
  id uuid primary key,
  group_id uuid not null references groups(id),
  name text not null,
  platform text not null,
  status text not null check (status in ('active', 'scaffold', 'planned')),
  entry text not null,
  capability text not null,
  updated_at timestamptz not null default now()
);

create table system_policies (
  id uuid primary key,
  group_id uuid not null references groups(id),
  name text not null,
  status text not null check (status in ('active', 'watch', 'planned')),
  owner_name text not null,
  policy text not null,
  updated_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key,
  group_id uuid not null references groups(id),
  actor_user_id uuid references users(id),
  actor_role text not null,
  action text not null,
  target_type text not null,
  target_id text not null,
  before_state text,
  after_state text,
  reason text,
  request_id text not null,
  created_at timestamptz not null default now()
);

create index import_batches_group_period_state_idx on import_batches (group_id, period, state);
create unique index import_batches_group_hash_idx on import_batches (group_id, file_hash);
create index person_profiles_group_role_idx on person_profiles (group_id, role_code, active);
create index sessions_user_active_idx on sessions (user_id, expires_at desc)
  where revoked_at is null;
create index source_rows_batch_idx on source_rows (batch_id, row_number);
create index validation_issues_open_errors_idx on validation_issues (batch_id, row_number)
  where severity = 'error' and resolved_at is null;
create index subsidiary_metrics_dashboard_idx on subsidiary_metrics (group_id, period, data_state, subsidiary_id);
create index workflow_items_open_idx on workflow_items (group_id, type, state, subsidiary_id)
  where state not in ('archived', 'closed', 'accepted');
create index workflow_events_subsidiary_idx on workflow_events (group_id, subsidiary_id, type, created_at desc);
create index operating_modules_status_idx on operating_modules (group_id, status);
create index goal_branches_group_code_idx on goal_branches (group_id, code);
create index module_contacts_module_status_idx on module_contacts (group_id, module, status);
create index module_responsibilities_group_module_idx on module_responsibilities (group_id, module);
create index reporting_lines_person_idx on reporting_lines (group_id, from_person_id, to_person_id);
create index handover_events_contact_idx on handover_events (group_id, contact_id, created_at desc);
create index brand_progress_period_status_idx on brand_progress (group_id, period, status);
create index operating_tasks_open_idx on operating_tasks (group_id, module, due_date)
  where status <> '已完成';
create index risk_items_open_idx on risk_items (group_id, level, updated_at desc)
  where status <> 'closed';
create unique index decision_packages_source_risk_idx on decision_packages (group_id, source_risk_id)
  where source_risk_id is not null;
create index supply_costs_status_idx on supply_costs (group_id, status);
create index commercial_modules_status_idx on commercial_modules (group_id, status, layer);
create index master_data_records_type_status_idx on master_data_records (group_id, record_type, status);
create index approval_flows_state_idx on approval_flows (group_id, state, updated_at desc);
create index commercial_work_orders_open_idx on commercial_work_orders (group_id, module, due_date)
  where status <> '已完成';
create index integration_connectors_status_idx on integration_connectors (group_id, category, status);
create index report_packs_status_idx on report_packs (group_id, status, frequency);
create index client_targets_status_idx on client_targets (group_id, status, platform);
create index system_policies_status_idx on system_policies (group_id, status);
create index audit_logs_target_idx on audit_logs (target_type, target_id, created_at desc);
