create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member', 'viewer')),
  joined_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table public.datasets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  description text,
  original_filename text,
  storage_path text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  row_count bigint check (row_count is null or row_count >= 0),
  column_count integer check (column_count is null or column_count >= 0),
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'failed')),
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.dataset_columns (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.datasets(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  position integer not null check (position >= 0),
  detected_type text,
  nullable boolean not null default true,
  missing_count bigint check (missing_count is null or missing_count >= 0),
  unique_count bigint check (unique_count is null or unique_count >= 0),
  created_at timestamptz not null default now(),
  unique (dataset_id, position),
  unique (dataset_id, name)
);

create table public.data_quality_issues (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  dataset_id uuid not null references public.datasets(id) on delete cascade,
  column_id uuid references public.dataset_columns(id) on delete set null,
  title text not null check (char_length(trim(title)) between 3 and 180),
  description text,
  issue_type text not null check (char_length(trim(issue_type)) between 2 and 80),
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'dismissed')),
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint data_quality_issues_resolution_consistency check (
    (status in ('resolved', 'dismissed') and resolved_at is not null)
    or (status in ('open', 'in_progress') and resolved_at is null)
  )
);

create table public.issue_comments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.data_quality_issues(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete restrict,
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (char_length(trim(event_type)) between 2 and 120),
  entity_type text not null check (entity_type in ('workspace', 'member', 'dataset', 'column', 'issue', 'comment')),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index workspace_members_user_id_idx on public.workspace_members(user_id);
create index workspace_members_workspace_id_role_idx on public.workspace_members(workspace_id, role);
create index workspaces_created_by_idx on public.workspaces(created_by);
create index datasets_workspace_id_idx on public.datasets(workspace_id);
create index datasets_uploaded_by_idx on public.datasets(uploaded_by);
create index dataset_columns_dataset_id_idx on public.dataset_columns(dataset_id);
create index data_quality_issues_workspace_id_idx on public.data_quality_issues(workspace_id);
create index data_quality_issues_dataset_id_idx on public.data_quality_issues(dataset_id);
create index data_quality_issues_assigned_to_idx on public.data_quality_issues(assigned_to);
create index issue_comments_issue_id_idx on public.issue_comments(issue_id);
create index activity_events_workspace_id_created_at_idx on public.activity_events(workspace_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

create trigger datasets_set_updated_at
before update on public.datasets
for each row execute function public.set_updated_at();

create trigger data_quality_issues_set_updated_at
before update on public.data_quality_issues
for each row execute function public.set_updated_at();

create trigger issue_comments_set_updated_at
before update on public.issue_comments
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'avatar_url'), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.slugify(input text)
returns text
language sql
immutable
set search_path = public
as $$
  select trim(both '-' from regexp_replace(lower(trim(input)), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.workspace_member_role(target_workspace_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select wm.role
  from public.workspace_members wm
  where wm.workspace_id = target_workspace_id
    and wm.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.can_write_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.workspace_member_role(target_workspace_id) in ('owner', 'admin', 'member'), false);
$$;

create or replace function public.can_manage_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.workspace_member_role(target_workspace_id) in ('owner', 'admin'), false);
$$;

create or replace function public.can_access_dataset(target_dataset_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.datasets d
    join public.workspace_members wm on wm.workspace_id = d.workspace_id
    where d.id = target_dataset_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.can_write_dataset(target_dataset_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.datasets d
    join public.workspace_members wm on wm.workspace_id = d.workspace_id
    where d.id = target_dataset_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin', 'member')
  );
$$;

create or replace function public.can_access_issue(target_issue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.data_quality_issues i
    join public.workspace_members wm on wm.workspace_id = i.workspace_id
    where i.id = target_issue_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.can_write_issue(target_issue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.data_quality_issues i
    join public.workspace_members wm on wm.workspace_id = i.workspace_id
    where i.id = target_issue_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin', 'member')
  );
$$;

create or replace function public.create_workspace(
  workspace_name text,
  workspace_description text default null
)
returns public.workspaces
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  base_slug text;
  candidate_slug text;
  suffix integer := 1;
  created_workspace public.workspaces;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if workspace_name is null or char_length(trim(workspace_name)) < 2 or char_length(trim(workspace_name)) > 120 then
    raise exception 'Workspace name must be between 2 and 120 characters' using errcode = '22023';
  end if;

  base_slug := public.slugify(workspace_name);
  if base_slug = '' then
    base_slug := 'workspace';
  end if;

  candidate_slug := base_slug;

  loop
    begin
      insert into public.workspaces (name, slug, description, created_by)
      values (
        trim(workspace_name),
        candidate_slug,
        nullif(trim(workspace_description), ''),
        current_user_id
      )
      returning * into created_workspace;

      exit;
    exception when unique_violation then
      suffix := suffix + 1;
      candidate_slug := base_slug || '-' || suffix::text;
    end;
  end loop;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (created_workspace.id, current_user_id, 'owner');

  return created_workspace;
end;
$$;

comment on function public.is_workspace_member(uuid)
is 'SECURITY DEFINER helper used by RLS policies to avoid recursive workspace_members checks; scoped to auth.uid().';

comment on function public.workspace_member_role(uuid)
is 'SECURITY DEFINER helper used by RLS policies to read the current user role for one workspace; scoped to auth.uid().';

comment on function public.create_workspace(text, text)
is 'Atomic authenticated workspace creation RPC that also inserts the creator as owner.';

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.datasets enable row level security;
alter table public.dataset_columns enable row level security;
alter table public.data_quality_issues enable row level security;
alter table public.issue_comments enable row level security;
alter table public.activity_events enable row level security;

create policy "authenticated users can read profiles"
on public.profiles for select
to authenticated
using (true);

create policy "users can insert their own profile"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "users can update their own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "members can read workspaces"
on public.workspaces for select
to authenticated
using (public.is_workspace_member(id));

create policy "owners and admins can update workspaces"
on public.workspaces for update
to authenticated
using (public.can_manage_workspace(id))
with check (public.can_manage_workspace(id));

create policy "owners can delete workspaces"
on public.workspaces for delete
to authenticated
using (public.workspace_member_role(id) = 'owner');

create policy "members can read workspace membership"
on public.workspace_members for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "owners and admins can add non-owner members"
on public.workspace_members for insert
to authenticated
with check (
  public.can_manage_workspace(workspace_id)
  and role in ('admin', 'member', 'viewer')
);

create policy "owners and admins can update non-owner members"
on public.workspace_members for update
to authenticated
using (
  public.can_manage_workspace(workspace_id)
  and role <> 'owner'
)
with check (
  public.can_manage_workspace(workspace_id)
  and role <> 'owner'
);

create policy "owners admins and users can remove non-owner members"
on public.workspace_members for delete
to authenticated
using (
  role <> 'owner'
  and (
    public.can_manage_workspace(workspace_id)
    or user_id = auth.uid()
  )
);

create policy "workspace members can read datasets"
on public.datasets for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "workspace writers can create datasets"
on public.datasets for insert
to authenticated
with check (
  public.can_write_workspace(workspace_id)
  and uploaded_by = auth.uid()
);

create policy "workspace writers can update datasets"
on public.datasets for update
to authenticated
using (public.can_write_workspace(workspace_id))
with check (public.can_write_workspace(workspace_id));

create policy "workspace managers can delete datasets"
on public.datasets for delete
to authenticated
using (public.can_manage_workspace(workspace_id));

create policy "workspace members can read dataset columns"
on public.dataset_columns for select
to authenticated
using (public.can_access_dataset(dataset_id));

create policy "workspace writers can create dataset columns"
on public.dataset_columns for insert
to authenticated
with check (public.can_write_dataset(dataset_id));

create policy "workspace writers can update dataset columns"
on public.dataset_columns for update
to authenticated
using (public.can_write_dataset(dataset_id))
with check (public.can_write_dataset(dataset_id));

create policy "workspace writers can delete dataset columns"
on public.dataset_columns for delete
to authenticated
using (public.can_write_dataset(dataset_id));

create policy "workspace members can read issues"
on public.data_quality_issues for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "workspace writers can create issues"
on public.data_quality_issues for insert
to authenticated
with check (
  public.can_write_workspace(workspace_id)
  and created_by = auth.uid()
  and public.can_access_dataset(dataset_id)
);

create policy "workspace writers can update issues"
on public.data_quality_issues for update
to authenticated
using (public.can_write_workspace(workspace_id))
with check (public.can_write_workspace(workspace_id));

create policy "workspace managers can delete issues"
on public.data_quality_issues for delete
to authenticated
using (public.can_manage_workspace(workspace_id));

create policy "workspace members can read issue comments"
on public.issue_comments for select
to authenticated
using (public.can_access_issue(issue_id));

create policy "workspace writers can create issue comments"
on public.issue_comments for insert
to authenticated
with check (
  public.can_write_issue(issue_id)
  and author_id = auth.uid()
);

create policy "comment authors can update their comments"
on public.issue_comments for update
to authenticated
using (
  public.can_write_issue(issue_id)
  and author_id = auth.uid()
)
with check (
  public.can_write_issue(issue_id)
  and author_id = auth.uid()
);

create policy "comment authors and managers can delete comments"
on public.issue_comments for delete
to authenticated
using (
  public.can_write_issue(issue_id)
  and (
    author_id = auth.uid()
    or exists (
      select 1
      from public.data_quality_issues i
      where i.id = issue_id
        and public.can_manage_workspace(i.workspace_id)
    )
  )
);

create policy "workspace members can read activity"
on public.activity_events for select
to authenticated
using (public.is_workspace_member(workspace_id));

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  public.profiles,
  public.workspaces,
  public.workspace_members,
  public.datasets,
  public.dataset_columns,
  public.data_quality_issues,
  public.issue_comments,
  public.activity_events
to authenticated;

revoke execute on function public.is_workspace_member(uuid) from public;
revoke execute on function public.workspace_member_role(uuid) from public;
revoke execute on function public.can_write_workspace(uuid) from public;
revoke execute on function public.can_manage_workspace(uuid) from public;
revoke execute on function public.can_access_dataset(uuid) from public;
revoke execute on function public.can_write_dataset(uuid) from public;
revoke execute on function public.can_access_issue(uuid) from public;
revoke execute on function public.can_write_issue(uuid) from public;
revoke execute on function public.create_workspace(text, text) from public;

grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.workspace_member_role(uuid) to authenticated;
grant execute on function public.can_write_workspace(uuid) to authenticated;
grant execute on function public.can_manage_workspace(uuid) to authenticated;
grant execute on function public.can_access_dataset(uuid) to authenticated;
grant execute on function public.can_write_dataset(uuid) to authenticated;
grant execute on function public.can_access_issue(uuid) to authenticated;
grant execute on function public.can_write_issue(uuid) to authenticated;
grant execute on function public.create_workspace(text, text) to authenticated;
