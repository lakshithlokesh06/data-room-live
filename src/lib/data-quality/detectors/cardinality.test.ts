import { describe, expect, it } from "vitest";

import { highCardinalityDetector } from "@/lib/data-quality/detectors/cardinality";
import { createDetectionContext } from "@/lib/data-quality/test-utils";

describe("highCardinalityDetector", () => {
  it("does not flag ordinary categorical columns", () => {
    const rows = Array.from({ length: 30 }, (_, index) => [
      index % 2 === 0 ? "Active" : "Inactive",
    ]);

    expect(
      highCardinalityDetector.detect(createDetectionContext(["status"], rows))
    ).toHaveLength(0);
  });

  it("flags high-cardinality text columns", () => {
    const rows = Array.from({ length: 30 }, (_, index) => [`Vendor ${index}`]);

    const [issue] = highCardinalityDetector.detect(
      createDetectionContext(["vendor_name"], rows)
    );

    expect(issue).toMatchObject({
      issueType: "high_cardinality",
      severity: "medium",
    });
  });

  it("suppresses identifier-like columns", () => {
    const rows = Array.from({ length: 30 }, (_, index) => [`CUST-${index}`]);

    expect(
      highCardinalityDetector.detect(createDetectionContext(["customer_id"], rows))
    ).toHaveLength(0);
  });
});
