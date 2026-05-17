import { describe, expect, it } from "vitest";
import { hasPermission, hasRole, hasScopeAccess } from "@/lib/auth/permissions";

describe("auth permissions", () => {
  it("checks role membership", () => {
    expect(hasRole(["AUDITOR", "INVESTIGATOR"], "AUDITOR")).toBe(true);
    expect(hasRole(["AUDITOR"], "OWNER")).toBe(false);
  });

  it("checks permission membership", () => {
    expect(hasPermission(["dashboard.read", "findings.read"], "dashboard.read")).toBe(true);
    expect(hasPermission(["dashboard.read"], "users.manage")).toBe(false);
  });

  it("checks branch/division scope", () => {
    expect(
      hasScopeAccess(
        { branchId: "b-1", divisionId: "d-1" },
        { branchId: "b-1", divisionId: "d-1" },
      ),
    ).toBe(true);
    expect(
      hasScopeAccess(
        { branchId: "b-1", divisionId: "d-1" },
        { branchId: "b-2" },
      ),
    ).toBe(false);
  });
});
