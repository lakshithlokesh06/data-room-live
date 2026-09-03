import { describe, expect, it } from "vitest";

import { constantColumnsDetector } from "@/lib/data-quality/detectors/constant-columns";
import { createDetectionContext } from "@/lib/data-quality/test-utils";

describe("constantColumnsDetector", () => {
  it("flags constant non-null columns", () => {
    const [issue] = constantColumnsDetector.detect(
      createDetectionContext(["status"], [["Active"], ["Active"], ["Active"]])
    );

    expect(issue).toMatchObject({
      issueType: "constant_column",
      severity: "low",
      columnPosition: 0,
    });
  });

  it("does not treat all-missing columns as constant", () => {
    expect(
      constantColumnsDetector.detect(
        createDetectionContext(["status"], [[""], ["NA"], ["null"]])
      )
    ).toHaveLength(0);
  });
});
