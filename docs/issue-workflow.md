# Issue review workflow

Issues belong to a dataset and workspace. Manual issues use the controlled types `manual_review`, `data_accuracy`, `formatting`, `schema`, and `other`; automated issues retain the Phase 4 detector types and provenance. Manual issues start open and unassigned.

## Lifecycle

| Current | Allowed next states |
| --- | --- |
| Open | In progress, resolved, dismissed |
| In progress | Open, resolved, dismissed |
| Resolved | Open |
| Dismissed | Open |

Closing an issue records `resolved_at`, `resolved_by`, and an optional note up to 1,000 characters. Reopening clears all three. Mutations read current state and conditionally update the previous `updated_at` value, so a stale form cannot overwrite a concurrent change.

## Permissions

| Action | Owner | Admin | Member | Viewer |
| --- | --- | --- | --- | --- |
| Read issues, comments, activity | Yes | Yes | Yes | Yes |
| Create manual issue, assign, change status | Yes | Yes | Yes | No |
| Change severity | Yes | Yes | No | No |
| Add comments | Yes | Yes | Yes | No |
| Edit or delete own comment | Yes | Yes | Yes | No |

Assignees must be current members of the same workspace. Comment editing and hard deletion are author-only. Deleted content is never copied into activity history. Comments are plain text, trimmed, and limited to 5,000 characters.

## Security and history

Authenticated clients retain RLS read access but have no direct insert, update, or delete grants on issues and comments. Server actions derive actor and role from the authenticated session, validate the dataset, column, and assignee, then use the server-only service-role client for narrow writes. They never accept provenance, creator, workspace, or resolution actor from form data. The old dataset activity RPC is no longer executable by clients. Activity events are inserted only from server code and contain structured IDs or state changes, never comment bodies or CSV rows.

The automated detector retains existing issues by deterministic key during reruns. Review status, assignee, severity edits, comments, and history remain attached. Findings no longer emitted by a rerun remain for human review; automatic closure is deliberately outside this phase.

Limitations: the issue index and activity feed page 50 results at a time. Issue title and dataset-name search is literal and limited to simple text characters. Event insertion follows the data mutation, so an activity write failure may leave a successful mutation without an event. Realtime updates and full comment version history are not included.
