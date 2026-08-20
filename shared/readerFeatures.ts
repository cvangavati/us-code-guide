import { CODE_TOPICS, titleDescription, titleSectionPreviews } from "./navigation";
import { US_CODE_TITLES } from "./usCode";

export type SearchResultScope = "Plain-language guide index" | "Title guide index" | "Official section index";
export type PlainLanguageSearchResult = {
  id: string;
  title: number;
  section: string;
  label: string;
  description: string;
  scope: SearchResultScope;
  sourceStatus: "Curated reading guide" | "Official citation index";
  kind: "section" | "title";
  terms: string[];
};

export type RelatedLaw = {
  title: number;
  section: string;
  label: string;
  connection: string;
};

export type SavedSection = {
  title: number;
  section: string;
  heading: string;
  savedAt: number;
  folderId?: string;
};

export type SavedFolder = {
  id: string;
  name: string;
  createdAt: number;
  isDefault?: boolean;
};

export type SavedLibrary = {
  folders: SavedFolder[];
  sections: SavedSection[];
};

export type ChapterIndexEntry = {
  section: string;
  heading: string;
  chapter?: string;
};

export type ChapterTrail = {
  chapter: string;
  currentLabel: string;
  steps: Array<{ title: number; section: string; label: string; connection: string }>;
};

const GUIDE_SECTIONS: Array<Omit<PlainLanguageSearchResult, "sourceStatus">> = [
  { id: "5-552", title: 5, section: "552", label: "Government records", description: "How to ask a federal agency for records under the Freedom of Information Act.", scope: "Plain-language guide index", kind: "section", terms: ["foia", "freedom of information", "public records", "government documents", "agency records"] },
  { id: "5-552a", title: 5, section: "552a", label: "Federal privacy records", description: "Rules for federal agencies’ records about people, including access and correction rights.", scope: "Plain-language guide index", kind: "section", terms: ["privacy act", "personal information", "government database", "correct records"] },
  { id: "8-1101", title: 8, section: "1101", label: "Immigration definitions", description: "Common legal terms used in federal immigration law.", scope: "Plain-language guide index", kind: "section", terms: ["immigration", "visa", "alien", "citizenship", "immigrant"] },
  { id: "17-106", title: 17, section: "106", label: "Copyright rights", description: "The basic exclusive rights that copyright owners receive for creative work.", scope: "Plain-language guide index", kind: "section", terms: ["copyright", "music", "photo", "video", "creative work", "artist"] },
  { id: "17-107", title: 17, section: "107", label: "Fair use", description: "The factors used when considering whether a use of copyrighted work may be fair use.", scope: "Plain-language guide index", kind: "section", terms: ["fair use", "copyright exception", "quote", "commentary", "parody"] },
  { id: "18-1030", title: 18, section: "1030", label: "Computer fraud", description: "Federal crimes involving unauthorized computer access and certain computer-related conduct.", scope: "Plain-language guide index", kind: "section", terms: ["hacking", "computer crime", "cybercrime", "unauthorized access", "computer fraud"] },
  { id: "18-922", title: 18, section: "922", label: "Firearms rules", description: "Federal restrictions involving firearms, including prohibited transactions and possession.", scope: "Plain-language guide index", kind: "section", terms: ["gun", "firearm", "weapon", "background check", "possession"] },
  { id: "21-301", title: 21, section: "301", label: "Food and drug law", description: "The purpose and policy behind major federal food, drug, and medical product rules.", scope: "Plain-language guide index", kind: "section", terms: ["food", "drug", "fda", "medicine", "medical device", "health product"] },
  { id: "23-101", title: 23, section: "101", label: "Federal highways", description: "Definitions and framework for federal highway programs.", scope: "Plain-language guide index", kind: "section", terms: ["highway", "road", "transportation", "interstate", "driving"] },
  { id: "26-1", title: 26, section: "1", label: "Income tax", description: "Federal income tax rates and the basic tax table structure.", scope: "Plain-language guide index", kind: "section", terms: ["tax", "income tax", "tax rate", "irs", "filing"] },
  { id: "26-61", title: 26, section: "61", label: "Gross income", description: "A foundational definition of gross income for federal tax purposes.", scope: "Plain-language guide index", kind: "section", terms: ["gross income", "taxable income", "pay", "wages", "income"] },
  { id: "29-206", title: 29, section: "206", label: "Minimum wage", description: "Federal minimum-wage requirements in the Fair Labor Standards Act.", scope: "Plain-language guide index", kind: "section", terms: ["minimum wage", "hourly pay", "wages", "work", "job"] },
  { id: "35-101", title: 35, section: "101", label: "Patentable inventions", description: "The categories of inventions and discoveries that may be eligible for patents.", scope: "Plain-language guide index", kind: "section", terms: ["patent", "invention", "intellectual property", "technology", "idea"] },
  { id: "42-1983", title: 42, section: "1983", label: "Civil rights claims", description: "A federal civil-rights claim for certain violations of constitutional or federal rights by people acting under state authority.", scope: "Plain-language guide index", kind: "section", terms: ["civil rights", "police", "government misconduct", "constitutional rights", "section 1983"] },
  { id: "47-230", title: 47, section: "230", label: "Online platforms", description: "A provision addressing certain legal treatment of online computer services and user-provided content.", scope: "Plain-language guide index", kind: "section", terms: ["social media", "internet", "online platform", "website", "section 230"] },
  { id: "49-30101", title: 49, section: "30101", label: "Motor vehicle safety", description: "The purposes and policy foundation of federal motor vehicle safety law.", scope: "Plain-language guide index", kind: "section", terms: ["car safety", "vehicle", "recall", "driving", "automobile"] },
  { id: "52-10301", title: 52, section: "10301", label: "Voting rights", description: "A core federal provision addressing voting practices that deny or limit voting rights on the basis of race or color.", scope: "Plain-language guide index", kind: "section", terms: ["vote", "voting rights", "election", "discrimination", "ballot"] },
  { id: "54-100101", title: 54, section: "100101", label: "National Park Service", description: "The purpose and role of the National Park Service.", scope: "Plain-language guide index", kind: "section", terms: ["national park", "parks", "public land", "nps", "outdoors"] },
];

