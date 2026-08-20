import { trpc } from "@/lib/trpc";
import { parseUSCodeCitation, readerPath, selectSectionForReader, selectTitleForReader, setReaderMode } from "@shared/citation";
import { US_CODE_TITLES, type CodeSection, type PlainEnglishGuide } from "@shared/usCode";
import { ArrowUpRight, BookOpenText, ChevronRight, ExternalLink, FileText, Info, LoaderCircle, Menu, Search, ShieldCheck, Sparkles, X } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";

const fallbackSection: CodeSection = {
  title: 1,
  section: "1",
  heading: "Words denoting number, gender, and so forth",
  officialText: [
    "In determining the meaning of any Act of Congress, unless the context indicates otherwise—",
    "words importing the singular include and apply to several persons, parties, or things; words importing the plural include the singular; and words importing the masculine gender include the feminine as well;",
    "words used in the present tense include the future as well as the present;",
    "the words \"person\" and \"whoever\" include corporations, companies, associations, firms, partnerships, societies, and joint stock companies, as well as individuals;",
    "\"signature\" or \"subscription\" includes a mark when the person making the same intended it as such; and \"oath\" includes affirmation, and \"sworn\" includes affirmed.",
  ],
  sourceUrl: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title1-section1&num=0&edition=prelim",
  sourceName: "Office of the Law Revision Counsel, U.S. House of Representatives",
  sourceStatus: "verified local fallback",
  retrievedAt: "2026-08-20T00:00:00.000Z",
  plainEnglish: {
    label: "Plain-English guide — not legal advice",
    summary: "This is a default rule for reading federal laws. Unless a particular law says something different, common words should be read broadly rather than narrowly.",
    keyPoints: [
      "A singular word can cover more than one person or thing, and a plural word can cover one.",
      "Words that use masculine grammar are not limited to men.",
      "Terms such as ‘person,’ ‘signature,’ and ‘oath’ can have broader legal meanings than everyday speech suggests.",
    ],
    watchFor: [
      "A specific law can supply its own definition or show a different meaning from context.",
      "This guide is a reading aid, not advice about any particular situation.",
    ],
    trace: {
      summaryParagraphs: [1],
      keyPointParagraphs: [[2], [2], [4, 5]],
      watchForParagraphs: [[1], [1]],
    },
    generated: false,
  },
};

const commonStartingPoints = [
  { title: 5, section: "552", label: "Government records", citation: "5 U.S.C. § 552" },
  { title: 17, section: "106", label: "Copyright basics", citation: "17 U.S.C. § 106" },
  { title: 18, section: "1030", label: "Computer fraud", citation: "18 U.S.C. § 1030" },
  { title: 26, section: "1", label: "Income tax", citation: "26 U.S.C. § 1" },
  { title: 42, section: "1983", label: "Civil rights claims", citation: "42 U.S.C. § 1983" },
];

function formatUpdated(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.valueOf()) ? "checked just now" : `checked ${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

function TraceLink({ paragraphs }: { paragraphs: number[] }) {
  const label = paragraphs.map(value => `¶${value}`).join(" · ");
  return <a href={`#official-${paragraphs[0]}`} className="law-mono mt-2 inline-flex text-[9px] uppercase tracking-[0.08em] text-[#4e7759] underline decoration-[#89aa8c] underline-offset-2 transition hover:text-[#163b26]">See official {label}</a>;
}

