import { describe, expect, it } from "vitest";

import { whitespaceDetector } from "@/lib/data-quality/detectors/whitespace";
import { createDetectionContext } from "@/lib/data-quality/test-utils";

describe("whitespaceDetector", () => {
  it("flags leading and trailing whitespace", () => {
    const [issue] = whitespaceDetector.detect(
      createDetectionContext(["city"], [[" Bengaluru"], ["Bengaluru "]])
    );

    expect(issue).toMatchObject({
      issueType: "whitespace_anomaly",
      metadata: {
        affected_value_count: 2,
      },
    });
  });

  it("does not flag ordinary internal spaces", () => {
    expect(
      whitespaceDetector.detect(
        createDetectionContext(["city"], [["New York"], ["San Francisco"]])
      )
    ).toHaveLength(0);
  });
});
