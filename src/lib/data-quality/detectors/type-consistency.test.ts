import { describe, expect, it } from "vitest";

import { typeConsistencyDetector } from "@/lib/data-quality/detectors/type-consistency";
import { createDetectionContext } from "@/lib/data-quality/test-utils";

describe("typeConsistencyDetector", () => {
  it("does not flag clean integer columns", () => {
    expect(
      typeConsistencyDetector.detect(
        createDetectionContext(["amount"], [["1"], ["2"], ["3"]])
      )
    ).toHaveLength(0);
  });

  it("flags numbers mixed with arbitrary text", () => {
    const [issue] = typeConsistencyDetector.detect(
      createDetectionContext(["amount"], [["1"], ["2"], ["unknown"]])
    );

    expect(issue).toMatchObject({
      issueType: "mixed_types",
      severity: "high",
      metadata: {
        expected_type: "numeric",
        inconsistent_count: 1,
      },
    });
  });

  it("flags dates mixed with invalid text", () => {
    const [issue] = typeConsistencyDetector.detect(
      createDetectionContext([
        "signed_at",
      ], [["2026-09-03"], ["2026-09-04"], ["not-a-date"]])
    );

    expect(issue).toMatchObject({
      issueType: "mixed_types",
      metadata: {
        expected_type: "date",
        inconsistent_count: 1,
      },
    });
  });
});
