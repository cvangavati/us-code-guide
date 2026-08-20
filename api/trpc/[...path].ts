type VercelRequest = {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  statusCode: number;
  setHeader(name: string, value: string): void;
  removeHeader(name: string): void;
  end(body?: string): void;
};

type Citation = { title: number; section: string };
type OfficialBlock = { type: "paragraph"; text: string } | { type: "table"; caption?: string; headers: string[]; rows: string[][] };

const OLRC_VIEW_URL = "https://uscode.house.gov/view.xhtml";
const GOVINFO_ARCHIVE_YEAR = "2023";
const GOVINFO_CONTENT_URL = "https://www.govinfo.gov/content/pkg";
const securityHeaders: Record<string, string> = {
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin",
};

function responseEnvelope(data: unknown) {
  return { result: { data: { json: data } } };
}

function errorEnvelope(message: string) {
  return { error: { json: { message, code: -32600, data: { code: "BAD_REQUEST", httpStatus: 400 } } } };
}

function sendJson(res: VercelResponse, status: number, data: unknown) {
  Object.entries(securityHeaders).forEach(([name, value]) => res.setHeader(name, value));
  res.removeHeader("X-Powered-By");
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

function decodeHtml(input: string) {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&ldquo;/g, "“")
    .replace(/&rdquo;/g, "”")
    .replace(/&sect;/g, "§")
    .replace(/&#(\d+);/g, (_, value) => String.fromCodePoint(Number(value)))
    .replace(/&#x([0-9a-f]+);/gi, (_, value) => String.fromCodePoint(parseInt(value, 16)));
}

function isSourceHistoryLine(line: string) {
  return /^(?:[;(]\s*)?(?:[A-Z][a-z]+\.?\s+\d{1,2},\s+\d{4},\s+ch\.|Pub\.\s*L\.|Act\s+of\s+[A-Z][a-z]+\s+\d{1,2},\s+\d{4}|§\d+(?:\([a-z0-9]+\))?,\s*[A-Z][a-z]+\.?\s+\d{1,2},\s+\d{4},\s*\d+\s+Stat\.)/i.test(line);
}

function compactOfficialHtml(html: string) {
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
  return (editorialNotes >= 0 ? rawLines.slice(0, editorialNotes) : rawLines)
    .filter(line => line.length > 20)
    .filter(line => !/^(home|search & browse|downloads|understanding the code)$/i.test(line))
    .filter(line => !isSourceHistoryLine(line))
    .slice(0, 45);
}

function extractGovInfoSection(html: string, title: number, section: string) {
  const marker = `<!-- documentid:${title}_${section}`;
  const start = html.indexOf(marker);
  if (start < 0) return [];
  const next = html.indexOf("<!-- documentid:", start + marker.length);
  const document = html.slice(start, next >= 0 ? next : undefined);
  const heading = document.match(/<!-- field-start:head -->([\s\S]*?)<!-- field-end:head -->/i)?.[1] ?? "";
  const statute = document.match(/<!-- field-start:statute -->([\s\S]*?)<!-- field-end:statute -->/i)?.[1] ?? document;
  return compactOfficialHtml(`${heading}\n${statute}`);
}

function sectionFragment(html: string, title: number, section: string) {
  const marker = `<!-- documentid:${title}_${section}`;
  const start = html.indexOf(marker);
  if (start < 0) return html;
  const next = html.indexOf("<!-- documentid:", start + marker.length);
  return html.slice(start, next >= 0 ? next : undefined);
}

function cleanCell(html: string) {
  return decodeHtml(html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
}

function sourceBlocks(html: string, title: number, section: string): OfficialBlock[] {
  const fragment = sectionFragment(html, title, section);
  const blocks: OfficialBlock[] = [];
  const tableMatcher = /<table\b[^>]*>[\s\S]*?<\/table>/gi;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = tableMatcher.exec(fragment)) !== null) {
    compactOfficialHtml(fragment.slice(cursor, match.index)).forEach(text => blocks.push({ type: "paragraph", text }));
    const rows = Array.from(match[0].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi))
      .map(row => Array.from(row[1].matchAll(/<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/gi)).map(cell => cleanCell(cell[2])).filter(Boolean))
      .filter(row => row.length > 0);
    if (rows.length > 0) {
      const firstRow = match[0].match(/<tr\b[^>]*>([\s\S]*?)<\/tr>/i)?.[1] ?? "";
      const caption = match[0].match(/<caption\b[^>]*>([\s\S]*?)<\/caption>/i)?.[1];
      const headers = /<th\b/i.test(firstRow) ? rows[0] : [];
      blocks.push({ type: "table", caption: caption ? cleanCell(caption) : undefined, headers, rows: headers.length > 0 ? rows.slice(1) : rows });
    }
    cursor = match.index + match[0].length;
  }
  compactOfficialHtml(fragment.slice(cursor)).forEach(text => blocks.push({ type: "paragraph", text }));
  return blocks;
}

function splitHeading(lines: string[], title: number, section: string) {
  const headingIndex = lines.findIndex(line => line.includes(`§${section}`) || line.includes(`USC ${section}:`));
  return {
    heading: headingIndex >= 0 ? lines[headingIndex] : `${title} U.S.C. § ${section}`,
    officialText: lines.filter((_, index) => index !== headingIndex),
  };
}

function officialSectionUrl(title: number, section: string) {
  const granuleId = `USC-prelim-title${title}-section${section}`;
  return `${OLRC_VIEW_URL}?req=granuleid:${encodeURIComponent(granuleId)}&num=0&edition=prelim`;
}

function govInfoTitleUrl(title: number) {
  return `${GOVINFO_CONTENT_URL}/USCODE-${GOVINFO_ARCHIVE_YEAR}-title${title}/html/USCODE-${GOVINFO_ARCHIVE_YEAR}-title${title}.htm`;
}

function extractGovInfoTitleIndex(html: string, title: number) {
  const matcher = new RegExp(`<!-- documentid:${title}_([A-Za-z0-9.-]+)[^>]*-->[\\s\\S]{0,900}?<h3[^>]*>([\\s\\S]*?)<\\/h3>`, "g");
  const unique = new Map<string, { section: string; heading: string; chapter?: string }>();
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

async function getTitleSectionIndex(title: number) {
  try {
    const response = await fetch(govInfoTitleUrl(title));
    if (!response.ok) return [];
    return extractGovInfoTitleIndex(await response.text(), title);
  } catch {
    return [];
  }
}

async function getOfficialSection({ title, section }: Citation) {
  const sourceUrl = officialSectionUrl(title, section);
  try {
    const sourceResponse = await fetch(sourceUrl, { headers: { "User-Agent": "Peoples-US-Code-Guide/1.0" } });
    if (!sourceResponse.ok) throw new Error("Official source request failed");
    const sourceHtml = await sourceResponse.text();
    const blocks = sourceBlocks(sourceHtml, title, section);
    const extracted = blocks.filter((block): block is Extract<OfficialBlock, { type: "paragraph" }> => block.type === "paragraph").map(block => block.text);
    const readable = extracted.length >= 2 ? extracted : extractGovInfoSection(sourceHtml, title, section).length >= 2 ? extractGovInfoSection(sourceHtml, title, section) : compactOfficialHtml(sourceHtml);
    if (readable.length < 2) throw new Error("Official source did not contain readable section text");
    const { heading } = splitHeading(readable, title, section);
    const officialBlocks = blocks.filter(block => block.type !== "paragraph" || block.text !== heading);
    const officialText = officialBlocks.flatMap(block => block.type === "paragraph" ? [block.text] : [block.caption, ...block.headers, ...block.rows.flat()].filter((value): value is string => Boolean(value)));
    return {
      title,
      section,
      heading,
      officialText: officialText.length > 0 ? officialText : splitHeading(readable, title, section).officialText,
      officialBlocks: officialBlocks.length > 0 ? officialBlocks : undefined,
      sourceUrl,
      sourceName: "Office of the Law Revision Counsel, U.S. House of Representatives",
      sourceStatus: "live official source",
      retrievedAt: new Date().toISOString(),
    };
  } catch {
    try {
      const archiveUrl = govInfoTitleUrl(title);
      const archiveResponse = await fetch(archiveUrl);
      if (!archiveResponse.ok) throw new Error("Archive request failed");
      const archiveHtml = await archiveResponse.text();
      const archiveBlocks = sourceBlocks(archiveHtml, title, section);
      const lines = archiveBlocks.filter((block): block is Extract<OfficialBlock, { type: "paragraph" }> => block.type === "paragraph").map(block => block.text);
      const readable = lines.length >= 2 ? lines : extractGovInfoSection(archiveHtml, title, section);
      if (readable.length < 2) throw new Error("Archive did not contain this section");
      const { heading } = splitHeading(readable, title, section);
      const officialBlocks = archiveBlocks.filter(block => block.type !== "paragraph" || block.text !== heading);
      const officialText = officialBlocks.flatMap(block => block.type === "paragraph" ? [block.text] : [block.caption, ...block.headers, ...block.rows.flat()].filter((value): value is string => Boolean(value)));
      return {
        title,
        section,
        heading,
        officialText: officialText.length > 0 ? officialText : splitHeading(readable, title, section).officialText,
        officialBlocks: officialBlocks.length > 0 ? officialBlocks : undefined,
        sourceUrl: archiveUrl,
        sourceName: `U.S. Government Publishing Office (GovInfo), ${GOVINFO_ARCHIVE_YEAR} title edition`,
        sourceStatus: "archived official source",
        retrievedAt: new Date().toISOString(),
      };
    } catch {
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
}

function readBatchInput(requestUrl: URL, index: number, requestBody?: unknown) {
  const raw = requestBody ?? requestUrl.searchParams.get("input");
  if (!raw) return undefined;
  const parsed = typeof raw === "string" ? JSON.parse(raw) as Record<string, { json?: unknown }> : raw as Record<string, { json?: unknown }>;
  return parsed[String(index)]?.json;
}

function parseCitation(value: unknown): Citation {
  const raw = value as { title?: unknown; section?: unknown } | undefined;
  const title = Number(raw?.title);
  const section = String(raw?.section ?? "").trim();
  if (!Number.isInteger(title) || title < 1 || title > 54 || !/^[0-9A-Za-z.-]{1,64}$/.test(section)) {
    throw new Error("A valid U.S. Code title and section are required.");
  }
  return { title, section };
}

function sourceSentences(paragraphs: string[]) {
  return paragraphs.flatMap(paragraph => paragraph.match(/[^.!?]+(?:[.!?]+|$)/g)?.map(sentence => sentence.replace(/\s+/g, " ").trim()).filter(Boolean) ?? []);
}

function shortenSource(sentence: string, limit = 220) {
  return sentence.length <= limit ? sentence : `${sentence.slice(0, limit - 1).trimEnd()}…`;
}

function everydayWords(text: string) {
  return text
    .replace(/\bequivalent subdivision of a State or Territory\b/gi, "similar local government area in a state or territory")
    .replace(/\bshall not\b/gi, "is not allowed to")
    .replace(/\bmay not\b/gi, "is not allowed to")
    .replace(/\bshall\b/gi, "has to")
    .replace(/\bmust\b/gi, "has to")
    .replace(/\bmay\b/gi, "is allowed to")
    .replace(/\bunless\b/gi, "except when")
    .replace(/\bsubject to\b/gi, "limited by")
    .replace(/\bnotwithstanding\b/gi, "even if another rule says something different")
    .replace(/\bperson or entity\b/gi, "person or organization")
    .replace(/\bthereof\b/gi, "of it")
    .replace(/\s+/g, " ")
    .trim();
}

function explainLine(source: string) {
  const normalized = source.replace(/\s+/g, " ").trim();
  if (/^In determining the meaning of any Act of Congress, except when the context indicates otherwise/i.test(normalized)) {
    return "These are default rules for reading federal laws. A particular law can use a word differently when its own wording makes that clear.";
  }
  if (/words importing the singular include and apply to several/i.test(normalized)) {
    return "A word written as one thing can also mean more than one person, group, or thing.";
  }
  if (/words importing the plural include the singular/i.test(normalized)) {
    return "A word written as more than one can also mean just one.";
  }
  if (/words importing the masculine gender include the feminine/i.test(normalized)) {
    return "Words written as male also cover women.";
  }
  if (/words used in the present tense include the future/i.test(normalized)) {
    return "A word written in the present tense can also cover the future.";
  }
  if (/the words? [“"]insane[”"] and [“"]insane person[”"]/i.test(normalized)) {
    return "This old sentence uses several outdated labels for people with serious mental incapacity.";
  }
  if (/the words? [“"]person[”"] and [“"]whoever[”"] include corporations/i.test(normalized)) {
    return "The words “person” and “whoever” can mean a business or group, not only a human being.";
  }
  if (/^[“"]officer[”"] includes?/i.test(normalized)) {
    return "“Officer” can also mean someone the law allows to do the job’s duties.";
  }
  if (/^[“"]subscription[”"] includes?/i.test(normalized)) {
    return "“Subscription” can also mean a mark someone meant to use as a signature.";
  }
  if (/^[“"]oath[”"] includes?/i.test(normalized)) {
    return "An “oath” can also be a nonreligious promise, and “sworn” can also mean that promise was made.";
  }
  if (/^[“"]writing[”"] includes?/i.test(normalized)) {
    return "“Writing” can include printed, typed, copied, photographed, or other visual text.";
  }
  const definition = source.match(/[“"]([^”"]+)[”"]\s+(includes|means)\s+([^.;]+)/i) ?? source.match(/\b(?:word|term)\s+([A-Za-z][A-Za-z -]{0,70})\s+(includes|means)\s+([^.;]+)/i);
  if (definition) {
    const [, term, verb, meaning] = definition;
    const plainMeaning = everydayWords(meaning);
    return verb.toLowerCase() === "includes"
      ? `“${term.trim()}” also covers ${plainMeaning}.`
      : `“${term.trim()}” means ${plainMeaning}.`;
  }
  return everydayWords(shortenSource(source, 240));
}

export function sourceGroundedGuide(section: { heading: string; officialText: string[]; officialBlocks?: OfficialBlock[] }) {
  const paragraphs = section.officialText.filter(Boolean);
  const sentences = sourceSentences(paragraphs);
  const firstLine = paragraphs[0] ?? `This section addresses ${section.heading}.`;
  const conditionalSentence = sentences.find(sentence => /\b(unless|except|if|only if|subject to|provided that|notwithstanding)\b/i.test(sentence));
  const conditionalLine = Math.max(1, paragraphs.findIndex(paragraph => conditionalSentence ? paragraph.includes(conditionalSentence) : false) + 1);
  const table = section.officialBlocks?.find(block => block.type === "table");
  const keyPoints = paragraphs.map((paragraph, index) => `Line ${index + 1}: ${explainLine(paragraph)}`);

  if (table) {
    const headerWords = table.headers.slice(0, 3).join("; ");
    keyPoints.push(`Table: ${headerWords ? `the headings “${headerWords}” show what each column is about` : "the rows and columns organize the listed information"}.`);
  }
  if (keyPoints.length < 2) keyPoints.push("This is the only displayed line in this section.");

  const watchFor = conditionalSentence
    ? [`One line adds a limit: ${explainLine(conditionalSentence)}`, "This version explains the words in this section. It does not decide a personal legal question."]
    : ["Another section of the Code can give a word a different meaning.", "This version explains the words in this section. It does not decide a personal legal question."];

  return {
    label: "Plain-English guide — not legal advice" as const,
    summary: explainLine(firstLine),
    keyPoints,
    watchFor,
    trace: {
      summaryParagraphs: [1],
      keyPointParagraphs: keyPoints.map((_, index) => [Math.min(index + 1, Math.max(1, paragraphs.length))]),
      watchForParagraphs: [conditionalSentence ? [conditionalLine] : [1], [1]],
    },
    generated: true,
  };
}

async function executeProcedure(name: string, input: unknown) {
  const procedure = name.split(".").at(-1);
  if (procedure === "section") return responseEnvelope(await getOfficialSection(parseCitation(input)));
  if (procedure === "titleSections") return responseEnvelope(await getTitleSectionIndex(parseCitation({ ...(input as object), section: "1" }).title));
  if (procedure === "titles") return responseEnvelope([]);
  if (procedure === "explain") {
    const section = await getOfficialSection(parseCitation(input));
    if (section.officialText.length === 0) return errorEnvelope("Official text is unavailable for a reading guide.");
    return responseEnvelope(sourceGroundedGuide(section));
  }
  return errorEnvelope("This public Vercel reader endpoint supports official section retrieval only.");
}

/**
 * Self-contained Vercel Node handler. It intentionally has no project-module
 * imports so Vercel does not leave an unresolved runtime dependency beside the
 * compiled API function.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET" && req.method !== "POST") {
      sendJson(res, 405, [errorEnvelope("Only GET and POST requests are supported by the public reader API.")]);
      return;
    }
    const requestUrl = new URL(req.url ?? "/", `https://${req.headers.host ?? "localhost"}`);
    const names = requestUrl.pathname.split("/").filter(Boolean).at(-1)?.split(",") ?? [];
    let requestBody: unknown;
    if (req.method === "POST") {
      const chunks: Uint8Array[] = [];
      for await (const chunk of req as unknown as AsyncIterable<Uint8Array>) chunks.push(chunk);
      const text = new TextDecoder().decode(Uint8Array.from(chunks.flatMap(chunk => Array.from(chunk))));
      requestBody = text ? JSON.parse(text) : undefined;
    }
    const batch = await Promise.all(names.map((name, index) => executeProcedure(name, readBatchInput(requestUrl, index, requestBody))));
    sendJson(res, 200, batch);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "The requested public reader data could not be loaded.";
    sendJson(res, 400, [errorEnvelope(message)]);
  }
}
