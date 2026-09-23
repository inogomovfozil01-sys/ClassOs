import { describe, it, expect } from "vitest";
import { belongsInClassTable } from "../lib/table-members";
describe("Automatic table roster", () => {
  it("includes students, leaders, admins and owner", () => {
    for (const role of ["STUDENT", "LEADER", "ADMIN", "OWNER"])
      expect(belongsInClassTable(role)).toBe(true);
  });
  it("excludes teachers, unknown and blocked accounts", () => {
    expect(belongsInClassTable("TEACHER")).toBe(false);
    expect(belongsInClassTable("OTHER")).toBe(false);
    expect(belongsInClassTable("ADMIN", true)).toBe(false);
  });
});
