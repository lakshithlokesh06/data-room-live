import { describe, expect, it } from "vitest";

import { parseCsvBuffer } from "@/lib/datasets/csv-parser";

describe("parseCsvBuffer", () => {
  it("parses quoted commas, escaped quotes, and CRLF newlines", () => {
    const csv =
      'id,note\r\n1,"hello, world"\r\n2,"Ada said ""ship it"""';

    expect(parseCsvBuffer(Buffer.from(csv))).toEqual({
      rawHeaders: ["id", "note"],
      headers: ["id", "note"],
      rows: [
        ["1", "hello, world"],
        ["2", 'Ada said "ship it"'],
      ],
    });
  });

  it("rejects malformed CSV input", () => {
    expect(() => parseCsvBuffer(Buffer.from('id,name\n1,"Ada'))).toThrow();
  });

  it("keeps raw blank headers and stores safe generated names", () => {
    expect(parseCsvBuffer(Buffer.from("id, \n1,Ada"))).toMatchObject({
      rawHeaders: ["id", " "],
      headers: ["id", "Unnamed column 2"],
    });
  });
});
