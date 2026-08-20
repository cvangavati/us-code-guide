import { describe, expect, it } from "vitest";
import { officialGovInfoSearchUrl, relatedLawsFor, searchPlainLanguage, toggleSavedSection } from "./readerFeatures";

describe("reader feature models", () => {
  it("finds a plain-language section match without requiring a citation", () => {
    const results = searchPlainLanguage("minimum wage");
    expect(results[0]).toMatchObject({ title: 29, section: "206", label: "Minimum wage", scope: "Plain-language guide index" });
  });

  it("keeps official citation-index results distinguishable from curated guide results", () => {
    const results = searchPlainLanguage("copyright");
    expect(results).toEqual(expect.arrayContaining([
      expect.objectContaining({ scope: "Plain-language guide index", sourceStatus: "Curated reading guide" }),
      expect.objectContaining({ scope: "Official section index", sourceStatus: "Official citation index" }),
    ]));
  });

  it("returns only clearly curated related-law paths for a known section", () => {
    expect(relatedLawsFor(18, "1030")).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: 18, section: "2701" }),
    ]));
    expect(relatedLawsFor(7, "1")).toEqual([]);
  });

  it("toggles a saved section without duplicate entries", () => {
    const first = toggleSavedSection([], { title: 17, section: "106", heading: "Exclusive rights" });
    expect(first).toHaveLength(1);
    expect(toggleSavedSection(first, { title: 17, section: "106", heading: "Exclusive rights" })).toEqual([]);
  });

  it("constructs an official U.S. Code-only GovInfo search link for a broader query", () => {
    const url = officialGovInfoSearchUrl("water pollution");
    expect(url).toContain("govinfo.gov");
    expect(decodeURIComponent(url)).toContain("USCODE");
    expect(decodeURIComponent(url)).toContain("water pollution");
  });
});
