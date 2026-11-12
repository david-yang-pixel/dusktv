import { isSameTitle } from "../titleMatch";

describe("isSameTitle", () => {
  it("matches identical titles", () => {
    expect(isSameTitle("狂王第二季", "狂王第二季")).toBe(true);
  });

  it("ignores spacing differences between resource sites", () => {
    expect(isSameTitle("狂王 第二季", "狂王第二季")).toBe(true);
    expect(isSameTitle("狂王　第二季 ", "狂王第二季")).toBe(true);
  });

  it("ignores letter case and full-width forms", () => {
    expect(isSameTitle("Blade Runner 2049", "blade runner 2049")).toBe(true);
    expect(isSameTitle("沙丘：第二部", "沙丘:第二部")).toBe(true);
    expect(isSameTitle("沙丘２", "沙丘2")).toBe(true);
  });

  it("does not match a different season or a longer title", () => {
    expect(isSameTitle("狂王第一季", "狂王第二季")).toBe(false);
    expect(isSameTitle("狂王", "狂王第二季")).toBe(false);
    expect(isSameTitle("狂王第二季 花絮", "狂王第二季")).toBe(false);
  });

  it("treats missing titles as no match", () => {
    expect(isSameTitle(undefined, "狂王")).toBe(false);
    expect(isSameTitle("", "")).toBe(false);
  });
});
