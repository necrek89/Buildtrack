-- Work log entries for payroll tracking
create table if not exists work_logs (
  id          bigserial primary key,
  worker_id   uuid references profiles(id) on delete cascade,
  project_id  bigint references projects(id) on delete set null,
  log_date    date not null default current_date,
  log_type    text not null check (log_type in ('hours', 'shift')),
  value       numeric not null default 1,  -- hours count OR number of shifts
  rate        numeric not null default 0,  -- rate per hour or per shift
  notes       text,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz default now()
);

-- RLS
alter table work_logs enable row level security;

-- Foreman can insert/select/delete work logs for workers on their projects
create policy "foreman_manage_work_logs" on work_logs
  for all using (
    exists (
      select 1 from projects p
      where p.foreman_id = auth.uid()
        and (p.id = work_logs.project_id or work_logs.project_id is null)
    )
    or created_by = auth.uid()
  );

-- Worker can see their own logs
create policy "worker_view_own_logs" on work_logs
  for select using (worker_id = auth.uid());

-- Add default rate columns to profiles (safe to run multiple times)
alter table profiles add column if not exists default_rate numeric default 0;
alter table profiles add column if not exists rate_type text default 'shift' check (rate_type in ('hours', 'shift'));