function ReadingPanel({ section, guide, view, fontSize, density }: { section: CodeSection; guide?: PlainEnglishGuide; view: "official" | "guide" | "both"; fontSize: number; density: "comfortable" | "compact" }) {
  const isMissing = section.officialText.length === 0;
  const readerPadding = density === "compact" ? "px-5 py-5 sm:px-6 lg:px-7 lg:py-7" : "px-5 py-6 sm:px-7 lg:px-9 lg:py-10";
  const officialPanel = (
    <article className={`min-w-0 bg-[#f9f5e8] ${readerPadding}`} style={{ fontSize: `${fontSize}rem` }}>
      <div className="mb-8 flex items-start justify-between gap-4 border-b border-[#d6cfbb] pb-5">
        <div>
          <p className="law-mono text-[10px] tracking-[0.14em] text-[#6e6657]">THE STATUTE</p>
          <h2 className="law-serif mt-2 text-[1.65rem] leading-tight text-[#201f1b]">Official language</h2>
        </div>
        <FileText className="mt-1 h-5 w-5 text-[#786f60]" aria-hidden="true" />
      </div>
      {isMissing ? (
        <div className="rounded-xl border border-dashed border-[#bcb19b] bg-[#fdf9ef] p-5 text-sm leading-6 text-[#5f594e]">
          This section could not be retrieved right now. The official reader remains available through the source link above.
        </div>
      ) : (
        <div className="law-serif space-y-5 text-[1.1rem] leading-8 text-[#37332c] sm:text-[1.18rem]">
          {section.officialText.map((paragraph, index) => <p id={`official-${index + 1}`} className="scroll-mt-5" key={`${paragraph.slice(0, 16)}-${index}`}><span className="law-mono mr-2 text-[9px] text-[#948a77]">¶{index + 1}</span>{paragraph}</p>)}
        </div>
      )}
    </article>
  );

  const guidePanel = (
    <article className={`min-w-0 bg-[#e8f0e8] ${readerPadding}`} style={{ fontSize: `${fontSize}rem` }}>
      <div className="mb-8 flex items-start justify-between gap-4 border-b border-[#c3d2c4] pb-5">
        <div>
          <p className="law-mono text-[10px] tracking-[0.14em] text-[#416149]">THE READING GUIDE</p>
          <h2 className="law-serif mt-2 text-[1.65rem] leading-tight text-[#163b26]">In plain English</h2>
        </div>
        <Sparkles className="mt-1 h-5 w-5 text-[#416149]" aria-hidden="true" />
      </div>
      {guide ? (
        <div className="space-y-7 text-[#21492e]">
          <div>
            <p className="law-mono mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-[#4f755a]">What this is saying</p>
            <p className="law-serif text-[1.2rem] leading-8">{guide.summary}</p><TraceLink paragraphs={guide.trace.summaryParagraphs} />
          </div>
          <div>
            <p className="law-mono mb-3 text-[10px] font-medium uppercase tracking-[0.12em] text-[#4f755a]">The key points</p>
            <ol className="space-y-3">
              {guide.keyPoints.map((point, index) => <li className="flex gap-3 text-[0.95rem] leading-6" key={point}><span className="law-mono mt-0.5 text-xs text-[#668a6d]">0{index + 1}</span><span>{point}<TraceLink paragraphs={guide.trace.keyPointParagraphs[index] ?? [1]} /></span></li>)}
            </ol>
          </div>
          <div className="rounded-xl border border-[#bed0bf] bg-[#f1f6ef]/80 p-4">
            <p className="law-mono mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-[#416149]">Keep in mind</p>
            <ul className="space-y-2 text-sm leading-6 text-[#31533a]">
              {guide.watchFor.map((item, index) => <li className="flex gap-2" key={item}><span aria-hidden="true">—</span><span>{item}<TraceLink paragraphs={guide.trace.watchForParagraphs[index] ?? [1]} /></span></li>)}
            </ul>
          </div>
          <p className="border-t border-[#c3d2c4] pt-5 text-xs leading-5 text-[#507259]">{guide.label}{guide.generated ? ". Generated from the displayed statutory text; review the official language before relying on it." : "."}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[#9cbba2] bg-[#f2f6f0] p-5 text-sm leading-6 text-[#42664a]">Choose “make a plain-English guide” to create a brief, clearly labeled reading aid for this displayed section.</div>
      )}
    </article>
  );

  if (view === "official") return officialPanel;
  if (view === "guide") return guidePanel;
  return <div className="grid min-w-0 divide-y divide-[#d6cfbb] lg:grid-cols-2 lg:divide-x lg:divide-y-0">{officialPanel}{guidePanel}</div>;
}

export default function Home() {
  const [, params] = useRoute("/read/:title/:section");
  const [, setLocation] = useLocation();
  const startTitle = Number(params?.title) || 1;
  const startSection = params?.section || "1";
  const [citation, setCitation] = useState({ title: startTitle, section: startSection });
  const [query, setQuery] = useState("");
  const [citationEntry, setCitationEntry] = useState(`${startTitle} USC ${startSection}`);
  const [citationError, setCitationError] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"official" | "guide">("official");
  const [fontSize, setFontSize] = useState(1);
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const input = useMemo(() => ({ title: citation.title, section: citation.section }), [citation.title, citation.section]);
  const sectionQuery = trpc.usCode.section.useQuery(input, { staleTime: 10 * 60_000, retry: 1 });
  const titleSections = trpc.usCode.titleSections.useQuery({ title: citation.title }, { staleTime: 10 * 60_000, retry: 1, enabled: !sectionQuery.isFetching });
  const explain = trpc.usCode.explain.useMutation();
  const liveSection = sectionQuery.data ?? (citation.title === 1 && citation.section === "1" ? fallbackSection : undefined);
  const guide = explain.data ?? liveSection?.plainEnglish;
  const availableTitles = US_CODE_TITLES.filter(title => `${title.number} ${title.name}`.toLowerCase().includes(query.toLowerCase()));

  const moveToCitation = (next: { title: number; section: string }) => {
    if (next.title < 1 || next.title > 54) return;
    setCitation(next);
    setCitationEntry(`${next.title} USC ${next.section}`);
    setLocation(readerPath(next.title, next.section));
    setMobileOpen(false);
  };

  const submitCitation = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = parseUSCodeCitation(citationEntry);
    if (!parsed) {
      setCitationError("Try a citation like “18 USC 1030” or “1 § 1.”");
      return;
    }
    setCitationError("");
    moveToCitation(parsed);
  };

  return (
    <div className="min-h-screen bg-[#f5f0df] text-[#201f1b]">
      <header className="border-b border-white/10 bg-[#0b1010] text-[#f4f0e5]">
        <div className="mx-auto flex max-w-[1540px] items-center justify-between px-5 py-4 sm:px-7 lg:px-10">
          <a href="/" className="group flex items-center gap-3" aria-label="The People’s U.S. Code Guide home">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#9ab69b]/60 text-[#c8e1c7]"><BookOpenText className="h-4 w-4" /></span>
            <span><span className="law-serif block text-lg leading-none tracking-tight">The People’s Code</span><span className="law-mono mt-1 block text-[9px] uppercase tracking-[0.15em] text-[#9ba8a2]">United States Code, made legible</span></span>
          </a>
          <div className="hidden items-center gap-7 text-xs text-[#b9c4bd] md:flex"><a href="#reader" className="transition-colors hover:text-white">Start reading</a><a href="#how-it-works" className="transition-colors hover:text-white">How it works</a><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#b9dfb5]" />Official-source first</span></div>
          <button className="rounded-full border border-white/15 p-2 text-[#e9eee8] md:hidden" onClick={() => setMobileOpen(open => !open)} aria-label="Toggle navigation">{mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}</button>
        </div>
        {mobileOpen && <div className="border-t border-white/10 px-5 py-4 text-sm text-[#cfd6d0] md:hidden"><a onClick={() => setMobileOpen(false)} href="#reader" className="block py-2">Start reading</a><a onClick={() => setMobileOpen(false)} href="#how-it-works" className="block py-2">How it works</a></div>}
      </header>

      <main>
        <section className="relative overflow-hidden bg-[#0b1010] pb-14 pt-10 text-[#f4f0e5] sm:pb-20 sm:pt-16">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 78% 15%, rgba(126, 173, 130, .35), transparent 21%), radial-gradient(circle at 92% 84%, rgba(178, 136, 91, .2), transparent 22%)" }} />
          <div className="relative mx-auto max-w-[1540px] px-5 sm:px-7 lg:px-10">
            <p className="law-mono mb-6 text-[10px] uppercase tracking-[0.18em] text-[#b8cdb8]">A public reading room for federal law</p>
            <div className="grid items-end gap-9 lg:grid-cols-[minmax(0,1fr)_330px]">
              <div><h1 className="law-serif max-w-4xl text-[clamp(3.1rem,7vw,6.9rem)] leading-[0.88] tracking-[-0.055em]">The law,<br /><em className="font-normal text-[#b9d9b6]">with the fog lifted.</em></h1><p className="mt-7 max-w-xl text-base leading-7 text-[#c4cec6]">Read the actual U.S. Code beside a restrained, plain-English guide. One section at a time—so your attention and your browser both get a break.</p></div>
              <aside className="border-l border-[#607363] pl-5 text-sm leading-6 text-[#b6c1b8]"><p className="law-mono mb-3 text-[10px] uppercase tracking-[0.12em] text-[#d1decf]">What stays clear</p><p>The original words stay visible. The guide never replaces them. Citations always lead back to the official source.</p></aside>
            </div>
          </div>
        </section>

        <section id="reader" className="mx-auto max-w-[1540px] px-5 py-7 sm:px-7 sm:py-10 lg:px-10">
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><p className="law-mono text-[10px] uppercase tracking-[0.15em] text-[#697269]">Open the reader</p><h2 className="law-serif mt-1 text-3xl tracking-[-0.03em] sm:text-4xl">Find a section. Read both versions.</h2></div>
            <div className="flex items-center gap-2 text-xs text-[#596158]"><ShieldCheck className="h-4 w-4 text-[#38664a]" />No giant document downloads</div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#d3cbb7] bg-[#fcf9f0] shadow-[0_20px_60px_rgba(55,46,28,.12)]">
            <div className="grid border-b border-[#d8d0bc] lg:grid-cols-[300px_minmax(0,1fr)]">
              <aside className="hidden border-r border-[#d8d0bc] bg-[#f1ebdc] lg:block">
                <div className="border-b border-[#d8d0bc] px-5 py-5"><label htmlFor="title-filter" className="law-mono mb-2 block text-[10px] uppercase tracking-[0.14em] text-[#6d675c]">Browse titles</label><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777064]" /><input id="title-filter" value={query} onChange={event => setQuery(event.target.value)} placeholder="Filter 54 titles" className="h-10 w-full rounded-lg border border-[#d4cbb5] bg-[#faf7ef] pl-9 pr-3 text-sm outline-none transition focus:border-[#4c7757] focus:ring-2 focus:ring-[#b8d7bc]" /></div></div>
                <div className="reader-scrollbar max-h-[680px] overflow-y-auto px-2 py-2">{availableTitles.map(title => <button onClick={() => moveToCitation(selectTitleForReader(title.number))} className={`group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition ${citation.title === title.number ? "bg-[#dcead9] text-[#1d4f2c]" : "text-[#49473f] hover:bg-[#e7e1d2]"}`} key={title.number}><span className="law-mono text-[11px] text-[#847b6b]">{String(title.number).padStart(2, "0")}</span><span className="min-w-0 flex-1 text-sm leading-4">{title.name}</span><ChevronRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" /></button>)}</div>
              </aside>

              <div className="min-w-0">
                <div className="border-b border-[#d8d0bc] px-5 py-5 sm:px-7"><form onSubmit={submitCitation} className="flex flex-col gap-2 sm:flex-row"><label htmlFor="citation" className="sr-only">U.S. Code citation</label><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777064]" /><input id="citation" value={citationEntry} onChange={event => setCitationEntry(event.target.value)} placeholder="Try 18 USC 1030" className="h-11 w-full rounded-lg border border-[#cfc4ad] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#3b704c] focus:ring-2 focus:ring-[#b8d7bc]" /></div><button className="h-11 rounded-lg bg-[#1e5231] px-5 text-sm font-medium text-white transition hover:bg-[#173e26] active:scale-[.98]">Read this section</button></form>{citationError && <p role="alert" className="mt-2 text-xs text-[#a5392f]">{citationError}</p>}</div>

                <div className="border-b border-[#d8d0bc] bg-[#f7f2e6] px-5 py-3 sm:px-7"><div className="flex items-baseline justify-between gap-4"><p className="law-mono text-[10px] uppercase tracking-[0.12em] text-[#687166]">Sections in this title</p><span className="text-[11px] text-[#797165]">{titleSections.isFetching ? "finding section links…" : "choose a section"}</span></div>{titleSections.data && titleSections.data.length > 0 ? <div className="mt-2 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-1">{titleSections.data.slice(0, 18).map(item => <button onClick={() => moveToCitation(selectSectionForReader(citation.title, item.section))} title={`§${item.section}. ${item.heading}`} key={item.section} className={`max-w-full truncate rounded-md border px-2 py-1 text-left text-[11px] transition ${citation.section === item.section ? "border-[#4c7d56] bg-[#dcebd9] text-[#204d2d]" : "border-[#d5cbb6] bg-[#fcf9f0] text-[#5d594f] hover:border-[#7ba082]"}`}><span className="law-mono">§{item.section}</span><span className="ml-1 hidden sm:inline">{item.heading}</span></button>)}</div> : <p className="mt-1 text-xs text-[#787064]">Use a citation above, or choose one of the common starting points below.</p>}</div>

                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-[#d8d0bc] bg-[#faf7ef] px-5 py-4 sm:px-7">
                  <div><p className="law-mono text-[10px] uppercase tracking-[0.14em] text-[#6d675c]">{citation.title} U.S.C. § {citation.section}</p><h3 className="law-serif mt-1 text-2xl leading-7 tracking-[-0.025em] text-[#27251f]">{liveSection?.heading ?? "Opening the official section…"}</h3></div>
                  {liveSection && <a href={liveSection.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[#cbc1ad] px-3 py-2 text-xs text-[#47453e] transition hover:border-[#447252] hover:bg-[#edf4eb] hover:text-[#205133]">View official source <ExternalLink className="h-3.5 w-3.5" /></a>}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d8d0bc] bg-white px-5 py-3 sm:px-7"><p className="text-xs text-[#696257]">{sectionQuery.isFetching ? <span className="inline-flex items-center gap-2"><LoaderCircle className="h-3.5 w-3.5 animate-spin" />Updating from source</span> : liveSection ? <span>{liveSection.sourceStatus === "live official source" ? "Retrieved from the current official source" : liveSection.sourceStatus === "archived official source" ? "Official GovInfo archive edition" : "Official source link available"} · {formatUpdated(liveSection.retrievedAt)}</span> : "Finding the official section…"}</p><div className="flex flex-wrap items-center gap-2"><div className="flex overflow-hidden rounded-full border border-[#cfc5af] p-0.5" role="group" aria-label="Text size"><button aria-pressed={fontSize === 0.9} onClick={() => setFontSize(0.9)} className={`rounded-full px-2 py-1 text-[10px] ${fontSize === 0.9 ? "bg-[#e6dfce] text-[#27251f]" : "text-[#676055]"}`}>A−</button><button aria-pressed={fontSize === 1} onClick={() => setFontSize(1)} className={`rounded-full px-2 py-1 text-[10px] ${fontSize === 1 ? "bg-[#e6dfce] text-[#27251f]" : "text-[#676055]"}`}>A</button><button aria-pressed={fontSize === 1.14} onClick={() => setFontSize(1.14)} className={`rounded-full px-2 py-1 text-[10px] ${fontSize === 1.14 ? "bg-[#e6dfce] text-[#27251f]" : "text-[#676055]"}`}>A+</button></div><button aria-pressed={density === "compact"} onClick={() => setDensity(current => current === "comfortable" ? "compact" : "comfortable")} className="rounded-full border border-[#cfc5af] px-3 py-1.5 text-[10px] text-[#554f45] transition hover:bg-[#f3eee2]">{density === "compact" ? "Comfortable spacing" : "Compact spacing"}</button><button disabled={!liveSection || liveSection.officialText.length === 0 || explain.isPending} onClick={() => liveSection && explain.mutate({ title: liveSection.title, section: liveSection.section })} className="inline-flex items-center gap-2 rounded-full border border-[#a8c7ab] bg-[#edf5eb] px-3 py-1.5 text-xs font-medium text-[#245232] transition hover:bg-[#dcebd9] disabled:cursor-not-allowed disabled:opacity-50"><Sparkles className="h-3.5 w-3.5" />{explain.isPending ? "Making guide…" : guide ? "Refresh plain-English guide" : "Make a plain-English guide"}</button></div></div>

                <div className="lg:hidden"><div className="flex bg-[#f7f2e6] p-2" role="group" aria-label="Mobile reading view"><button aria-pressed={mobileView === "official"} onClick={() => setMobileView(setReaderMode("official"))} className={`flex-1 rounded-md px-3 py-2 text-xs font-medium ${mobileView === "official" ? "bg-[#f9f5e8] text-[#2d2a23] shadow-sm" : "text-[#6d665c]"}`}>Official text</button><button aria-pressed={mobileView === "guide"} onClick={() => setMobileView(setReaderMode("guide"))} className={`flex-1 rounded-md px-3 py-2 text-xs font-medium ${mobileView === "guide" ? "bg-[#e8f0e8] text-[#285438] shadow-sm" : "text-[#6d665c]"}`}>Plain English</button></div></div>
                {sectionQuery.isLoading && citation.title !== 1 ? <div className="flex min-h-[420px] items-center justify-center bg-[#faf7ef] text-sm text-[#746b5e]"><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Opening one section, not the whole Code…</div> : liveSection ? <><div className="hidden lg:block"><ReadingPanel section={liveSection} guide={guide} view="both" fontSize={fontSize} density={density} /></div><div className="lg:hidden"><ReadingPanel section={liveSection} guide={guide} view={mobileView} fontSize={fontSize} density={density} /></div></> : <div className="min-h-[420px] bg-[#faf7ef] p-8 text-sm text-[#746b5e]">The official section is not available at the moment. Try another citation or visit the source site directly.</div>}
              </div>
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-[#d8d0bc] bg-[#eee8d9] p-4 sm:p-5">
            <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-baseline"><p className="law-mono text-[10px] uppercase tracking-[0.14em] text-[#637063]">Not sure where to begin?</p><p className="text-xs text-[#6e675c]">Choose a familiar doorway into the Code.</p></div>
            <div className="mt-3 flex flex-wrap gap-2">{commonStartingPoints.map(item => <button onClick={() => moveToCitation({ title: item.title, section: item.section })} key={item.citation} className="group rounded-lg border border-[#cfc5ae] bg-[#faf7ef] px-3 py-2 text-left transition hover:border-[#60906b] hover:bg-[#edf4eb] active:scale-[.98]"><span className="block text-xs font-medium text-[#33342e]">{item.label}</span><span className="law-mono mt-1 block text-[9px] tracking-[0.08em] text-[#777064]">{item.citation}</span></button>)}</div>
          </div>
          <p className="mt-4 text-xs leading-5 text-[#70695f]">This public reading tool is not a legal source or legal advice. It is designed to make the Code easier to locate and read. For legal research, verify the statutory text and currentness through the official source.</p>
        </section>

        <section id="how-it-works" className="border-t border-[#d9d1bd] bg-[#e7e0ce] py-14 sm:py-20"><div className="mx-auto grid max-w-[1540px] gap-10 px-5 sm:px-7 lg:grid-cols-[0.8fr_1.2fr] lg:px-10"><div><p className="law-mono text-[10px] uppercase tracking-[0.15em] text-[#617160]">How this reading room works</p><h2 className="law-serif mt-3 text-4xl leading-[.95] tracking-[-0.04em] text-[#22211d] sm:text-5xl">Big system.<br />Small requests.</h2></div><div className="grid gap-px overflow-hidden rounded-xl border border-[#c8bea9] bg-[#c8bea9] sm:grid-cols-3">{[["01", "Pick a citation", "Search by a familiar citation, or browse the Code’s 54 titles."], ["02", "Load only that page", "The reader asks for the section you chose—not a title-sized download."], ["03", "Compare carefully", "Keep the statutory wording in view while using a clearly marked reading guide."]].map(([number, title, body]) => <div className="bg-[#f4efdf] p-6" key={number}><span className="law-mono text-[10px] tracking-[0.15em] text-[#5f705f]">{number}</span><h3 className="law-serif mt-8 text-2xl text-[#25231e]">{title}</h3><p className="mt-3 text-sm leading-6 text-[#676055]">{body}</p></div>)}</div></div></section>
      </main>

      <footer className="bg-[#0b1010] px-5 py-7 text-[#9faea2] sm:px-7 lg:px-10"><div className="mx-auto flex max-w-[1540px] flex-col justify-between gap-3 text-xs sm:flex-row sm:items-center"><p>Built for curiosity, clarity, and the long scroll through public law.</p><a href="https://uscode.house.gov/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[#d0ded1] hover:text-white">Office of the Law Revision Counsel <ArrowUpRight className="h-3.5 w-3.5" /></a></div></footer>
    </div>
  );
}
