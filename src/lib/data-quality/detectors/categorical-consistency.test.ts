import { describe, expect, it } from "vitest";

import { categoricalConsistencyDetector } from "@/lib/data-quality/detectors/categorical-consistency";
import { createDetectionContext } from "@/lib/data-quality/test-utils";

describe("categoricalConsistencyDetector", () => {
  it("flags case normalization collisions", () => {
    const [issue] = categoricalConsistencyDetector.detect(
      createDetectionContext(["status"], [["Active"], ["active"], ["ACTIVE"]])
    );

    expect(issue).toMatchObject({
      issueType: "inconsistent_categories",
      metadata: {
        normalized_collision_count: 1,
        affected_value_count: 3,
      },
    });
  });

  it("flags whitespace normalization collisions", () => {
    const [issue] = categoricalConsistencyDetector.detect(
      createDetectionContext(["status"], [["Active"], [" Active"], ["Active "]])
    );

    expect(issue.issueType).toBe("inconsistent_categories");
  });

  it("does not flag genuinely different categories", () => {
    expect(
      categoricalConsistencyDetector.detect(
        createDetectionContext(["status"], [["Active"], ["Inactive"], ["Paused"]])
      )
    ).toHaveLength(0);
  });
});
