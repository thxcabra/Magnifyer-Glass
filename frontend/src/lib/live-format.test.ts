import { describe, it, expect } from "vitest";
import {
  formatClock,
  formatMinutes,
  isOvertime,
  timeAgo,
} from "@/lib/live-format";

describe("formatClock", () => {
  it("formats minutes:seconds", () => {
    expect(formatClock("PT05M12.00S")).toBe("5:12");
  });
  it("pads seconds", () => {
    expect(formatClock("PT01M03.00S")).toBe("1:03");
  });
  it("returns empty for null/garbage", () => {
    expect(formatClock(null)).toBe("");
    expect(formatClock("nope")).toBe("");
  });
});

describe("formatMinutes", () => {
  it("extracts whole minutes", () => {
    expect(formatMinutes("PT34M16.90S")).toBe("34");
  });
  it("strips leading zeros", () => {
    expect(formatMinutes("PT05M00.00S")).toBe("5");
  });
  it("returns empty when absent", () => {
    expect(formatMinutes(null)).toBe("");
  });
});

describe("isOvertime", () => {
  it("is true beyond the 4th period", () => {
    expect(isOvertime(5)).toBe(true);
  });
  it("is false in regulation or when unknown", () => {
    expect(isOvertime(4)).toBe(false);
    expect(isOvertime(null)).toBe(false);
  });
});

describe("timeAgo", () => {
  it("returns a non-empty string for a recent timestamp", () => {
    const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
    expect(timeAgo(oneHourAgo, "pt-BR").length).toBeGreaterThan(0);
    expect(timeAgo(oneHourAgo, "en").length).toBeGreaterThan(0);
  });
  it("returns empty for null/invalid", () => {
    expect(timeAgo(null, "en")).toBe("");
    expect(timeAgo("not-a-date", "pt-BR")).toBe("");
  });
});
