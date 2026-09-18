do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'create publication supabase_realtime';
  end if;
  if (select puballtables from pg_publication where pubname = 'supabase_realtime') then
    raise exception 'supabase_realtime must not publish all tables';
  end if;
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'issue_comments') then
    alter publication supabase_realtime drop table public.issue_comments;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'data_quality_issues') then
    alter publication supabase_realtime add table public.data_quality_issues;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'activity_events') then
    alter publication supabase_realtime add table public.activity_events;
  end if;
end;
$$;

create policy "workspace members can receive private collaboration"
on realtime.messages for select to authenticated
using (
  realtime.messages.extension in ('presence', 'broadcast')
  and realtime.topic() ~ '^workspace:[0-9a-f-]{36}$'
  and public.is_workspace_member(public.try_parse_uuid(split_part(realtime.topic(), ':', 2)))
);

create function public.broadcast_issue_comment_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_issue_id uuid;
  target_workspace_id uuid;
begin
  if tg_op = 'DELETE' then
    target_issue_id := old.issue_id;
  else
    target_issue_id := new.issue_id;
  end if;
  select workspace_id into target_workspace_id
  from public.data_quality_issues where id = target_issue_id;
  if target_workspace_id is not null then
    begin
      perform realtime.send(
        jsonb_build_object('issue_id', target_issue_id),
        'comment_changed',
        'workspace:' || target_workspace_id::text,
        true
      );
    exception when others then
      null; -- Comment writes must not depend on Realtime availability.
    end;
  end if;
  return null;
end;
$$;

create trigger issue_comments_broadcast_change
after insert or update or delete on public.issue_comments
for each row execute function public.broadcast_issue_comment_change();

revoke execute on function public.broadcast_issue_comment_change() from public, anon, authenticated;

create policy "workspace members can track private presence"
on realtime.messages for insert to authenticated
with check (
  realtime.messages.extension = 'presence'
  and realtime.topic() ~ '^workspace:[0-9a-f-]{36}$'
  and public.is_workspace_member(public.try_parse_uuid(split_part(realtime.topic(), ':', 2)))
);
