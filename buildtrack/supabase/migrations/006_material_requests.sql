create table if not exists material_requests (
  id          bigserial primary key,
  project_id  bigint references projects(id) on delete cascade,
  task_id     bigint references tasks(id) on delete set null,
  worker_id   uuid references profiles(id) on delete cascade,
  worker_name text not null,
  name        text not null,
  qty         numeric,
  unit        text,
  notes       text,
  photo_url   text,
  status      text not null default 'open' check (status in ('open','closed')),
  created_at  timestamptz default now()
);

alter table material_requests enable row level security;

-- Workers can insert and select their own requests
create policy "worker_insert" on material_requests for insert
  with check (auth.uid() = worker_id);

create policy "worker_select" on material_requests for select
  using (auth.uid() = worker_id);

-- Foreman/manager can select all requests for projects they own
-- (via project_workers or as the project creator)
create policy "foreman_select" on material_requests for select
  using (
    exists (
      select 1 from projects p
      where p.id = material_requests.project_id
        and p.foreman_id = auth.uid()
    )
  );

create policy "foreman_update" on material_requests for update
  using (
    exists (
      select 1 from projects p
      where p.id = material_requests.project_id
        and p.foreman_id = auth.uid()
    )
  );

create policy "foreman_delete" on material_requests for delete
  using (
    exists (
      select 1 from projects p
      where p.id = material_requests.project_id
        and p.foreman_id = auth.uid()
    )
    or auth.uid() = worker_id
  );
