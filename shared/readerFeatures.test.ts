import { describe, expect, it } from "vitest";
import { addRecentSection, chapterTrailFor, createSavedFolder, deleteSavedFolder, moveSavedSection, officialGovInfoSearchUrl, relatedLawsFor, renameSavedFolder, searchPlainLanguage, toggleSavedSection, type SavedLibrary } from "./readerFeatures";

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

  it("builds a source-structured route within the current official chapter", () => {
    const trail = chapterTrailFor(1, "2", [
      { section: "1", heading: "First definition", chapter: "CHAPTER 1" },
      { section: "2", heading: "Second definition", chapter: "CHAPTER 1" },
      { section: "3", heading: "Third definition", chapter: "CHAPTER 1" },
      { section: "101", heading: "Next chapter", chapter: "CHAPTER 2" },
    ]);
    expect(trail?.chapter).toBe("Chapter 1");
    expect(trail?.steps).toEqual(expect.arrayContaining([
      expect.objectContaining({ section: "1", connection: "Previous section in this official chapter." }),
      expect.objectContaining({ section: "3", connection: "Next section in this official chapter." }),
      expect.objectContaining({ section: "101" }),
    ]));
  });

  it("creates, renames, moves into, and deletes a local saved folder without losing sections", () => {
    const initial: SavedLibrary = { folders: [{ id: "saved", name: "Saved sections", createdAt: 0, isDefault: true }], sections: [{ title: 17, section: "106", heading: "Exclusive rights", savedAt: 1, folderId: "saved" }] };
    const created = createSavedFolder(initial, "Copyright research");
    const folder = created.folders.find(item => item.name === "Copyright research");
    expect(folder).toBeDefined();
    const renamed = renameSavedFolder(created, folder!.id, "Copyright notes");
    const moved = moveSavedSection(renamed, 17, "106", folder!.id);
    expect(moved.sections[0].folderId).toBe(folder!.id);
    const deleted = deleteSavedFolder(moved, folder!.id);
    expect(deleted.sections[0].folderId).toBe("saved");
    expect(deleted.folders.some(item => item.id === folder!.id)).toBe(false);
  });

  it("keeps a bounded, duplicate-free recent-reading history with newest first", () => {
    const initial = addRecentSection([], { title: 5, section: "552", heading: "Government records" }, 1);
    const updated = addRecentSection(initial, { title: 17, section: "106", heading: "Exclusive rights" }, 2);
    const revisited = addRecentSection(updated, { title: 5, section: "552", heading: "Government records" }, 3);
    expect(revisited).toHaveLength(2);
    expect(revisited[0]).toMatchObject({ title: 5, section: "552", viewedAt: 3 });
  });
});
