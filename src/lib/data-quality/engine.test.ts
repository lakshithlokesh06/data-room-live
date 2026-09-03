import { describe, expect, it } from "vitest";

import { runDataQualityDetection } from "@/lib/data-quality/engine";
import { missingValuesDetector } from "@/lib/data-quality/detectors/missing-values";
import { duplicateRowsDetector } from "@/lib/data-quality/detectors/duplicates";
import { createDetectionContext } from "@/lib/data-quality/test-utils";
import type { DataQualityDetector } from "@/lib/data-quality/types";

describe("runDataQualityDetection", () => {
  it("collects structured issues from multiple detectors", () => {
    const result = runDataQualityDetection(
      createDetectionContext(
        ["id", "score"],
        [
          ["1", ""],
          ["1", ""],
          ["2", "10"],
        ]
      ),
      [missingValuesDetector, duplicateRowsDetector]
    );

    expect(result.failures).toHaveLength(0);
    expect(result.issues.map((issue) => issue.issueType)).toEqual([
      "missing_values",
      "duplicate_rows",
    ]);
  });

  it("isolates a detector failure and continues", () => {
    const failingDetector: DataQualityDetector = {
      id: "boom",
      detect() {
        throw new Error("Unexpected detector failure");
      },
    };

    const result = runDataQualityDetection(
      createDetectionContext(["score"], [[""], ["1"]]),
      [failingDetector, missingValuesDetector]
    );

    expect(result.failures).toEqual([
      {
        detectorId: "boom",
        message: "Unexpected detector failure",
      },
    ]);
    expect(result.issues).toHaveLength(1);
  });
});
