import { describe, expect, it } from "vitest";
import { titleSectionPreviews } from "./navigation";

describe("title section previews", () => {
  it("combines official-title and topic-entry previews without duplicate sections", () => {
    expect(titleSectionPreviews(1)).toEqual([{ section: "1", label: "How to read federal laws" }]);
    expect(titleSectionPreviews(17)).toEqual([{ section: "101", label: "Copyright definitions" }, { section: "106", label: "Copyright rights" }]);
  });

  it("returns no invented preview for a title without verified navigation metadata", () => {
    expect(titleSectionPreviews(2)).toEqual([]);
  });
});
