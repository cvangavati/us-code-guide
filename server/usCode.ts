import type { CodeSection, OfficialContentBlock, OfficialTableBlock, PlainEnglishGuide } from "../shared/usCode";

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

function isSourceHistoryLine(line: string) {
  return /^(?:[;(]\s*)?(?:[A-Z][a-z]+\.?\s+\d{1,2},\s+\d{4},\s+ch\.|Pub\.\s*L\.|Act\s+of\s+[A-Z][a-z]+\s+\d{1,2},\s+\d{4}|§\d+(?:\([a-z0-9]+\))?,\s*[A-Z][a-z]+\.?\s+\d{1,2},\s*\d+\s+Stat\.)/i.test(line);
}

function trimEditorialMaterial(html: string) {
  const editorialStart = html.search(/(?:Editorial Notes|Historical and Revision Notes|References in Text|Prior Provisions|Codification|Effective Date|Short Title|\bDerivation\b|\bAmendments\b)/i);
  return editorialStart >= 0 ? html.slice(0, editorialStart) : html;
}

export function compactOfficialHtml(html: string) {
  const cleaned = trimEditorialMaterial(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?(p|div|h[1-6]|li|br|tr|section|article)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "");

  const rawLines = decodeHtml(cleaned)
    .split(/\n+/)
    .map(line => line.replace(/\s+/g, " ").trim());
  const editorialNotes = rawLines.findIndex(line => /(?:editorial notes|historical and revision notes|references in text|prior provisions|codification|effective date|short title|^derivation$|^amendments$)/i.test(line));
  const lines = (editorialNotes >= 0 ? rawLines.slice(0, editorialNotes) : rawLines)
    .filter(line => line.length > 20)
    .filter(line => !/^(home|search & browse|downloads|understanding the code)$/i.test(line))
    .filter(line => !isSourceHistoryLine(line));
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

function completePlainSentence(text: string) {
  const cleaned = text.replace(/^[\s;,:-]+|[\s;,:-]+$/g, "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "This line sets part of the rule for this section.";
  const withCapital = `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}`;
  return /[.!?]$/.test(withCapital) ? withCapital : `${withCapital}.`;
}

function managedEverydayWords(text: string) {
  return text
    .replace(/\bequivalent subdivision of a State or Territory\b/gi, "similar local government area in a state or territory")
    .replace(/\bfor purposes of this (?:chapter|subchapter|section)\b/gi, "when this part of the law uses")
    .replace(/\bshall not\b/gi, "is not allowed to")
    .replace(/\bmay not\b/gi, "is not allowed to")
    .replace(/\bshall\b/gi, "has to")
    .replace(/\bmust\b/gi, "has to")
    .replace(/\bmay\b/gi, "is allowed to")
    .replace(/\bunless\b/gi, "except when")
    .replace(/\bsubject to\b/gi, "limited by")
    .replace(/\bnotwithstanding\b/gi, "even if another rule says something different")
    .replace(/\bhas jurisdiction\b/gi, "can handle cases about")
    .replace(/\bpursuant to\b/gi, "under")
    .replace(/\bprior to\b/gi, "before")
    .replace(/\bsubsequent to\b/gi, "after")
    .replace(/\bcommence\b/gi, "start")
    .replace(/\bterminate\b/gi, "end")
    .replace(/\bobtain\b/gi, "get")
    .replace(/\bsubmit\b/gi, "send")
    .replace(/\bprovide\b/gi, "give")
    .replace(/\bthereof\b/gi, "of it")
    .replace(/\s+/g, " ")
    .trim();
}

function managedPracticalRuleExplanation(source: string) {
  if (/^Each agency (?:shall|must) make available to the public information/i.test(source)) {
    return "Federal agencies have to make the listed information available to the public.";
  }
  if (/^Each agency (?:shall|must) separately state and currently publish in the Federal Register/i.test(source)) {
    return "Federal agencies have to keep a current public notice in the Federal Register explaining where they work, how they operate, and where people can get information.";
  }
  if (/^Descriptions of (?:its|the) central and field organization/i.test(source)) {
    return "The public notice must explain where the agency operates, who people can contact, and how to get information.";
  }
  if (/^Statements of the general course and method/i.test(source)) {
    return "The public notice must explain how the agency makes decisions and what procedures people can use.";
  }
  if (/^Rules of procedure, descriptions of forms/i.test(source)) {
    return "The public notice must show the agency's procedures, available forms, and filing requirements.";
  }
  if (/^Substantive rules of general applicability/i.test(source)) {
    return "The public notice must include the agency's rules, policies, and general interpretations.";
  }
  if (/^Each amendment, revision, or repeal/i.test(source)) {
    return "Changes to those public materials must also be made public.";
  }
  if (/^Each agency.*make available for public inspection in an electronic format/i.test(source)) {
    return "Agencies have to put the listed materials online so the public can inspect them.";
  }
  if (/^In making any record available to a person/i.test(source)) {
    return "When possible, the agency has to give records in the format the requester asks for.";
  }
  if (/^In responding .* request for records/i.test(source)) {
    return "The agency has to make a reasonable effort to search electronic records without seriously disrupting its work.";
  }
  if (/^No agency .* advance payment of any fee/i.test(source)) {
    return "An agency generally cannot demand payment up front, except for unpaid past fees or a request expected to cost more than $250.";
  }
  if (source.length > 260) {
    if (/\bfee|charge\b/i.test(source)) return "This line sets detailed limits on when an agency can charge fees and when those charges must be reduced or waived.";
    if (/\brecords?\b/i.test(source)) return "This line sets detailed conditions for providing records, including timing, format, or exceptions.";
    if (/\bcourt\b/i.test(source)) return "This line explains how a court handles a dispute under this rule.";
    if (/\bagency\b/i.test(source)) return "This line gives agencies detailed duties, limits, or exceptions under this rule.";
  }
  return undefined;
}

function managedFallbackTranslation(source: string) {
  const normalized = source.replace(/\s+/g, " ").trim();
  const practicalRule = managedPracticalRuleExplanation(normalized);
  if (practicalRule) return practicalRule;
  const definition = normalized.match(/[“"]([^”"]+)[”"]\s+(includes|means)\s+([^.;]+)/i) ?? normalized.match(/\b(?:word|term)\s+([A-Za-z][A-Za-z -]{0,70})\s+(includes|means)\s+([^.;]+)/i);
  if (definition) {
    const [, term, verb, meaning] = definition;
    const plainMeaning = completePlainSentence(managedEverydayWords(meaning)).replace(/[.!?]$/, "");
    const embeddedMeaning = `${plainMeaning.charAt(0).toLowerCase()}${plainMeaning.slice(1)}`;
    return verb.toLowerCase() === "includes"
      ? `Here, “${term.trim()}” is used more broadly than its everyday label. It can cover ${embeddedMeaning}.`
      : `Here, “${term.trim()}” is given a special definition. It refers to ${embeddedMeaning}.`;
  }

  const plain = managedEverydayWords(normalized)
    .replace(/^\s*\(?[a-z0-9]+\)?\s*[.)-]\s*/i, "")
    .replace(/^there is hereby established\s+/i, "this law creates ")
    .replace(/^it shall be unlawful for\s+/i, "it is against the law for ")
    .replace(/^nothing in this (?:chapter|subchapter|section) shall be construed to\s+/i, "this part of the law does not ")
    .replace(/^the purpose of this (?:chapter|subchapter|section) is to\s+/i, "this part of the law is meant to ")
    .replace(/^the provisions of this (?:chapter|subchapter|section) apply to\s+/i, "the rules in this part apply to ")
    .replace(/^this (?:chapter|subchapter|section) applies to\s+/i, "this rule covers ");
  return `In everyday terms, ${completePlainSentence(plain)}`;
}

function containsLongSourcePhrase(source: string, explanation: string) {
  const sourceWords = source.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const explanationWords = explanation.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  if (sourceWords.length < 6 || explanationWords.length < 6) return false;
  const explanationText = ` ${explanationWords.join(" ")} `;
  for (let index = 0; index <= sourceWords.length - 6; index += 1) {
    if (explanationText.includes(` ${sourceWords.slice(index, index + 6).join(" ")} `)) return true;
  }
  return false;
}

export function normalizePlainEnglishGuide(
  raw: PlainEnglishGuideDraft,
  officialText: string[]
): PlainEnglishGuide {
  const total = officialText.length;
  const watchFor = raw.watchFor.slice(0, 4);
  const suppliedTrace = raw.trace;
  const watchForParagraphs = (suppliedTrace?.watchForParagraphs ?? []).map((values: number[]) => normalizeParagraphReferences(values, total));
  const keyPoints = officialText.map((sourceLine, index) => {
    const candidate = raw.keyPoints[index]?.trim();
    return candidate && !containsLongSourcePhrase(sourceLine, candidate)
      ? candidate
      : managedFallbackTranslation(sourceLine);
  });
  const needsQualifierFlag = officialText.some(containsStatutoryQualifier);
  const mentionsQualification = watchFor.some(item => /\b(condition|exception|definition|limit|unless|if|scope|not every)\b/i.test(item));
  if (needsQualifierFlag && !mentionsQualification) {
    watchFor.unshift("This section includes conditions, exceptions, or limits. Read the linked official paragraph before applying the general rule.");
    watchForParagraphs.unshift([officialText.findIndex(containsStatutoryQualifier) + 1 || 1]);
  }

  return {
    label: "Plain-English guide — not legal advice",
    summary: raw.summary && !containsLongSourcePhrase(officialText[0] ?? "", raw.summary)
      ? raw.summary
      : managedFallbackTranslation(officialText[0] ?? ""),
    keyPoints,
    watchFor,
    trace: {
      summaryParagraphs: normalizeParagraphReferences(suppliedTrace?.summaryParagraphs, total),
      keyPointParagraphs: keyPoints.map((_, index) => [index + 1]),
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
  const document = html.slice(start, next >= 0 ? next : undefined);
  const heading = document.match(/<!-- field-start:head -->([\s\S]*?)<!-- field-end:head -->/i)?.[1] ?? "";
  const statute = document.match(/<!-- field-start:statute -->([\s\S]*?)<!-- field-end:statute -->/i)?.[1] ?? document;
  return compactOfficialHtml(`${heading}\n${statute}`);
}

function sectionSourceFragment(html: string, title: number, section: string) {
  const marker = `<!-- documentid:${title}_${section}`;
  const start = html.indexOf(marker);
  if (start < 0) return html;
  const next = html.indexOf("<!-- documentid:", start + marker.length);
  return html.slice(start, next >= 0 ? next : undefined);
}

function cleanCellHtml(html: string) {
  return decodeHtml(html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
}

function extractTableBlock(tableHtml: string): OfficialTableBlock | undefined {
  const rows = Array.from(tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi))
    .map(row => Array.from(row[1].matchAll(/<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/gi)).map(cell => cleanCellHtml(cell[2])).filter(Boolean))
    .filter(row => row.length > 0);
  if (rows.length === 0) return undefined;
  const firstRow = tableHtml.match(/<tr\b[^>]*>([\s\S]*?)<\/tr>/i)?.[1] ?? "";
  const caption = tableHtml.match(/<caption\b[^>]*>([\s\S]*?)<\/caption>/i)?.[1];
  const hasHeaderCells = /<th\b/i.test(firstRow);
  return {
    type: "table",
    caption: caption ? cleanCellHtml(caption) : undefined,
    headers: hasHeaderCells ? rows[0] : [],
    rows: hasHeaderCells ? rows.slice(1) : rows,
  };
}

export function extractOfficialBlocks(html: string, title: number, section: string): OfficialContentBlock[] {
  const fragment = trimEditorialMaterial(sectionSourceFragment(html, title, section));
  const blocks: OfficialContentBlock[] = [];
  const tableMatcher = /<table\b[^>]*>[\s\S]*?<\/table>/gi;
  let cursor = 0;
  let tableMatch: RegExpExecArray | null;
  while ((tableMatch = tableMatcher.exec(fragment)) !== null) {
    compactOfficialHtml(fragment.slice(cursor, tableMatch.index)).forEach(text => blocks.push({ type: "paragraph", text }));
    const table = extractTableBlock(tableMatch[0]);
    if (table) blocks.push(table);
    cursor = tableMatch.index + tableMatch[0].length;
  }
  compactOfficialHtml(fragment.slice(cursor)).forEach(text => blocks.push({ type: "paragraph", text }));
  return blocks;
}

function sectionContentFromHtml(html: string, title: number, section: string) {
  const blocks = extractOfficialBlocks(html, title, section);
  const paragraphLines = blocks.filter((block): block is Extract<OfficialContentBlock, { type: "paragraph" }> => block.type === "paragraph").map(block => block.text);
  const fallbackLines = extractGovInfoSection(html, title, section);
  const readableLines = paragraphLines.length >= 2 ? paragraphLines : fallbackLines.length >= 2 ? fallbackLines : compactOfficialHtml(html);
  const { heading } = splitHeading(readableLines, title, section);
  const visibleBlocks = blocks.filter(block => block.type !== "paragraph" || block.text !== heading);
  const officialText = visibleBlocks.length > 0
    ? visibleBlocks.flatMap(block => block.type === "paragraph" ? [block.text] : [block.caption, ...block.headers, ...block.rows.flat()].filter((value): value is string => Boolean(value)))
    : splitHeading(readableLines, title, section).officialText;
  return { heading, officialText, officialBlocks: visibleBlocks.length > 0 ? visibleBlocks : undefined };
}

export type TitleSectionLink = { section: string; heading: string; chapter?: string };

export function extractGovInfoTitleIndex(html: string, title: number): TitleSectionLink[] {
  const matcher = new RegExp(`<!-- documentid:${title}_([A-Za-z0-9.-]+)[^>]*-->[\\s\\S]{0,900}?<h3[^>]*>([\\s\\S]*?)<\\/h3>`, "g");
  const unique = new Map<string, TitleSectionLink>();
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(html)) !== null) {
    const section = match[1];
    const heading = decodeHtml(match[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
      .replace(new RegExp(`^§?${section}\\.?\\s*`), "") || `Section ${section}`;
    const chapter = match[0].match(/itempath:[^\n]*\/(CHAPTER[^\n/]+)/i)?.[1]?.replace(/\s+/g, " ").trim();
    if (section && /^\d/.test(section) && !unique.has(section)) unique.set(section, { section, heading, chapter });
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
    const archiveHtml = await getGovInfoTitleHtml(title);
    const { heading, officialText, officialBlocks } = sectionContentFromHtml(archiveHtml, title, section);
    if (officialText.length < 1) return null;
    return {
      title,
      section,
      heading,
      officialText,
      officialBlocks,
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
    const sourceHtml = await response.text();
    const { heading, officialText, officialBlocks } = sectionContentFromHtml(sourceHtml, title, section);
    if (officialText.length < 1) throw new Error("OLRC response did not contain readable section text");
    const value: CodeSection = {
      title,
      section,
      heading,
      officialText,
      officialBlocks,
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

  const { invokeLLM } = await import("./_core/llm");
  const response = await invokeLLM({
    model: "gpt-5-mini",
    maxTokens: 5000,
    messages: [
      {
        role: "system",
        content: "You translate federal statutory text for an everyday American reader. You are not a lawyer and must not give advice, tell a reader what they should do, speculate, promise an outcome, or omit limiting language. Create one key point for every displayed source paragraph, in the same order, and tie each key point to its matching paragraph. Explain what the line does in ordinary life: who it affects, what happens, and any condition or exception. Use short everyday American English. Do not merely swap a few legal words, retain the source sentence structure, or reuse six or more consecutive source words. Keep names, numbers, defined terms, and limits accurate.",
      },
      {
        role: "user",
        content: `Create a plain-English reading guide for ${section.title} U.S.C. § ${section.section}, titled ${section.heading}. Return exactly ${section.officialText.length} key points—one practical explanation for each numbered source paragraph below, not a summary of only some lines. Official text follows:\n\n${section.officialText.map((paragraph, index) => `Source line ${index + 1}: ${paragraph}`).join("\n\n").slice(0, 12_000)}`,
      },
    ],
    outputSchema: {
      name: "plain_english_guide",
      strict: true,
      schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          keyPoints: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 45 },
          watchFor: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
          trace: {
            type: "object",
            properties: {
              summaryParagraphs: { type: "array", items: { type: "integer" }, minItems: 1, maxItems: 3 },
              keyPointParagraphs: { type: "array", items: { type: "array", items: { type: "integer" }, minItems: 1, maxItems: 3 }, minItems: 1, maxItems: 45 },
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
