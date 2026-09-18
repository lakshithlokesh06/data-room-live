import Link from "next/link";
import { notFound } from "next/navigation";
import { formatIssueType, IssueStatusBadge, SeverityBadge } from "@/components/data-quality/issue-badges";
import { CommentControls, IssueWorkflow } from "@/components/data-quality/issue-workflow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { getIssueDetail, getCurrentWorkspaceRole, listWorkspaceMembers, listIssueComments, listActivityEvents } from "@/lib/data-quality/queries";
import { describeActivity } from "@/lib/issues/activity";
import { canModifyComment, canWriteIssues } from "@/lib/issues/workflow";
import { RealtimeRefresh } from "@/components/realtime/realtime-refresh";
import { WorkspacePresence } from "@/components/realtime/workspace-presence";

const date = (value: string) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default async function IssueDetailPage({ params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await params;
  const [issue, user] = await Promise.all([getIssueDetail(issueId), requireUser()]);
  if (!issue) notFound();
  const [role, members, comments, events] = await Promise.all([
    getCurrentWorkspaceRole(issue.workspaceId, user.id), listWorkspaceMembers(issue.workspaceId),
    listIssueComments(issue.id), listActivityEvents(issue.id),
  ]);
  return <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
    <RealtimeRefresh scope={{ issueId: issue.id }} showStatus />
    <Link href="/issues" className="text-sm text-muted-foreground hover:underline">Back to issues</Link>
    <header className="grid gap-2"><div className="flex flex-wrap items-center gap-2">
      <h1 className="text-3xl font-semibold">{issue.title}</h1><SeverityBadge severity={issue.severity} /><IssueStatusBadge status={issue.status} />
    </div><p className="whitespace-pre-wrap text-muted-foreground">{issue.description || "No description provided."}</p>
    <WorkspacePresence workspaceId={issue.workspaceId} userId={user.id} displayName={user.fullName?.trim() || "Workspace member"} issueId={issue.id} />
    </header>
    <section className="grid gap-4 border-y py-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <Info label="Dataset"><Link className="hover:underline" href={`/datasets/${issue.datasetId}`}>{issue.datasetName}</Link></Info>
      <Info label="Workspace">{issue.workspaceName}</Info><Info label="Column">{issue.columnName ?? "Dataset-level"}</Info>
      <Info label="Issue type">{formatIssueType(issue.issueType)}</Info><Info label="Source">{issue.source}</Info>
      <Info label="Created by">{issue.creatorName}</Info><Info label="Created">{date(issue.createdAt)}</Info>
      <Info label="Assignee">{issue.assigneeName ?? "Unassigned"}</Info>
    </section>
    {(issue.status === "resolved" || issue.status === "dismissed") && <section className="grid gap-1 border-b pb-4 text-sm">
      <h2 className="font-semibold">Resolution</h2><p>{issue.resolverName ?? "Former member"} on {issue.resolvedAt ? date(issue.resolvedAt) : "an unknown date"}</p>
      {issue.resolutionNote && <p className="whitespace-pre-wrap text-muted-foreground">{issue.resolutionNote}</p>}
    </section>}
    {issue.source === "automated" && issue.detectionMetadata && <section className="grid gap-2"><h2 className="text-lg font-semibold">Detection details</h2>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">{Object.entries(issue.detectionMetadata).filter(([, value]) => ["string", "number", "boolean"].includes(typeof value)).map(([key, value]) =>
        <div key={key} className="flex justify-between gap-3 border-b py-2"><dt className="text-muted-foreground">{key.replaceAll("_", " ")}</dt><dd>{String(value)}</dd></div>)}</dl>
    </section>}
    <Card><CardHeader><CardTitle>Review workflow</CardTitle></CardHeader><CardContent>
      <IssueWorkflow issueId={issue.id} status={issue.status} severity={issue.severity} assignedTo={issue.assignedTo} role={role} members={members} />
    </CardContent></Card>
    <section className="grid gap-4"><h2 className="text-lg font-semibold">Comments ({comments.length})</h2>
      {comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
      {comments.map((comment) => <div key={comment.id} className="grid gap-2 border-b pb-4 text-sm">
        <div className="flex flex-wrap items-center gap-2"><strong>{comment.authorName}</strong><time className="text-muted-foreground">{date(comment.createdAt)}</time>
          {new Date(comment.updatedAt).getTime() - new Date(comment.createdAt).getTime() > 1000 && <span className="text-xs text-muted-foreground">Edited</span>}</div>
        <p className="whitespace-pre-wrap break-words">{comment.content}</p>
        <CommentControls issueId={issue.id} commentId={comment.id} content={comment.content} editable={canModifyComment(role, comment.authorId, user.id)} />
      </div>)}
      <CommentControls issueId={issue.id} editable={canWriteIssues(role)} />
    </section>
    <section className="grid gap-3"><h2 className="text-lg font-semibold">History</h2>
      {events.length === 0 && <p className="text-sm text-muted-foreground">No activity recorded yet.</p>}
      <ol className="grid gap-2">{events.map((event) => <li className="border-l-2 pl-3 text-sm" key={event.id}>
        <span className="font-medium">{event.actorName}</span> {describeActivity(event)} <time className="text-muted-foreground">{date(event.created_at)}</time>
      </li>)}</ol>
    </section>
  </main>;
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1"><span className="text-xs uppercase text-muted-foreground">{label}</span><span className="font-medium">{children}</span></div>;
}
