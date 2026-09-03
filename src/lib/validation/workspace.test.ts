import { describe, expect, it } from "vitest";

import {
  isWorkspaceRole,
  validateWorkspaceInput,
} from "@/lib/validation/workspace";

describe("workspace validation", () => {
  it("accepts valid workspace input and trims values", () => {
    const result = validateWorkspaceInput({
      name: " Finance Review ",
      description: " Monthly datasets ",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("Finance Review");
      expect(result.data.description).toBe("Monthly datasets");
    }
  });

  it("rejects names outside the schema bounds", () => {
    const result = validateWorkspaceInput({ name: "A" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/between 2 and 120/);
    }
  });

  it("accepts only supported workspace roles", () => {
    expect(isWorkspaceRole("owner")).toBe(true);
    expect(isWorkspaceRole("admin")).toBe(true);
    expect(isWorkspaceRole("member")).toBe(true);
    expect(isWorkspaceRole("viewer")).toBe(true);
    expect(isWorkspaceRole("reviewer")).toBe(false);
  });
});
