import { invokeLLM } from "./_core/llm";
import type { CodeSection, PlainEnglishGuide } from "../shared/usCode";

const OLRC_VIEW_URL = "https://uscode.house.gov/view.xhtml";
const GOVINFO_ARCHIVE_YEAR = "2023";
const GOVINFO_CONTENT_URL = "https://www.govinfo.gov/content/pkg";
const SECTION_CACHE_TTL_MS = 15 * 60 * 1000;
const sectionCache = new Map<string, { expiresAt: number; value: CodeSection }>();
const guideCache = new Map<string, PlainEnglishGuide>();
const titleArchiveCache = new Map<number, { expiresAt: number; html: string }>();

const curatedSections: Record<string, Pick<CodeSection, "heading" | "officialText" | "plainEnglish">> = {
  "1:1": {
    heading: "Words denoting number, gender, and so forth",
    officialText: [
      "In determining the meaning of any Act of Congress, unless the context indicates otherwise—",
      "words importing the singular include and apply to several persons, parties, or things; words importing the plural include the singular; and words importing the masculine gender include the feminine as well;",
      "words used in the present tense include the future as well as the present;",
      "the words \"person\" and \"whoever\" include corporations, companies, associations, firms, partnerships, societies, and joint stock companies, as well as individuals;",
      "\"officer\" includes any person authorized by law to perform the duties of the office;",
      "\"signature\" or \"subscription\" includes a mark when the person making the same intended it as such;",
      "\"oath\" includes affirmation, and \"sworn\" includes affirmed; and",
      "\"writing\" includes printing and typewriting and reproductions of visual symbols by photographing, multigraphing, mimeographing, manifolding, or otherwise.",
    ],
    plainEnglish: {
      label: "Plain-English guide — not legal advice",
      summary: "This is a default rule for reading federal laws. Unless a particular law says something different, common words should be read broadly rather than narrowly.",
      keyPoints: [
        "A singular word can cover more than one person or thing, and a plural word can cover one.",
        "Words that use masculine grammar are not limited to men.",
        "Terms such as ‘person,’ ‘signature,’ ‘oath,’ and ‘writing’ have broader definitions than everyday speech may suggest.",
      ],
      watchFor: [
        "The opening condition matters: a specific law can supply its own definition or show a different meaning from context.",
        "This guide helps with reading the text; it does not determine how a court will apply a statute to a particular situation.",
      ],
      trace: {
        summaryParagraphs: [1],
        keyPointParagraphs: [[2], [2], [4, 6, 7]],
        watchForParagraphs: [[1], [1]],
      },
      generated: false,
    },
  },
};

const htmlEntityMap: Record<string, string> = {
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&ndash;": "–",
  "&mdash;": "—",
  "&ldquo;": "“",
  "&rdquo;": "”",
  "&sect;": "§",
};

export function officialSectionUrl(title: number, section: string) {
  const granuleId = `USC-prelim-title${title}-section${section}`;
  return `${OLRC_VIEW_URL}?req=granuleid:${encodeURIComponent(granuleId)}&num=0&edition=prelim`;
}

export function govInfoTitleUrl(title: number) {
  return `${GOVINFO_CONTENT_URL}/USCODE-${GOVINFO_ARCHIVE_YEAR}-title${title}/html/USCODE-${GOVINFO_ARCHIVE_YEAR}-title${title}.htm`;
}

