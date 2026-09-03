import { describe, expect, it } from "vitest";

import { columnNamesDetector } from "@/lib/data-quality/detectors/column-names";
import { createDetectionContext } from "@/lib/data-quality/test-utils";

describe("columnNamesDetector", () => {
  it("flags blank source headers", () => {
    const [issue] = columnNamesDetector.detect(
      createDetectionContext(["Unnamed column 1"], [["Ada"]], [" "])
    );

    expect(issue).toMatchObject({
      issueType: "unnamed_column",
      columnPosition: 0,
    });
  });
});
