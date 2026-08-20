import { describe, expect, it } from "vitest";
import { US_CODE_TITLES, titleLabel } from "../shared/usCode";
import { compactOfficialHtml, extractGovInfoSection, extractGovInfoTitleIndex, govInfoTitleUrl, normalizePlainEnglishGuide, officialSectionUrl } from "./usCode";

describe("U.S. Code content model", () => {
  it("exposes the complete 54-title navigation catalogue including the reserved title", () => {
    expect(US_CODE_TITLES).toHaveLength(54);
    expect(US_CODE_TITLES[0]).toMatchObject({ number: 1, name: "General Provisions" });
    expect(US_CODE_TITLES[52]).toMatchObject({ number: 53, status: "reserved" });
    expect(titleLabel(18)).toBe("Title 18 — Crimes and Criminal Procedure");
  });

  it("constructs a granular official-source URL rather than a full-code download", () => {
    const url = officialSectionUrl(18, "1030");
    expect(url).toContain("USC-prelim-title18-section1030");
    expect(url).toContain("edition=prelim");
    expect(govInfoTitleUrl(18)).toContain("USCODE-2023-title18");
  });

  it("compacts source HTML into readable paragraphs without scripts or navigation chrome", () => {
    const source = `
      <html><head><script>ignore()</script><style>.hide { display:none; }</style></head>
      <body><div>Home</div><h1>18 USC 1030: Fraud and related activity</h1>
      <p>Whoever knowingly accesses a computer without authorization is subject to this section.</p>
      <p>A second statutory paragraph remains available for the reader.</p></body></html>`;
    expect(compactOfficialHtml(source)).toEqual([
      "18 USC 1030: Fraud and related activity",
      "Whoever knowingly accesses a computer without authorization is subject to this section.",
      "A second statutory paragraph remains available for the reader.",
    ]);
  });

  it("keeps the statutory body but excludes editorial notes from a source section", () => {
    const source = "<h3>§1030. Computer fraud</h3><p>First official paragraph for this section.</p><h4>Editorial Notes</h4><p>This historical note should not enter the reader body.</p>";
    expect(compactOfficialHtml(source)).toEqual([
      "§1030. Computer fraud",
      "First official paragraph for this section.",
    ]);
  });

  it("bounds an archive fallback to the requested section rather than loading the whole title into the reader", () => {
    const source = "<!-- documentid:18_1030 --><h3>§1030. Computer fraud</h3><p>First official paragraph for this section.</p><!-- documentid:18_1031 --><h3>§1031. Major fraud</h3><p>Different section.</p>";
    expect(extractGovInfoSection(source, 18, "1030")).toEqual([
      "§1030. Computer fraud",
      "First official paragraph for this section.",
    ]);
  });

  it("builds a compact section discovery list from an official title archive", () => {
    const source = "<!-- documentid:18_-ch47 --><h3>CHAPTER 47—COMPUTER CRIME</h3><!-- documentid:18_1030 --><h3>§1030. Computer fraud</h3><!-- documentid:18_1031 --><h3>§1031. Major fraud</h3>";
    expect(extractGovInfoTitleIndex(source, 18)).toEqual([
      { section: "1030", heading: "Computer fraud" },
      { section: "1031", heading: "Major fraud" },
    ]);
  });

  it("adds a linked qualification notice when a generated guide misses a statutory exception", () => {
    const guide = normalizePlainEnglishGuide({
      summary: "A short general rule.",
      keyPoints: ["One point.", "Another point."],
      watchFor: ["Check the official text."],
      trace: { summaryParagraphs: [1], keyPointParagraphs: [[1], [1]], watchForParagraphs: [[1]] },
    }, ["This rule applies unless a stated exception changes the result."]);
    expect(guide.watchFor[0]).toMatch(/conditions, exceptions, or limits/i);
    expect(guide.trace.watchForParagraphs[0]).toEqual([1]);
  });
});
