-- Documents table for project file storage
create table if not exists documents (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references projects(id) on delete cascade not null,
  name         text not null,
  url          text not null,
  size         bigint,
  type         text,
  uploaded_by  uuid references profiles(id) on delete set null,
  created_at   timestamptz default now()
);

alter table documents enable row level security;

-- Foreman of the project can do everything
create policy "Foreman full access on documents"
  on documents for all
  using (
    project_id in (select id from projects where foreman_id = auth.uid())
  )
  with check (
    project_id in (select id from projects where foreman_id = auth.uid())
  );

-- Workers on the project can read and insert
create policy "Workers can read project documents"
  on documents for select
  using (
    project_id in (select project_id from project_workers where worker_id = auth.uid())
  );

create policy "Workers can upload documents"
  on documents for insert
  with check (
    project_id in (select project_id from project_workers where worker_id = auth.uid())
  );
