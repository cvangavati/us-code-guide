import { describe, expect, it } from "vitest";
import { US_CODE_TITLES, titleLabel } from "../shared/usCode";
import { compactOfficialHtml, extractGovInfoSection, extractGovInfoTitleIndex, extractOfficialBlocks, govInfoTitleUrl, normalizePlainEnglishGuide, officialSectionUrl } from "./usCode";

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
      <p>A second statutory paragraph remains available for the reader.</p><p>(July 30, 1947, ch. 388, 61 Stat. 633.)</p><p>; June 25, 1948, ch. 645, §6, 62 Stat. 859.</p></body></html>`;
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

  it("preserves a source table as structured headers and rows instead of flattening it into a paragraph", () => {
    const source = "<!-- documentid:18_1030 --><h3>§1030. Computer fraud</h3><p>Opening statutory language.</p><table><caption>Penalty levels</caption><tr><th>Conduct</th><th>Maximum term</th></tr><tr><td>Basic offense</td><td>One year</td></tr></table><p>Closing statutory language.</p><!-- documentid:18_1031 -->";
    expect(extractOfficialBlocks(source, 18, "1030")).toContainEqual({
      type: "table",
      caption: "Penalty levels",
      headers: ["Conduct", "Maximum term"],
      rows: [["Basic offense", "One year"]],
    });
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

  it("keeps all provided line-by-line explanations instead of truncating the managed guide at five entries", () => {
    const guide = normalizePlainEnglishGuide({
      summary: "A short general rule.",
      keyPoints: Array.from({ length: 7 }, (_, index) => `Everyday explanation ${index + 1}.`),
      watchFor: ["A limit can change the general rule."],
      trace: {
        summaryParagraphs: [1],
        keyPointParagraphs: Array.from({ length: 7 }, (_, index) => [index + 1]),
        watchForParagraphs: [[1]],
      },
    }, Array.from({ length: 7 }, (_, index) => `Official source line ${index + 1}.`));

    expect(guide.keyPoints).toHaveLength(7);
    expect(guide.keyPoints[6]).toBe("Everyday explanation 7.");
    expect(guide.trace.keyPointParagraphs[6]).toEqual([7]);
  });

  it("replaces a source-like model answer and fills any missing lines with common-person translations", () => {
    const sourceLines = [
      "For the purposes of this section, the term “county” includes the District of Columbia and Puerto Rico.",
      "The Secretary shall submit a report to Congress each year.",
    ];
    const guide = normalizePlainEnglishGuide({
      summary: sourceLines[0],
      keyPoints: [sourceLines[0]],
      watchFor: ["A limit can change the general rule."],
      trace: { summaryParagraphs: [1], keyPointParagraphs: [[1]], watchForParagraphs: [[1]] },
    }, sourceLines);

    expect(guide.summary).toBe("Here, “county” is used more broadly than its everyday label. It can cover the District of Columbia and Puerto Rico.");
    expect(guide.keyPoints).toEqual([
      "Here, “county” is used more broadly than its everyday label. It can cover the District of Columbia and Puerto Rico.",
      "In everyday terms, The Secretary has to send a report to Congress each year.",
    ]);
    expect(guide.trace.keyPointParagraphs).toEqual([[1], [2]]);
  });
});
