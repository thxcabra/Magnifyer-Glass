import { describe, it, expect } from "vitest";
import { translate } from "@/lib/i18n";

describe("translate", () => {
  it("returns the pt-BR string", () => {
    expect(translate("pt-BR", "nav.games")).toBe("Jogos");
  });
  it("returns the en string", () => {
    expect(translate("en", "nav.games")).toBe("Games");
  });
  it("substitutes {vars}", () => {
    const r = translate("en", "players.count_shown", { shown: 5, total: 10 });
    expect(r).toContain("5");
    expect(r).toContain("10");
  });
  it("returns the key itself when unknown (so misses are visible)", () => {
    expect(translate("en", "totally.unknown.key")).toBe("totally.unknown.key");
  });
});