const RELATED_LAWS: Record<string, RelatedLaw[]> = {
  "1:1": [
    { title: 1, section: "3", label: "County and parish", connection: "Another general definition used across federal law." },
    { title: 1, section: "8", label: "Meaning of person", connection: "Another default definition that can shape how a statute is read." },
  ],
  "5:552": [
    { title: 5, section: "552a", label: "Privacy Act records", connection: "A related framework for government-held personal records." },
    { title: 44, section: "3101", label: "Federal records management", connection: "The baseline duty to create and preserve agency records." },
  ],
  "17:106": [
    { title: 17, section: "107", label: "Fair use", connection: "A commonly discussed limitation on copyright rights." },
    { title: 17, section: "501", label: "Copyright infringement", connection: "The provision addressing infringement of exclusive rights." },
  ],
  "18:1030": [
    { title: 18, section: "1028A", label: "Aggravated identity theft", connection: "May arise in some computer-crime situations involving another person’s identifying information." },
    { title: 18, section: "2701", label: "Stored communications", connection: "Addresses certain unauthorized access to stored electronic communications." },
  ],
  "26:1": [
    { title: 26, section: "61", label: "Gross income", connection: "A core income definition used before tax rates are applied." },
    { title: 26, section: "63", label: "Taxable income", connection: "Defines taxable income and certain deductions." },
  ],
  "42:1983": [
    { title: 28, section: "1343", label: "Civil-rights jurisdiction", connection: "A jurisdiction provision often consulted alongside some federal civil-rights claims." },
    { title: 42, section: "1988", label: "Civil-rights procedures", connection: "Addresses selected procedures and fee rules in civil-rights cases." },
  ],
};

