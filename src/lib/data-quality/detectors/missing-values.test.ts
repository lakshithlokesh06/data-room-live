import { describe, expect, it } from "vitest";

import { missingValuesDetector } from "@/lib/data-quality/detectors/missing-values";
import { createDetectionContext } from "@/lib/data-quality/test-utils";

describe("missingValuesDetector", () => {
  it("does not flag missing values below threshold", () => {
    const rows = Array.from({ length: 101 }, (_, index) => [
      index === 0 ? "" : String(index),
    ]);

    expect(
      missingValuesDetector.detect(createDetectionContext(["score"], rows))
    ).toHaveLength(0);
  });

  it("flags missing values at threshold", () => {
    const rows = Array.from({ length: 100 }, (_, index) => [
      index === 0 ? "NA" : String(index),
    ]);

    const [issue] = missingValuesDetector.detect(
      createDetectionContext(["score"], rows)
    );

    expect(issue).toMatchObject({
      issueType: "missing_values",
      severity: "low",
      metadata: {
        missing_count: 1,
        total_rows: 100,
        missing_percentage: 1,
      },
    });
  });

  it("escalates missing-value severity deterministically", () => {
    const rows = Array.from({ length: 100 }, (_, index) => [
      index < 80 ? "" : String(index),
    ]);

    const [issue] = missingValuesDetector.detect(
      createDetectionContext(["score"], rows)
    );

    expect(issue.severity).toBe("critical");
  });
});
