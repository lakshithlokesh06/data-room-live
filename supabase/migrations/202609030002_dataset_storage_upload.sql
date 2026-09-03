alter table public.datasets
  add column if not exists processing_error text;

create index if not exists datasets_status_idx on public.datasets(status);
create index if not exists datasets_created_at_idx on public.datasets(created_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'datasets',
  'datasets',
  false,
  20971520,
  array['text/csv', 'application/csv', 'text/plain', 'application/vnd.ms-excel']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.try_parse_uuid(value text)
returns uuid
language plpgsql
immutable
set search_path = public
as $$
begin
  return value::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

create or replace function public.dataset_storage_workspace_id(object_name text)
returns uuid
language sql
stable
set search_path = public, storage
as $$
  select public.try_parse_uuid((storage.foldername(object_name))[1]);
$$;

create or replace function public.dataset_storage_dataset_id(object_name text)
returns uuid
language sql
stable
set search_path = public, storage
as $$
  select public.try_parse_uuid((storage.foldername(object_name))[2]);
$$;

create or replace function public.can_read_dataset_object(object_name text)
returns boolean
language sql
security definer
stable
set search_path = public, storage
as $$
  select exists (
    select 1
    from public.datasets d
    where d.id = public.dataset_storage_dataset_id(object_name)
      and d.workspace_id = public.dataset_storage_workspace_id(object_name)
      and d.storage_path = object_name
      and public.is_workspace_member(d.workspace_id)
  );
$$;

create or replace function public.can_upload_dataset_object(object_name text)
returns boolean
language sql
security definer
stable
set search_path = public, storage
as $$
  select exists (
    select 1
    from public.datasets d
    where cardinality(storage.foldername(object_name)) = 2
      and d.id = public.dataset_storage_dataset_id(object_name)
      and d.workspace_id = public.dataset_storage_workspace_id(object_name)
      and d.uploaded_by = auth.uid()
      and d.status in ('pending', 'processing')
      and public.can_write_workspace(d.workspace_id)
      and lower(coalesce(storage.extension(object_name), '')) = 'csv'
  );
$$;

create or replace function public.can_write_dataset_object(object_name text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.datasets d
    where d.id = public.dataset_storage_dataset_id(object_name)
      and d.workspace_id = public.dataset_storage_workspace_id(object_name)
      and d.storage_path = object_name
      and public.can_write_workspace(d.workspace_id)
  );
$$;

create or replace function public.prevent_dataset_identity_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.workspace_id <> old.workspace_id then
    raise exception 'dataset workspace cannot be changed';
  end if;

  if new.uploaded_by <> old.uploaded_by then
    raise exception 'dataset uploader cannot be changed';
  end if;

  return new;
end;
$$;

drop trigger if exists datasets_prevent_identity_change on public.datasets;
create trigger datasets_prevent_identity_change
before update on public.datasets
for each row
execute function public.prevent_dataset_identity_change();

create or replace function public.record_dataset_activity(
  target_dataset_id uuid,
  target_event_type text,
  event_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_workspace_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if target_event_type not in (
    'dataset.upload_started',
    'dataset.ready',
    'dataset.processing_failed'
  ) then
    raise exception 'Unsupported dataset activity type';
  end if;

  select d.workspace_id
  into target_workspace_id
  from public.datasets d
  where d.id = target_dataset_id;

  if target_workspace_id is null then
    raise exception 'Dataset not found';
  end if;

  if not public.can_write_workspace(target_workspace_id) then
    raise exception 'Not authorized to record dataset activity';
  end if;

  insert into public.activity_events (
    workspace_id,
    actor_id,
    event_type,
    entity_type,
    entity_id,
    metadata
  )
  values (
    target_workspace_id,
    auth.uid(),
    target_event_type,
    'dataset',
    target_dataset_id,
    coalesce(event_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.try_parse_uuid(text) from public;
revoke all on function public.dataset_storage_workspace_id(text) from public;
revoke all on function public.dataset_storage_dataset_id(text) from public;
revoke all on function public.can_read_dataset_object(text) from public;
revoke all on function public.can_upload_dataset_object(text) from public;
revoke all on function public.can_write_dataset_object(text) from public;
revoke all on function public.record_dataset_activity(uuid, text, jsonb) from public;

grant execute on function public.try_parse_uuid(text) to authenticated;
grant execute on function public.dataset_storage_workspace_id(text) to authenticated;
grant execute on function public.dataset_storage_dataset_id(text) to authenticated;
grant execute on function public.can_read_dataset_object(text) to authenticated;
grant execute on function public.can_upload_dataset_object(text) to authenticated;
grant execute on function public.can_write_dataset_object(text) to authenticated;
grant execute on function public.record_dataset_activity(uuid, text, jsonb) to authenticated;

alter table storage.objects enable row level security;

drop policy if exists "workspace members can read dataset files" on storage.objects;
create policy "workspace members can read dataset files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'datasets'
  and public.can_read_dataset_object(name)
);

drop policy if exists "workspace writers can upload dataset files" on storage.objects;
create policy "workspace writers can upload dataset files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'datasets'
  and public.can_upload_dataset_object(name)
);

drop policy if exists "workspace writers can update dataset files" on storage.objects;
create policy "workspace writers can update dataset files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'datasets'
  and public.can_write_dataset_object(name)
)
with check (
  bucket_id = 'datasets'
  and public.can_write_dataset_object(name)
);

drop policy if exists "workspace writers can delete dataset files" on storage.objects;
create policy "workspace writers can delete dataset files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'datasets'
  and public.can_write_dataset_object(name)
);
