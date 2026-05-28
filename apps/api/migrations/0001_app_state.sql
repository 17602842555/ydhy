create table if not exists app_state (
  id text primary key,
  payload text not null,
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
