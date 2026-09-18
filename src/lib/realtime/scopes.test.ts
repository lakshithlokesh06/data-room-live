import { afterEach, describe, expect, it, vi } from "vitest";
import { createRefreshCoalescer, subscriptionsForScope } from "./scopes";

afterEach(() => vi.useRealTimers());

describe("Realtime scopes", () => {
  it("limits issue detail to its issue and history", () => {
    const subscriptions = subscriptionsForScope({ issueId: "issue-1" });
    expect(subscriptions).toHaveLength(2);
    expect(subscriptions.every((item) => item.filter.endsWith("eq.issue-1"))).toBe(true);
    expect(subscriptions.map((item) => item.event)).not.toContain("DELETE");
  });

  it("deduplicates workspace channels and applies workspace filters", () => {
    const subscriptions = subscriptionsForScope({ workspaceIds: ["one", "one", "two"], watchIssues: true, watchActivity: true });
    expect(subscriptions).toHaveLength(6);
    expect(new Set(subscriptions.map((item) => item.topic))).toEqual(new Set(["review:workspace:one", "review:workspace:two"]));
    expect(subscriptions.filter((item) => item.table === "activity_events")).toHaveLength(2);
  });

  it("limits dataset refresh to its issue rows", () => {
    expect(subscriptionsForScope({ datasetId: "dataset-1" })).toEqual([
      { topic: "review:dataset:dataset-1", table: "data_quality_issues", event: "INSERT", filter: "dataset_id=eq.dataset-1" },
      { topic: "review:dataset:dataset-1", table: "data_quality_issues", event: "UPDATE", filter: "dataset_id=eq.dataset-1" },
    ]);
  });

  it("coalesces bursts and cancels a pending refresh on cleanup", () => {
    vi.useFakeTimers();
    const refresh = vi.fn();
    const coalescer = createRefreshCoalescer(refresh);
    coalescer.notify(); coalescer.notify(); coalescer.notify();
    vi.advanceTimersByTime(120);
    expect(refresh).toHaveBeenCalledTimes(1);
    coalescer.notify(); coalescer.dispose();
    vi.runAllTimers();
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
