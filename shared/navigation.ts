export type CodeTopic = {
  id: string;
  label: string;
  description: string;
  titles: number[];
  samples: Array<{ title: number; section: string; label: string }>;
};

export const CODE_TOPICS: CodeTopic[] = [
  { id: "daily-life", label: "Everyday life", description: "Rules that touch family, education, health, housing, and public places.", titles: [1, 20, 21, 24, 36, 42], samples: [{ title: 21, section: "301", label: "Food & drug law" }, { title: 42, section: "1983", label: "Civil rights claims" }] },
  { id: "work-money", label: "Work & money", description: "Federal employees, workplace rules, taxes, benefits, banking, and contracts.", titles: [5, 12, 26, 29, 31, 41], samples: [{ title: 5, section: "552", label: "Government records" }, { title: 26, section: "1", label: "Income tax" }, { title: 29, section: "206", label: "Minimum wage" }] },
  { id: "rights-government", label: "Rights & government", description: "Congress, the President, voting, courts, public records, and civil rights.", titles: [2, 3, 4, 5, 28, 42, 44, 52], samples: [{ title: 5, section: "552", label: "Freedom of Information Act" }, { title: 42, section: "1983", label: "Civil rights claims" }, { title: 52, section: "10301", label: "Voting rights" }] },
  { id: "safety-justice", label: "Safety & justice", description: "Criminal law, public safety, immigration, national security, and legal procedure.", titles: [6, 8, 18, 22, 34, 50], samples: [{ title: 18, section: "1030", label: "Computer fraud" }, { title: 18, section: "922", label: "Firearms" }, { title: 8, section: "1101", label: "Immigration definitions" }] },
  { id: "technology-ideas", label: "Technology & ideas", description: "Copyrights, patents, communications, commerce, and scientific work.", titles: [15, 17, 35, 47, 51], samples: [{ title: 17, section: "106", label: "Copyright rights" }, { title: 35, section: "101", label: "Patentable inventions" }, { title: 47, section: "230", label: "Online platforms" }] },
  { id: "land-travel", label: "Land, travel & places", description: "Roads, transportation, public land, parks, water, and territories.", titles: [23, 33, 40, 43, 46, 48, 49, 54], samples: [{ title: 23, section: "101", label: "Highways" }, { title: 49, section: "30101", label: "Motor vehicle safety" }, { title: 54, section: "100101", label: "National Park Service" }] },
  { id: "service-veterans", label: "Service & veterans", description: "The armed forces, National Guard, military pay, veterans, and the Coast Guard.", titles: [10, 14, 32, 37, 38], samples: [{ title: 10, section: "801", label: "Armed forces" }, { title: 38, section: "1110", label: "Veterans’ disability benefits" }] },
];

export type TitleSectionPreview = { section: string; label: string };

const EXTRA_TITLE_PREVIEWS: Record<number, TitleSectionPreview[]> = {
  1: [{ section: "1", label: "How to read federal laws" }],
  3: [{ section: "1", label: "Choosing presidential electors" }],
  4: [{ section: "1", label: "The U.S. flag" }],
  9: [{ section: "1", label: "Arbitration definitions" }],
  11: [{ section: "101", label: "Bankruptcy definitions" }],
  13: [{ section: "1", label: "Census definitions" }],
  14: [{ section: "101", label: "Coast Guard establishment" }],
  17: [{ section: "101", label: "Copyright definitions" }],
  32: [{ section: "101", label: "National Guard definitions" }],
  35: [{ section: "1", label: "Patent Office" }],
  39: [{ section: "101", label: "Postal policy" }],
  51: [{ section: "10101", label: "Space program definitions" }],
  52: [{ section: "10101", label: "Voting rights" }],
  54: [{ section: "100101", label: "National Park Service" }],
};

export function titleSectionPreviews(title: number): TitleSectionPreview[] {
  const topicSamples = CODE_TOPICS.flatMap(topic => topic.samples)
    .filter(sample => sample.title === title)
    .map(sample => ({ section: sample.section, label: sample.label }));
  return [...(EXTRA_TITLE_PREVIEWS[title] ?? []), ...topicSamples]
    .filter((preview, index, all) => all.findIndex(item => item.section === preview.section) === index)
    .slice(0, 2);
}

const TITLE_DESCRIPTIONS: Record<number, string> = {
  1: "Default definitions and rules for reading federal laws.",
  2: "How Congress is organized and operates.",
  3: "Authorities and duties of the President.",
  4: "The flag, the federal seat of government, and the states.",
  5: "Federal agencies, public employees, records, and benefits.",
  6: "Domestic security laws and programs.",
  7: "Farming, food production, and agriculture programs.",
  8: "Immigration, citizenship, and nationality.",
  9: "Arbitration and private dispute resolution.",
  10: "The U.S. armed forces and military law.",
  11: "Bankruptcy rules and procedures.",
  12: "Banks, credit, and the financial system.",
  13: "The national census and population statistics.",
  14: "The Coast Guard.",
  15: "Commerce, consumer markets, and antitrust.",
  16: "Conservation, wildlife, and natural resources.",
  17: "Copyright and creative works.",
  18: "Federal crimes, investigations, and criminal procedure.",
  19: "Customs duties and international trade at the border.",
  20: "Education and student programs.",
  21: "Food, drugs, medical products, and consumer health.",
  22: "Foreign relations and diplomatic matters.",
  23: "Federal highways and road safety.",
  24: "Hospitals and certain federal care facilities.",
  25: "Federal law concerning Native Americans and tribes.",
  26: "Federal income, payroll, and other internal taxes.",
  27: "Alcohol-related federal law.",
  28: "Federal courts, judges, and legal procedure.",
  29: "Workplace rights, wages, unions, and employee benefits.",
  30: "Mining and mineral lands.",
  31: "Federal money, budgeting, and public finance.",
  32: "The National Guard.",
  33: "Waterways, shipping channels, and navigation.",
  34: "Federal law enforcement and crime-control programs.",
  35: "Patents and inventions.",
  36: "National symbols, observances, and civic organizations.",
  37: "Military pay and allowances.",
  38: "Veterans’ benefits and services.",
  39: "The Postal Service.",
  40: "Federal buildings, property, and public works.",
  41: "Federal purchasing and contracts.",
  42: "Public health, welfare, social programs, and civil rights.",
  43: "Public land and land-use programs.",
  44: "Government publishing and public documents.",
  45: "Railroads.",
  46: "Shipping and maritime matters.",
  47: "Phones, broadcasting, and communications networks.",
  48: "U.S. territories and insular areas.",
  49: "Transportation systems and travel safety.",
  50: "National defense and wartime authorities.",
  51: "Civilian space programs and commercial space activity.",
  52: "Voting and elections.",
  53: "Reserved for future use.",
  54: "National parks and related federal lands.",
};

export function titleDescription(title: number) {
  return TITLE_DESCRIPTIONS[title] ?? "Federal law organized under this subject.";
}
