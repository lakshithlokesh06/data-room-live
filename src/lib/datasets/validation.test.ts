import { describe, expect, it } from "vitest";

import { MAX_CSV_UPLOAD_BYTES } from "@/lib/datasets/constants";
import { validateCsvFile } from "@/lib/datasets/validation";

describe("validateCsvFile", () => {
  it("accepts a non-empty CSV file", () => {
    const file = new File(["id,name\n1,Ada"], "users.csv", {
      type: "text/csv",
    });

    expect(validateCsvFile(file).ok).toBe(true);
  });

  it("rejects a non-CSV extension", () => {
    const file = new File(["id,name\n1,Ada"], "users.txt", {
      type: "text/csv",
    });

    expect(validateCsvFile(file)).toMatchObject({
      ok: false,
      message: "Only .csv files can be uploaded.",
    });
  });

  it("rejects an oversized CSV", () => {
    const file = new File(
      [new Uint8Array(MAX_CSV_UPLOAD_BYTES + 1)],
      "large.csv",
      { type: "text/csv" }
    );

    expect(validateCsvFile(file)).toMatchObject({
      ok: false,
    });
  });

  it("rejects an empty CSV", () => {
    const file = new File([""], "empty.csv", { type: "text/csv" });

    expect(validateCsvFile(file)).toMatchObject({
      ok: false,
      message: "Choose a non-empty CSV file.",
    });
  });
});
