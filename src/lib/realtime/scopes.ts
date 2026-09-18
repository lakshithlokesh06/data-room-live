export type ChangeScope = {
  issueId?: string;
  datasetId?: string;
  workspaceIds?: string[];
  watchIssues?: boolean;
  watchActivity?: boolean;
};

export type ChangeSubscription = {
  topic: string;
  table: "data_quality_issues" | "activity_events";
  event: "INSERT" | "UPDATE";
  filter: string;
};

export function subscriptionsForScope(scope: ChangeScope): ChangeSubscription[] {
  if (scope.issueId) {
    const issueId = scope.issueId;
    return [
      { topic: `review:issue:${issueId}`, table: "data_quality_issues", event: "UPDATE", filter: `id=eq.${issueId}` },
      { topic: `review:issue:${issueId}`, table: "activity_events", event: "INSERT", filter: `entity_id=eq.${issueId}` },
    ];
  }
  if (scope.datasetId) {
    return ["INSERT", "UPDATE"].map((event) => ({
      topic: `review:dataset:${scope.datasetId}`, table: "data_quality_issues" as const,
      event: event as "INSERT" | "UPDATE", filter: `dataset_id=eq.${scope.datasetId}`,
    }));
  }
  return [...new Set(scope.workspaceIds ?? [])].flatMap((workspaceId) => {
    const topic = `review:workspace:${workspaceId}`;
    const changes: ChangeSubscription[] = [];
    if (scope.watchIssues) {
      changes.push(
        { topic, table: "data_quality_issues", event: "INSERT", filter: `workspace_id=eq.${workspaceId}` },
        { topic, table: "data_quality_issues", event: "UPDATE", filter: `workspace_id=eq.${workspaceId}` },
      );
    }
    if (scope.watchActivity) {
      changes.push({ topic, table: "activity_events", event: "INSERT", filter: `workspace_id=eq.${workspaceId}` });
    }
    return changes;
  });
}

export function createRefreshCoalescer(refresh: () => void, delayMs = 120) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    notify() {
      if (timer !== null) return;
      timer = setTimeout(() => {
        timer = null;
        refresh();
      }, delayMs);
    },
    dispose() {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    },
  };
}
