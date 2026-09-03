import { describe, expect, it } from "vitest";

import {
  inferColumnType,
  isMissingValue,
  profileCsv,
} from "@/lib/datasets/profiler";

describe("isMissingValue", () => {
  it("treats configured tokens as missing values", () => {
    for (const value of ["", " ", "null", "NULL", "NaN", "N/A", "NA"]) {
      expect(isMissingValue(value)).toBe(true);
    }
  });

  it("does not treat ordinary strings as missing", () => {
    expect(isMissingValue("None")).toBe(false);
  });
});

describe("inferColumnType", () => {
  it("infers every supported column type", () => {
    expect(inferColumnType(["1", "2", "-3"])).toBe("integer");
    expect(inferColumnType(["1.2", "0.4", "-3.5"])).toBe("float");
    expect(inferColumnType(["true", "FALSE"])).toBe("boolean");
    expect(inferColumnType(["2026-09-03", "2026-09-04"])).toBe("date");
    expect(inferColumnType(["2026-09-03T09:15:00Z"])).toBe("datetime");
    expect(inferColumnType(["Ada", "Grace"])).toBe("string");
  });

  it("keeps leading-zero integers as strings", () => {
    expect(inferColumnType(["00123", "00456"])).toBe("string");
  });
});

describe("profileCsv", () => {
  it("profiles row counts, column counts, missing counts, and unique counts", () => {
    const profile = profileCsv(
      ["id", "name", "score"],
      [
        ["1", "Ada", "10"],
        ["2", "Ada", "NA"],
        ["3", "Grace", "12"],
      ]
    );

    expect(profile).toMatchObject({
      rowCount: 3,
      columnCount: 3,
      columns: [
        {
          name: "id",
          detectedType: "integer",
          nullable: false,
          missingCount: 0,
          uniqueCount: 3,
        },
        {
          name: "name",
          detectedType: "string",
          nullable: false,
          missingCount: 0,
          uniqueCount: 2,
        },
        {
          name: "score",
          detectedType: "integer",
          nullable: true,
          missingCount: 1,
          uniqueCount: 2,
        },
      ],
    });
  });
});
