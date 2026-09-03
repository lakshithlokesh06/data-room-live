import { describe, expect, it } from "vitest";

import { duplicateRowsDetector } from "@/lib/data-quality/detectors/duplicates";
import { createDetectionContext } from "@/lib/data-quality/test-utils";

describe("duplicateRowsDetector", () => {
  it("does not flag unique rows", () => {
    const rows = [
      ["1", "Ada"],
      ["2", "Grace"],
    ];

    expect(
      duplicateRowsDetector.detect(createDetectionContext(["id", "name"], rows))
    ).toHaveLength(0);
  });

  it("flags duplicate rows and reports ratio", () => {
    const rows = [
      ["1", "Ada"],
      ["1", "Ada"],
      ["2", "Grace"],
      ["2", "Grace"],
    ];

    const [issue] = duplicateRowsDetector.detect(
      createDetectionContext(["id", "name"], rows)
    );

    expect(issue).toMatchObject({
      issueType: "duplicate_rows",
      severity: "critical",
      metadata: {
        duplicate_row_count: 2,
        total_rows: 4,
        duplicate_ratio: 0.5,
      },
    });
  });
});