export function searchPlainLanguage(query: string): PlainLanguageSearchResult[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  const terms = normalized.split(/\s+/).filter(Boolean);
  const score = (value: PlainLanguageSearchResult) => {
    const haystack = [value.label, value.description, ...value.terms].join(" ").toLowerCase();
    return terms.reduce((total, term) => total + (haystack.includes(term) ? 2 : 0) + (value.label.toLowerCase().includes(term) ? 2 : 0), 0);
  };
  const titleResults: PlainLanguageSearchResult[] = US_CODE_TITLES.map(title => {
    const preview = titleSectionPreviews(title.number)[0];
    return {
      id: `title-${title.number}`,
      title: title.number,
      section: preview?.section ?? "1",
      label: `Title ${title.number}: ${title.name}`,
      description: titleDescription(title.number),
      scope: "Title guide index",
      kind: "title",
      sourceStatus: "Curated reading guide",
      terms: CODE_TOPICS.filter(topic => topic.titles.includes(title.number)).flatMap(topic => [topic.label, topic.description]),
    };
  });
  const officialIndexResults: PlainLanguageSearchResult[] = US_CODE_TITLES.flatMap(title => titleSectionPreviews(title.number).map(preview => ({
    id: `official-${title.number}-${preview.section}`,
    title: title.number,
    section: preview.section,
    label: `${title.number} U.S.C. § ${preview.section}: ${preview.label}`,
    description: `Official citation pathway within Title ${title.number}, ${title.name}.`,
    scope: "Official section index" as const,
    sourceStatus: "Official citation index" as const,
    kind: "section" as const,
    terms: [title.name, titleDescription(title.number), preview.label, ...CODE_TOPICS.filter(topic => topic.titles.includes(title.number)).flatMap(topic => [topic.label, topic.description])],
  })));
  const curatedGuideResults: PlainLanguageSearchResult[] = GUIDE_SECTIONS.map(result => ({ ...result, sourceStatus: "Curated reading guide" }));
  const scopeOrder: Record<SearchResultScope, number> = { "Plain-language guide index": 0, "Official section index": 1, "Title guide index": 2 };
  return [...curatedGuideResults, ...titleResults, ...officialIndexResults]
    .map(result => ({ result, score: score(result) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || scopeOrder[a.result.scope] - scopeOrder[b.result.scope])
    .slice(0, 8)
    .map(item => item.result);
}

export function officialGovInfoSearchUrl(query: string) {
  const ash = JSON.stringify({ collections: ["USCODE"], fields: [{ f: "content", v: query, p: 0 }] });
  return `https://www.govinfo.gov/?ash=${encodeURIComponent(ash)}`;
}

export function relatedLawsFor(title: number, section: string): RelatedLaw[] {
  return RELATED_LAWS[`${title}:${section.toLowerCase()}`] ?? [];
}

export function chapterTrailFor(title: number, currentSection: string, entries: ChapterIndexEntry[]): ChapterTrail | null {
  if (entries.length === 0) return null;
  const groups = new Map<string, ChapterIndexEntry[]>();
  entries.forEach(entry => {
    const chapter = entry.chapter?.replace(/^CHAPTER\s*/i, "Chapter ") || "Sections";
    groups.set(chapter, [...(groups.get(chapter) ?? []), entry]);
  });
  const chapters = Array.from(groups.entries()).map(([chapter, sections]) => ({ chapter, sections }));
  const currentChapterIndex = chapters.findIndex(group => group.sections.some(entry => entry.section.toLowerCase() === currentSection.toLowerCase()));
  const chapterIndex = currentChapterIndex >= 0 ? currentChapterIndex : 0;
  const activeChapter = chapters[chapterIndex];
  const activeSectionIndex = activeChapter.sections.findIndex(entry => entry.section.toLowerCase() === currentSection.toLowerCase());
  const steps: ChapterTrail["steps"] = [];
  const previous = activeSectionIndex > 0 ? activeChapter.sections[activeSectionIndex - 1] : undefined;
  const next = activeSectionIndex >= 0 ? activeChapter.sections[activeSectionIndex + 1] : activeChapter.sections[0];
  const nextChapter = chapters[chapterIndex + 1]?.sections[0];
  if (previous) steps.push({ title, section: previous.section, label: previous.heading, connection: "Previous section in this official chapter." });
  if (next) steps.push({ title, section: next.section, label: next.heading, connection: "Next section in this official chapter." });
  if (nextChapter) steps.push({ title, section: nextChapter.section, label: nextChapter.heading, connection: `First section in ${chapters[chapterIndex + 1].chapter}.` });
  if (steps.length === 0 && activeChapter.sections[0]) {
    const first = activeChapter.sections[0];
    steps.push({ title, section: first.section, label: first.heading, connection: "First listed section in this official chapter." });
  }
  return { chapter: activeChapter.chapter, currentLabel: `Title ${title} · ${activeChapter.chapter}`, steps };
}

const READING_LIST_KEY = "peoples-code-reading-list-v1";
export const DEFAULT_FOLDER_ID = "saved";

const defaultFolder = (): SavedFolder => ({ id: DEFAULT_FOLDER_ID, name: "Saved sections", createdAt: 0, isDefault: true });

export function readSavedSections(): SavedSection[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(READING_LIST_KEY) ?? "[]") as SavedSection[];
    return Array.isArray(value) ? value.filter(item => typeof item?.title === "number" && typeof item?.section === "string" && typeof item?.heading === "string") : [];
  } catch {
    return [];
  }
}

