import Link from "next/link";
import { listActivityEvents } from "@/lib/data-quality/queries";
import { describeActivity } from "@/lib/issues/activity";
import { listCurrentUserWorkspaces } from "@/lib/workspaces/queries";
import { RealtimeRefresh } from "@/components/realtime/realtime-refresh";

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const raw = Number((await searchParams).page ?? 1);
  const page = Number.isSafeInteger(raw) && raw > 0 ? Math.min(raw, 100) : 1;
  const events = await listActivityEvents(undefined, 51, (page - 1) * 50);
  const workspaces = await listCurrentUserWorkspaces();
  const more = events.length > 50;
  return <main className="mx-auto grid w-full max-w-4xl gap-6 px-4 py-8 sm:px-6">
    <RealtimeRefresh scope={{ workspaceIds: workspaces.map((workspace) => workspace.id), watchActivity: true }} showStatus />
    <div><h1 className="text-3xl font-semibold">Activity</h1><p className="text-sm text-muted-foreground">Recent events in your workspaces.</p></div>
    {events.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
    <ol className="divide-y border-t">{events.slice(0, 50).map((event) => <li key={event.id} className="grid gap-1 py-3 text-sm">
      <p><strong>{event.actorName}</strong> {describeActivity(event)}</p>
      <time className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()}</time>
    </li>)}</ol>
    <nav className="flex gap-3 text-sm">{page > 1 && <Link className="hover:underline" href={`/activity?page=${page - 1}`}>Previous</Link>}
      {more && <Link className="hover:underline" href={`/activity?page=${page + 1}`}>Next</Link>}</nav>
  </main>;
}
