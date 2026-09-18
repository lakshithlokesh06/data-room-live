alter table public.data_quality_issues
  add column resolved_by uuid references auth.users(id) on delete set null,
  add column resolution_note text constraint data_quality_issues_resolution_note_length_check
    check (resolution_note is null or char_length(resolution_note) <= 1000);

alter table public.data_quality_issues
  add constraint data_quality_issues_resolution_note_check check (
    status in ('resolved', 'dismissed') or resolution_note is null
  ) not valid;

alter table public.data_quality_issues
  drop constraint data_quality_issues_issue_type_values_check;
alter table public.data_quality_issues
  add constraint data_quality_issues_issue_type_values_check check (issue_type in (
    'missing_values', 'duplicate_rows', 'constant_column', 'high_cardinality',
    'mixed_types', 'numeric_outliers', 'inconsistent_categories', 'invalid_dates',
    'whitespace_anomaly', 'unnamed_column', 'manual_review', 'data_accuracy',
    'formatting', 'schema', 'other'
  ));

alter table public.issue_comments
  add constraint issue_comments_length_check check (char_length(content) <= 5000) not valid;

create index data_quality_issues_workspace_created_idx
  on public.data_quality_issues(workspace_id, created_at desc);
create index activity_events_issue_history_idx
  on public.activity_events(entity_type, entity_id, created_at desc);

drop policy if exists "workspace writers can create manual issues" on public.data_quality_issues;
drop policy if exists "workspace writers can update manual issues" on public.data_quality_issues;
drop policy if exists "workspace managers can delete issues" on public.data_quality_issues;
drop policy if exists "workspace writers can create issue comments" on public.issue_comments;
drop policy if exists "comment authors can update their comments" on public.issue_comments;
drop policy if exists "comment authors and managers can delete comments" on public.issue_comments;

revoke insert, update, delete on public.data_quality_issues, public.issue_comments from authenticated;

comment on table public.data_quality_issues is
  'Authenticated clients have read-only RLS access. Validated issue workflow writes use server-only service-role code.';
comment on table public.issue_comments is
  'Authenticated clients have read-only RLS access. Validated comment writes use server-only service-role code.';

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
    'dataset.upload_started', 'dataset.ready', 'dataset.processing_failed'
  ) then
    raise exception 'Unsupported dataset activity type';
  end if;
  select d.workspace_id into target_workspace_id
  from public.datasets d where d.id = target_dataset_id;
  if target_workspace_id is null or not public.can_write_workspace(target_workspace_id) then
    raise exception 'Not authorized to record dataset activity';
  end if;
  insert into public.activity_events (
    workspace_id, actor_id, event_type, entity_type, entity_id, metadata
  ) values (
    target_workspace_id, auth.uid(), target_event_type, 'dataset',
    target_dataset_id, coalesce(event_metadata, '{}'::jsonb)
  );
end;
$$;

revoke execute on function public.record_dataset_activity(uuid, text, jsonb) from public, authenticated;
