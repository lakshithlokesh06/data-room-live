import { describe, expect, it } from "vitest";

import {
  getSafeRedirectPath,
  validateLoginInput,
  validateSignupInput,
} from "@/lib/validation/auth";

describe("auth validation", () => {
  it("accepts a valid login and normalizes email", () => {
    const result = validateLoginInput({
      email: "PERSON@Example.COM ",
      password: "password123",
      next: "/workspaces",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.email).toBe("person@example.com");
      expect(result.data.next).toBe("/workspaces");
    }
  });

  it("rejects short passwords during login", () => {
    const result = validateLoginInput({
      email: "person@example.com",
      password: "short",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/at least 8/);
    }
  });

  it("rejects mismatched signup passwords", () => {
    const result = validateSignupInput({
      fullName: "Lakshith Lokesh",
      email: "lakshith@example.com",
      password: "password123",
      confirmPassword: "password124",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("Passwords do not match.");
    }
  });

  it("prevents open redirects", () => {
    expect(getSafeRedirectPath("https://example.com", "/dashboard")).toBe(
      "/dashboard"
    );
    expect(getSafeRedirectPath("//example.com", "/dashboard")).toBe(
      "/dashboard"
    );
    expect(getSafeRedirectPath("/login", "/dashboard")).toBe("/dashboard");
    expect(getSafeRedirectPath("/datasets", "/dashboard")).toBe("/datasets");
  });
});
