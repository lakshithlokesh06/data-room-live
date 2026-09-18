import { describe, expect, it } from "vitest";
import { activePeople } from "./presence";

describe("presence state", () => {
  it("counts a user once across multiple tabs", () => {
    expect(activePeople({ a: [{ userId: "one", name: "Asha" }], b: [{ userId: "one", name: "Asha" }, { userId: "two", name: "Bala" }] }))
      .toEqual([{ userId: "one", name: "Asha" }, { userId: "two", name: "Bala" }]);
  });

  it("ignores malformed entries and does not display email addresses", () => {
    expect(activePeople({ a: [null, { userId: "one", name: "a@example.com" }, { name: "No ID" }] }))
      .toEqual([{ userId: "one", name: "Workspace member" }]);
  });
});
