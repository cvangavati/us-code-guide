export type ReaderMode = "official" | "guide";
export type ReaderCitation = { title: number; section: string };

export function parseUSCodeCitation(value: string) {
  const match = value.trim().match(/^(?:title\s*)?(\d{1,2})(?:\s*(?:u\.?s\.?c\.?|usc|§|section)\s*|\s+)([\w.-]+)$/i);
  if (!match) return null;
  const title = Number(match[1]);
  if (title < 1 || title > 54) return null;
  return { title, section: match[2] };
}

export function readerPath(title: number, section: string) {
  return `/read/${title}/${section}`;
}

export function selectTitleForReader(title: number): ReaderCitation {
  return { title, section: "1" };
}

export function selectSectionForReader(title: number, section: string): ReaderCitation {
  return { title, section };
}

export function setReaderMode(mode: ReaderMode): ReaderMode {
  return mode;
}