export function writeSavedSections(items: SavedSection[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(READING_LIST_KEY, JSON.stringify(items));
}

export function readSavedLibrary(): SavedLibrary {
  if (typeof window === "undefined") return { folders: [defaultFolder()], sections: [] };
  try {
    const stored = JSON.parse(window.localStorage.getItem(READING_LIST_KEY) ?? "null") as SavedLibrary | SavedSection[] | null;
    if (Array.isArray(stored)) return { folders: [defaultFolder()], sections: stored.map(section => ({ ...section, folderId: section.folderId ?? DEFAULT_FOLDER_ID })) };
    const folders = Array.isArray(stored?.folders) ? stored.folders.filter(folder => typeof folder?.id === "string" && typeof folder?.name === "string") : [];
    const sections = Array.isArray(stored?.sections) ? stored.sections.filter(item => typeof item?.title === "number" && typeof item?.section === "string" && typeof item?.heading === "string") : [];
    return { folders: folders.some(folder => folder.id === DEFAULT_FOLDER_ID) ? folders : [defaultFolder(), ...folders], sections: sections.map(section => ({ ...section, folderId: section.folderId ?? DEFAULT_FOLDER_ID })) };
  } catch {
    return { folders: [defaultFolder()], sections: [] };
  }
}

export function writeSavedLibrary(library: SavedLibrary) {
  if (typeof window !== "undefined") window.localStorage.setItem(READING_LIST_KEY, JSON.stringify(library));
}

export function createSavedFolder(library: SavedLibrary, name: string): SavedLibrary {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed || library.folders.some(folder => folder.name.toLowerCase() === trimmed.toLowerCase())) return library;
  const id = `folder-${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "list"}-${Date.now().toString(36)}`;
  return { ...library, folders: [...library.folders, { id, name: trimmed, createdAt: Date.now() }] };
}

export function renameSavedFolder(library: SavedLibrary, folderId: string, name: string): SavedLibrary {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed || folderId === DEFAULT_FOLDER_ID || library.folders.some(folder => folder.id !== folderId && folder.name.toLowerCase() === trimmed.toLowerCase())) return library;
  return { ...library, folders: library.folders.map(folder => folder.id === folderId ? { ...folder, name: trimmed } : folder) };
}

export function deleteSavedFolder(library: SavedLibrary, folderId: string): SavedLibrary {
  if (folderId === DEFAULT_FOLDER_ID) return library;
  return {
    folders: library.folders.filter(folder => folder.id !== folderId),
    sections: library.sections.map(section => section.folderId === folderId ? { ...section, folderId: DEFAULT_FOLDER_ID } : section),
  };
}

export function moveSavedSection(library: SavedLibrary, title: number, section: string, folderId: string): SavedLibrary {
  if (!library.folders.some(folder => folder.id === folderId)) return library;
  return { ...library, sections: library.sections.map(item => item.title === title && item.section === section ? { ...item, folderId } : item) };
}

export function isSavedSection(items: SavedSection[], title: number, section: string) {
  return items.some(item => item.title === title && item.section === section);
}

export function toggleSavedSection(items: SavedSection[], item: Omit<SavedSection, "savedAt">): SavedSection[] {
  const existing = items.some(saved => saved.title === item.title && saved.section === item.section);
  return existing ? items.filter(saved => !(saved.title === item.title && saved.section === item.section)) : [{ ...item, savedAt: Date.now() }, ...items];
}
