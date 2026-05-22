import { describe, it, expect } from "vitest";
import { teamColors, TEAM_COLORS } from "@/lib/team-colors";

describe("teamColors", () => {
  it("returns the brand color for a known team", () => {
    expect(teamColors("LAL").primary).toBe("#552583");
  });
  it("is case-insensitive", () => {
    expect(teamColors("lal").primary).toBe("#552583");
  });
  it("falls back to brand orange for unknown/null", () => {
    expect(teamColors(null).primary).toBe("#f97316");
    expect(teamColors("ZZZ").primary).toBe("#f97316");
  });
  it("covers all 30 active franchises", () => {
    const active = Object.keys(TEAM_COLORS).filter(
      (k) => !["NJN", "NOH", "SEA"].includes(k),
    );
    expect(active.length).toBe(30);
  });
});
