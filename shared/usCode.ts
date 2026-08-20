export type CodeTitle = {
  number: number;
  name: string;
  status?: "reserved";
};

export type PlainEnglishGuide = {
  label: "Plain-English guide — not legal advice";
  summary: string;
  keyPoints: string[];
  watchFor: string[];
  trace: {
    summaryParagraphs: number[];
    keyPointParagraphs: number[][];
    watchForParagraphs: number[][];
  };
  generated: boolean;
};

export type OfficialTableBlock = {
  type: "table";
  caption?: string;
  headers: string[];
  rows: string[][];
};

export type OfficialContentBlock =
  | { type: "paragraph"; text: string }
  | OfficialTableBlock;

export type CodeSection = {
  title: number;
  section: string;
  heading: string;
  officialText: string[];
  /** Ordered source blocks used to retain statutory tables in the reader. */
  officialBlocks?: OfficialContentBlock[];
  sourceUrl: string;
  sourceName: string;
  sourceStatus: "live official source" | "archived official source" | "verified local fallback" | "official source link";
  retrievedAt: string;
  plainEnglish?: PlainEnglishGuide;
};

export const US_CODE_TITLES: CodeTitle[] = [
  { number: 1, name: "General Provisions" },
  { number: 2, name: "The Congress" },
  { number: 3, name: "The President" },
  { number: 4, name: "Flag and Seal, Seat of Government, and the States" },
  { number: 5, name: "Government Organization and Employees" },
  { number: 6, name: "Domestic Security" },
  { number: 7, name: "Agriculture" },
  { number: 8, name: "Aliens and Nationality" },
  { number: 9, name: "Arbitration" },
  { number: 10, name: "Armed Forces" },
  { number: 11, name: "Bankruptcy" },
  { number: 12, name: "Banks and Banking" },
  { number: 13, name: "Census" },
  { number: 14, name: "Coast Guard" },
  { number: 15, name: "Commerce and Trade" },
  { number: 16, name: "Conservation" },
  { number: 17, name: "Copyrights" },
  { number: 18, name: "Crimes and Criminal Procedure" },
  { number: 19, name: "Customs Duties" },
  { number: 20, name: "Education" },
  { number: 21, name: "Food and Drugs" },
  { number: 22, name: "Foreign Relations and Intercourse" },
  { number: 23, name: "Highways" },
  { number: 24, name: "Hospitals and Asylums" },
  { number: 25, name: "Indians" },
  { number: 26, name: "Internal Revenue Code" },
  { number: 27, name: "Intoxicating Liquors" },
  { number: 28, name: "Judiciary and Judicial Procedure" },
  { number: 29, name: "Labor" },
  { number: 30, name: "Mineral Lands and Mining" },
  { number: 31, name: "Money and Finance" },
  { number: 32, name: "National Guard" },
  { number: 33, name: "Navigation and Navigable Waters" },
  { number: 34, name: "Crime Control and Law Enforcement" },
  { number: 35, name: "Patents" },
  { number: 36, name: "Patriotic and National Observances, Ceremonies, and Organizations" },
  { number: 37, name: "Pay and Allowances of the Uniformed Services" },
  { number: 38, name: "Veterans’ Benefits" },
  { number: 39, name: "Postal Service" },
  { number: 40, name: "Public Buildings, Property, and Works" },
  { number: 41, name: "Public Contracts" },
  { number: 42, name: "The Public Health and Welfare" },
  { number: 43, name: "Public Lands" },
  { number: 44, name: "Public Printing and Documents" },
  { number: 45, name: "Railroads" },
  { number: 46, name: "Shipping" },
  { number: 47, name: "Telecommunications" },
  { number: 48, name: "Territories and Insular Possessions" },
  { number: 49, name: "Transportation" },
  { number: 50, name: "War and National Defense" },
  { number: 51, name: "National and Commercial Space Programs" },
  { number: 52, name: "Voting and Election" },
  { number: 53, name: "Reserved", status: "reserved" },
  { number: 54, name: "National Park Service and Related Programs" },
];

export const titleLabel = (title: number) => {
  const record = US_CODE_TITLES.find(item => item.number === title);
  return record ? `Title ${record.number} — ${record.name}` : `Title ${title}`;
};
