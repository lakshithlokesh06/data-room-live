import { describe, expect, it } from "vitest";

import { dateConsistencyDetector } from "@/lib/data-quality/detectors/date-consistency";
import { createDetectionContext } from "@/lib/data-quality/test-utils";

describe("dateConsistencyDetector", () => {
  it("does not flag valid date-like values", () => {
    expect(
      dateConsistencyDetector.detect(
        createDetectionContext([
          "signed_at",
        ], [["2026-09-03"], ["2026-09-04"], ["2026-09-05"]])
      )
    ).toHaveLength(0);
  });

  it("flags malformed minority values in date-like columns", () => {
    const [issue] = dateConsistencyDetector.detect(
      createDetectionContext([
        "signed_at",
      ], [["2026-09-03"], ["2026-09-04"], ["not-a-date"]])
    );

    expect(issue).toMatchObject({
      issueType: "invalid_dates",
      severity: "medium",
      metadata: {
        invalid_date_count: 1,
      },
    });
  });
});
