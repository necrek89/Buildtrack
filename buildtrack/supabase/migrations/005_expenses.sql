-- Expenses table for project cost tracking
create table if not exists expenses (
  id           uuid primary key default gen_random_uuid(),
  project_id   bigint references projects(id) on delete cascade not null,
  foreman_id   uuid references profiles(id) on delete set null,
  title        text not null,
  amount       numeric not null,
  currency     text default 'USD',
  category     text default 'other'
                 check (category in ('materials','labor','equipment','transport','other')),
  receipt_url  text,
  notes        text,
  date         date default current_date,
  created_at   timestamptz default now()
);

alter table expenses enable row level security;

-- Foreman full access over their own expenses
create policy "Foreman full access on expenses"
  on expenses for all
  using   (foreman_id = auth.uid())
  with check (foreman_id = auth.uid());

-- All project members can read
create policy "Team members can read project expenses"
  on expenses for select
  using (
    project_id in (
      select id from projects where foreman_id = auth.uid()
    )
    or
    project_id in (
      select project_id from project_workers where worker_id = auth.uid()
    )
  );
