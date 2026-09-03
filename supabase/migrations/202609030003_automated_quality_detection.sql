alter table public.data_quality_issues
  add column if not exists source text not null default 'manual',
  add column if not exists detection_metadata jsonb,
  add column if not exists automated_issue_key text;

alter table public.data_quality_issues
  drop constraint if exists data_quality_issues_source_check,
  add constraint data_quality_issues_source_check
    check (source in ('manual', 'automated'));

alter table public.data_quality_issues
  drop constraint if exists data_quality_issues_automated_source_check,
  add constraint data_quality_issues_automated_source_check
    check (
      (source = 'manual' and automated_issue_key is null)
      or (source = 'automated' and automated_issue_key is not null)
    );

alter table public.data_quality_issues
  drop constraint if exists data_quality_issues_issue_type_values_check,
  add constraint data_quality_issues_issue_type_values_check
    check (
      issue_type in (
        'missing_values',
        'duplicate_rows',
        'constant_column',
        'high_cardinality',
        'mixed_types',
        'numeric_outliers',
        'inconsistent_categories',
        'invalid_dates',
        'whitespace_anomaly',
        'unnamed_column'
      )
    );

create index if not exists data_quality_issues_dataset_status_idx
on public.data_quality_issues(dataset_id, status);

create index if not exists data_quality_issues_dataset_source_idx
on public.data_quality_issues(dataset_id, source);

create unique index if not exists data_quality_issues_automated_issue_key_idx
on public.data_quality_issues(dataset_id, automated_issue_key)
where automated_issue_key is not null;

drop policy if exists "workspace writers can create issues" on public.data_quality_issues;
create policy "workspace writers can create manual issues"
on public.data_quality_issues for insert
to authenticated
with check (
  public.can_write_workspace(workspace_id)
  and created_by = auth.uid()
  and public.can_access_dataset(dataset_id)
  and source = 'manual'
  and automated_issue_key is null
);

drop policy if exists "workspace writers can update issues" on public.data_quality_issues;
create policy "workspace writers can update manual issues"
on public.data_quality_issues for update
to authenticated
using (
  public.can_write_workspace(workspace_id)
  and source = 'manual'
)
with check (
  public.can_write_workspace(workspace_id)
  and source = 'manual'
  and automated_issue_key is null
);

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
    'dataset.processing_failed',
    'dataset.quality_analysis_completed',
    'dataset.quality_issues_detected'
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

revoke execute on function public.record_dataset_activity(uuid, text, jsonb) from public;
grant execute on function public.record_dataset_activity(uuid, text, jsonb) to authenticated;