function decodeHtml(input: string) {
  const named = input.replace(/&(amp|quot|#39|apos|nbsp|ndash|mdash|ldquo|rdquo|sect);/g, match => htmlEntityMap[match] ?? match);
  return named
    .replace(/&#(\d+);/g, (_, value) => String.fromCodePoint(Number(value)))
    .replace(/&#x([0-9a-f]+);/gi, (_, value) => String.fromCodePoint(parseInt(value, 16)));
}

export function compactOfficialHtml(html: string) {
  const cleaned = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?(p|div|h[1-6]|li|br|tr|section|article)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "");

  const rawLines = decodeHtml(cleaned)
    .split(/\n+/)
    .map(line => line.replace(/\s+/g, " ").trim());
  const editorialNotes = rawLines.findIndex(line => /editorial notes/i.test(line));
  const lines = (editorialNotes >= 0 ? rawLines.slice(0, editorialNotes) : rawLines)
    .filter(line => line.length > 20)
    .filter(line => !/^(home|search & browse|downloads|understanding the code)$/i.test(line));
  return lines.slice(0, 45);
}

function splitHeading(lines: string[], title: number, section: string) {
  const headingIndex = lines.findIndex(line => line.includes(`§${section}`) || line.includes(`USC ${section}:`));
  const heading = headingIndex >= 0 ? lines[headingIndex] : `${title} U.S.C. § ${section}`;
  const officialText = lines.filter((_, index) => index !== headingIndex);
  return { heading, officialText };
}

function cacheKey(title: number, section: string) {
  return `${title}:${section.toLowerCase()}`;
}

function normalizeParagraphReferences(values: number[] | undefined, totalParagraphs: number) {
  if (!values) return [1];
  const valid = Array.from(new Set(values.filter(value => Number.isInteger(value) && value >= 1 && value <= totalParagraphs))).slice(0, 3);
  return valid.length > 0 ? valid : [1];
}

function containsStatutoryQualifier(text: string) {
  return /\b(unless|except|except as|only if|if|subject to|provided that|notwithstanding|but|shall not|may not)\b/i.test(text);
}

type PlainEnglishGuideDraft = Omit<PlainEnglishGuide, "label" | "generated" | "trace"> & {
  trace?: PlainEnglishGuide["trace"];
};

export function normalizePlainEnglishGuide(
  raw: PlainEnglishGuideDraft,
  officialText: string[]
): PlainEnglishGuide {
  const total = officialText.length;
  const watchFor = raw.watchFor.slice(0, 4);
  const suppliedTrace = raw.trace;
  const watchForParagraphs = (suppliedTrace?.watchForParagraphs ?? []).map((values: number[]) => normalizeParagraphReferences(values, total));
  const needsQualifierFlag = officialText.some(containsStatutoryQualifier);
  const mentionsQualification = watchFor.some(item => /\b(condition|exception|definition|limit|unless|if|scope|not every)\b/i.test(item));
  if (needsQualifierFlag && !mentionsQualification) {
    watchFor.unshift("This section includes conditions, exceptions, or limits. Read the linked official paragraph before applying the general rule.");
    watchForParagraphs.unshift([officialText.findIndex(containsStatutoryQualifier) + 1 || 1]);
  }

  return {
    label: "Plain-English guide — not legal advice",
    summary: raw.summary,
    keyPoints: raw.keyPoints.slice(0, 5),
    watchFor,
    trace: {
      summaryParagraphs: normalizeParagraphReferences(suppliedTrace?.summaryParagraphs, total),
      keyPointParagraphs: raw.keyPoints.slice(0, 5).map((_, index) => normalizeParagraphReferences(suppliedTrace?.keyPointParagraphs?.[index], total)),
      watchForParagraphs,
    },
    generated: true,
  };
}

export function extractGovInfoSection(html: string, title: number, section: string) {
  const marker = `<!-- documentid:${title}_${section}`;
  const start = html.indexOf(marker);
  if (start < 0) return [];
  const next = html.indexOf("<!-- documentid:", start + marker.length);
  return compactOfficialHtml(html.slice(start, next >= 0 ? next : undefined));
}

export type TitleSectionLink = { section: string; heading: string };

export function extractGovInfoTitleIndex(html: string, title: number): TitleSectionLink[] {
  const matcher = new RegExp(`<!-- documentid:${title}_([A-Za-z0-9.-]+)[^>]*-->[\\s\\S]{0,900}?<h3[^>]*>([\\s\\S]*?)<\\/h3>`, "g");
  const unique = new Map<string, TitleSectionLink>();
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(html)) !== null) {
    const section = match[1];
    const heading = decodeHtml(match[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
      .replace(new RegExp(`^§?${section}\\.?\\s*`), "") || `Section ${section}`;
    if (section && !section.startsWith("-") && !unique.has(section)) unique.set(section, { section, heading });
    if (unique.size >= 80) break;
  }
  return Array.from(unique.values());
}

async function getGovInfoTitleHtml(title: number) {
  const cached = titleArchiveCache.get(title);
  if (cached && cached.expiresAt > Date.now()) return cached.html;
  const response = await fetch(govInfoTitleUrl(title), { signal: AbortSignal.timeout(50_000) });
  if (!response.ok) throw new Error(`GovInfo returned ${response.status}`);
  const html = await response.text();
  titleArchiveCache.set(title, { expiresAt: Date.now() + SECTION_CACHE_TTL_MS, html });
  return html;
}

export async function getTitleSectionIndex(title: number): Promise<TitleSectionLink[]> {
  try {
    return extractGovInfoTitleIndex(await getGovInfoTitleHtml(title), title);
  } catch {
    return [];
  }
}

async function getGovInfoArchiveSection(title: number, section: string, curated?: Pick<CodeSection, "heading" | "officialText" | "plainEnglish">): Promise<CodeSection | null> {
  try {
    const archiveUrl = govInfoTitleUrl(title);
    const lines = extractGovInfoSection(await getGovInfoTitleHtml(title), title, section);
    if (lines.length < 2) return null;
    const { heading, officialText } = splitHeading(lines, title, section);
    return {
      title,
      section,
      heading,
      officialText,
      sourceUrl: archiveUrl,
      sourceName: `U.S. Government Publishing Office (GovInfo), ${GOVINFO_ARCHIVE_YEAR} title edition`,
      sourceStatus: "archived official source",
      retrievedAt: new Date().toISOString(),
      plainEnglish: curated?.plainEnglish,
    };
  } catch {
    return null;
  }
}

export async function getOfficialSection(title: number, section: string): Promise<CodeSection> {
  const key = cacheKey(title, section);
  const current = sectionCache.get(key);
  if (current && current.expiresAt > Date.now()) return current.value;

  const sourceUrl = officialSectionUrl(title, section);
  const curated = curatedSections[key];

  try {
    const response = await fetch(sourceUrl, {
      headers: { "User-Agent": "Peoples-US-Code-Guide/1.0 (public reader)" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) throw new Error(`OLRC returned ${response.status}`);
    const lines = compactOfficialHtml(await response.text());
    if (lines.length < 2) throw new Error("OLRC response did not contain readable section text");

    const { heading, officialText } = splitHeading(lines, title, section);
    const value: CodeSection = {
      title,
      section,
      heading,
      officialText,
      sourceUrl,
      sourceName: "Office of the Law Revision Counsel, U.S. House of Representatives",
      sourceStatus: "live official source",
      retrievedAt: new Date().toISOString(),
      plainEnglish: curated?.plainEnglish,
    };
    sectionCache.set(key, { expiresAt: Date.now() + SECTION_CACHE_TTL_MS, value });
    return value;
  } catch {
    const archiveSection = await getGovInfoArchiveSection(title, section, curated);
    if (archiveSection) {
      sectionCache.set(key, { expiresAt: Date.now() + SECTION_CACHE_TTL_MS, value: archiveSection });
      return archiveSection;
    }
    if (curated) {
      return {
        title,
        section,
        heading: curated.heading,
        officialText: curated.officialText,
        sourceUrl,
        sourceName: "Office of the Law Revision Counsel, U.S. House of Representatives",
        sourceStatus: "verified local fallback",
        retrievedAt: new Date().toISOString(),
        plainEnglish: curated.plainEnglish,
      };
    }

    return {
      title,
      section,
      heading: `${title} U.S.C. § ${section}`,
      officialText: [],
      sourceUrl,
      sourceName: "Office of the Law Revision Counsel, U.S. House of Representatives",
      sourceStatus: "official source link",
      retrievedAt: new Date().toISOString(),
    };
  }
}

export async function makePlainEnglishGuide(section: CodeSection): Promise<PlainEnglishGuide> {
  const key = cacheKey(section.title, section.section);
  if (section.plainEnglish) return section.plainEnglish;
  const cached = guideCache.get(key);
  if (cached) return cached;
  if (section.officialText.length === 0) throw new Error("Official section text is unavailable for explanation");

  const response = await invokeLLM({
    model: "gpt-5-mini",
    maxTokens: 900,
    messages: [
      {
        role: "system",
        content: "You write restrained, neutral reading aids for federal statutory text. You are not a lawyer and must not give advice, tell a reader what they should do, speculate, promise an outcome, or omit limiting language. Keep each point short, use everyday American English, and identify qualifications that a reader should notice. Do not restate the statutory text verbatim.",
      },
      {
        role: "user",
        content: `Create a plain-English reading guide for ${section.title} U.S.C. § ${section.section}, titled ${section.heading}. Official text follows:\n\n${section.officialText.join("\n\n").slice(0, 12_000)}`,
      },
    ],
    outputSchema: {
      name: "plain_english_guide",
      strict: true,
      schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          keyPoints: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
          watchFor: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
          trace: {
            type: "object",
            properties: {
              summaryParagraphs: { type: "array", items: { type: "integer" }, minItems: 1, maxItems: 3 },
              keyPointParagraphs: { type: "array", items: { type: "array", items: { type: "integer" }, minItems: 1, maxItems: 3 }, minItems: 2, maxItems: 5 },
              watchForParagraphs: { type: "array", items: { type: "array", items: { type: "integer" }, minItems: 1, maxItems: 3 }, minItems: 1, maxItems: 4 },
            },
            required: ["summaryParagraphs", "keyPointParagraphs", "watchForParagraphs"],
            additionalProperties: false,
          },
        },
        required: ["summary", "keyPoints", "watchFor", "trace"],
        additionalProperties: false,
      },
    },
  });

  const raw = response.choices[0]?.message.content;
  if (typeof raw !== "string") throw new Error("Plain-English guide returned no text");
  const parsed = JSON.parse(raw) as Omit<PlainEnglishGuide, "label" | "generated">;
  const guide = normalizePlainEnglishGuide(parsed, section.officialText);
  guideCache.set(key, guide);
  return guide;
}
