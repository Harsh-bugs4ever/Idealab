-- Run once in the Supabase SQL editor. Server API is the only writer.
create table public.sf_workspaces (
 id uuid primary key default gen_random_uuid(),
 name text not null default 'SwachhFlow team demo',
 state jsonb not null,
 revision bigint not null default 0 check (revision >= 0),
 created_at timestamptz not null default now()
);
create table public.sf_memberships (
 user_id uuid primary key references auth.users(id) on delete cascade,
 workspace_id uuid not null references public.sf_workspaces(id),
 role text not null check (role in ('Supervisor','Attendant')),
 display_name text not null
);
alter table public.sf_workspaces enable row level security;
alter table public.sf_memberships enable row level security;
-- No anon/authenticated direct access: all reads/writes use the server API,
-- which validates the user JWT, membership, role, action, and revision.
revoke all on public.sf_workspaces from anon, authenticated;
revoke all on public.sf_memberships from anon, authenticated;
grant all on public.sf_workspaces to service_role;
grant all on public.sf_memberships to service_role;
-- JSON state stores the versioned MVP entities: facilities & source metadata,
-- usage observations, inspections/activity, reports, tasks, policy.
-- Every update uses a conditional revision for atomic conflict detection.
