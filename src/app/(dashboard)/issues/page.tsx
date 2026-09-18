import Link from "next/link";
import { formatIssueType, IssueStatusBadge, SeverityBadge } from "@/components/data-quality/issue-badges";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { listAccessibleIssues, listAccessibleIssueDatasets } from "@/lib/data-quality/queries";
import { listCurrentUserWorkspaces } from "@/lib/workspaces/queries";
import { issueSeverities, issueSources, issueStatuses } from "@/types";

type Params = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const selectClass = "h-9 min-w-32 rounded border bg-background px-2 text-sm";

export default async function IssuesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const [user, raw, workspaces, availableDatasets] = await Promise.all([requireUser(), searchParams, listCurrentUserWorkspaces(), listAccessibleIssueDatasets()]);
  const filters = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, first(value)])) as Record<string, string>;
  const parsedPage = Number(filters.page ?? 1);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, 1000) : 1;
  const { issues, hasMore } = await listAccessibleIssues(filters, user.id, page);
  const datasets = availableDatasets.map((dataset): [string, string] => [dataset.id, dataset.name]);
  const pageHref = (next: number) => `/issues?${new URLSearchParams({ ...filters, page: String(next) })}`;
  return <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
    <div><h1 className="text-3xl font-semibold">Issues</h1><p className="text-sm text-muted-foreground">Review findings across your workspaces.</p></div>
    <form className="flex flex-wrap items-end gap-2" method="get">
      <label className="grid gap-1 text-xs">Search<input className="h-9 rounded border bg-background px-2 text-sm" name="search" placeholder="Issue or dataset" defaultValue={filters.search ?? ""} /></label>
      <Filter name="workspace" label="Workspace" value={filters.workspace} options={workspaces.map((workspace) => [workspace.id, workspace.name])} />
      <Filter name="dataset" label="Dataset" value={filters.dataset} options={datasets} />
      <Filter name="severity" label="Severity" value={filters.severity} options={issueSeverities.map((s) => [s, s])} />
      <Filter name="status" label="Status" value={filters.status} options={issueStatuses.map((s) => [s, s.replaceAll("_", " ")])} />
      <Filter name="source" label="Source" value={filters.source} options={issueSources.map((s) => [s, s])} />
      <label className="flex h-9 items-center gap-2 text-sm"><input name="assignedTo" type="checkbox" value="me" defaultChecked={filters.assignedTo === "me"} />Assigned to me</label>
      <Button type="submit" size="sm">Apply</Button><Button asChild type="button" size="sm" variant="ghost"><Link href="/issues">Clear</Link></Button>
    </form>
    <p className="text-sm text-muted-foreground">{issues.length} issue{issues.length === 1 ? "" : "s"} shown</p>
    <div className="overflow-x-auto border-t"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="border-b text-xs uppercase text-muted-foreground"><tr>
      {["Issue", "Dataset", "Workspace", "Column", "Type", "Severity", "Status", "Source", "Assignee", "Created"].map((label) => <th key={label} className="p-3 font-medium">{label}</th>)}
    </tr></thead><tbody className="divide-y">{issues.map((issue) => <tr key={issue.id}>
      <td className="p-3 font-medium"><Link className="hover:underline" href={`/issues/${issue.id}`}>{issue.title}</Link></td>
      <td className="p-3">{issue.datasetName}</td><td className="p-3">{issue.workspaceName}</td>
      <td className="p-3">{issue.columnName ?? "Dataset"}</td><td className="p-3">{formatIssueType(issue.issueType)}</td>
      <td className="p-3"><SeverityBadge severity={issue.severity} /></td><td className="p-3"><IssueStatusBadge status={issue.status} /></td>
      <td className="p-3">{issue.source}</td><td className="p-3">{issue.assigneeName ?? "Unassigned"}</td>
      <td className="p-3">{new Date(issue.createdAt).toLocaleDateString()}</td>
    </tr>)}</tbody></table>
      {issues.length === 0 && <p className="p-6 text-sm text-muted-foreground">No issues match these filters.</p>}
    </div>
    <nav className="flex gap-3 text-sm">{page > 1 && <Link className="hover:underline" href={pageHref(page - 1)}>Previous</Link>}
      {hasMore && <Link className="hover:underline" href={pageHref(page + 1)}>Next</Link>}</nav>
  </main>;
}

function Filter({ name, label, value, options }: { name: string; label: string; value?: string; options: [string, string][] }) {
  return <label className="grid gap-1 text-xs">{label}<select className={selectClass} name={name} defaultValue={value ?? ""}>
    <option value="">All</option>{options.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
  </select></label>;
}
