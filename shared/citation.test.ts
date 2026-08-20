import { describe, expect, it } from "vitest";
import { parseUSCodeCitation, readerPath, selectSectionForReader, selectTitleForReader, setReaderMode } from "./citation";

describe("reader navigation helpers", () => {
  it("parses familiar U.S. Code citation forms", () => {
    expect(parseUSCodeCitation("18 USC 1030")).toEqual({ title: 18, section: "1030" });
    expect(parseUSCodeCitation("1 § 1")).toEqual({ title: 1, section: "1" });
    expect(parseUSCodeCitation("Title 42 section 1983")).toEqual({ title: 42, section: "1983" });
  });

  it("rejects invalid title ranges and produces stable reader routes", () => {
    expect(parseUSCodeCitation("55 USC 1")).toBeNull();
    expect(parseUSCodeCitation("just some words")).toBeNull();
    expect(readerPath(18, "1030")).toBe("/read/18/1030");
  });

  it("selects a title at its opening section and creates the route used by reader navigation", () => {
    const selected = selectTitleForReader(18);
    expect(selected).toEqual({ title: 18, section: "1" });
    expect(readerPath(selected.title, selected.section)).toBe("/read/18/1");
    expect(selectSectionForReader(18, "1030")).toEqual({ title: 18, section: "1030" });
  });

  it("preserves the reader mode chosen by the mobile official/plain-English switcher", () => {
    expect(setReaderMode("official")).toBe("official");
    expect(setReaderMode("guide")).toBe("guide");
  });
});
