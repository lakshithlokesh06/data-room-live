import { describe, expect, it } from "vitest";

import { numericOutliersDetector } from "@/lib/data-quality/detectors/outliers";
import { createDetectionContext } from "@/lib/data-quality/test-utils";

describe("numericOutliersDetector", () => {
  it("does not flag a normal compact numeric distribution", () => {
    expect(
      numericOutliersDetector.detect(
        createDetectionContext(
          ["amount"],
          [["10"], ["11"], ["11"], ["12"], ["12"], ["13"], ["13"], ["14"]]
        )
      )
    ).toHaveLength(0);
  });

  it("flags a clear IQR outlier", () => {
    const [issue] = numericOutliersDetector.detect(
      createDetectionContext(
        ["amount"],
        [["10"], ["11"], ["11"], ["12"], ["12"], ["13"], ["13"], ["100"]]
      )
    );

    expect(issue).toMatchObject({
      issueType: "numeric_outliers",
      severity: "high",
      metadata: {
        method: "IQR",
        outlier_count: 1,
      },
    });
  });

  it("does not flag small numeric samples", () => {
    expect(
      numericOutliersDetector.detect(
        createDetectionContext(["amount"], [["1"], ["2"], ["100"]])
      )
    ).toHaveLength(0);
  });
});
