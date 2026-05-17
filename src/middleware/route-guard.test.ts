import { describe, expect, it } from "vitest";
import { requiredPermissionForPath } from "@/middleware/route-guard";

describe("route guard mapping", () => {
  it("maps known protected paths", () => {
    expect(requiredPermissionForPath("/risk")).toBe("risk.read");
    expect(requiredPermissionForPath("/findings/123")).toBe("findings.read");
  });

  it("returns null for non-protected path", () => {
    expect(requiredPermissionForPath("/login")).toBeNull();
  });
});
