# Realtime collaboration

Phase 6 uses Supabase Postgres Changes and private Broadcast to invalidate server-rendered pages. `RealtimeRefresh` owns row-change channels, coalesces nearby events into one `router.refresh()`, refreshes after reconnect, and removes channels on unmount. Server queries and existing server actions remain the source of truth; no browser-side issue or comment copy is maintained. This also prevents duplicate comments when a local action and its corresponding database event arrive together.

## Scope

The `supabase_realtime` publication adds only `data_quality_issues` and `activity_events`; the migration removes `issue_comments` if it was previously published and rejects a publish-all configuration. Issue detail listens to its issue ID and history ID. Dataset detail listens to its dataset ID. Issue lists, dashboard metrics, dataset quality signals, and the activity feed listen to the RLS-visible workspace IDs rendered by the server. Issue subscriptions use `INSERT`/`UPDATE`; activity uses `INSERT`. An `issue_comments` trigger sends a private, workspace-scoped `comment_changed` broadcast containing only the issue ID on insert, edit, or delete. The issue page refreshes from the server on that signal. This avoids publishing comment rows or relying on Postgres Changes `DELETE` events, whose old row is not RLS checked.

## Presence

Dataset and issue review headers use a private `workspace:<uuid>` channel for Presence and, on issue pages, comment-change broadcasts. Policies on `realtime.messages` allow only current workspace members to receive Presence/Broadcast and to track Presence on that exact workspace topic. Clients cannot send broadcasts. The Presence payload contains only user ID and a display name, never email. Duplicate tabs count as one person. Presence state is rebuilt on sync, cleared on disconnect, and untracked/removed on unmount. Presence is ephemeral and is not an audit log.

## Security and setup

Existing table SELECT RLS remains unchanged: issues, comments, and activity are readable only by workspace members. Realtime adds no mutation grants; viewers remain read-only. Browser code uses only the existing publishable/anon key. Apply migration `202609180002_realtime_collaboration.sql` after Phase 5. In Supabase Dashboard, ensure Realtime is enabled and verify the two tables appear in the `supabase_realtime` publication. Keep **Allow public access** enabled because the Postgres Changes channels are public; row delivery is still checked against table RLS. Presence/Broadcast explicitly uses `private: true`, so its `realtime.messages` policies authorize the workspace topic. No hosted connection or multi-user delivery has been verified from this local checkout.

## Limitations

Postgres Changes are used for synchronization, so high-volume workspaces may eventually need a more selective broadcast design. A local client can claim another display name in a Presence payload; Presence should not be used as proof of identity or authorization. Refreshes only reflect activity rows that were actually persisted. Temporary disconnects leave the server-rendered app usable; reconnect triggers a fresh read.
