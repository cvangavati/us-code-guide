# U.S. Code Guide — Research Notes

## Official-text source

The Office of the Law Revision Counsel (OLRC) provides downloadable versions of the United States Code in XML, XHTML, PCC, and PDF at defined release points. Its download page reported the current release point as **Public Law 119-102, dated July 12, 2026** when reviewed on August 20, 2026. The implementation should treat OLRC text as the primary statutory-text source, display the exact release point with each reader section, and link users to the original official material.

The complete archive should not be placed in the browser bundle. The production architecture should ingest, normalize, index, and serve a small title/chapter/section slice only when it is requested. The reader should retain source metadata for every fetched section.

Source: <https://uscode.house.gov/download/download.shtml>

## Publication context and section retrieval

GovInfo describes the U.S. Code as a subject-matter codification of the general and permanent laws of the United States, organized into 54 titles and published by OLRC. It distinguishes positive-law titles, for which the title text is legal evidence, from non-positive-law titles, where the Statutes at Large govern. The product should surface this distinction in a concise, non-alarming source note and retain a direct official-source link for legal research.

The OLRC reader can return a particular section through a query URL such as `https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title1-section1&num=0&edition=prelim`. This confirms that a browser-efficient site can make the official source available one section at a time, rather than embedding a full title or the entire Code in the client. The application should use server-side retrieval and normalization for its own reader where permitted, cache narrowly and temporarily, and fall back to the original OLRC page when a section is unavailable.

Sources: <https://www.govinfo.gov/help/uscode> and <https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title1-section1&num=0&edition=prelim>

## Visual reference

The supplied reference site, <https://www.pleurat.com/>, presents an intentionally restrained, dark, editorial first impression with generous whitespace and a quiet, minimal visual language. The U.S. Code reader will take inspiration from the restraint, strong type hierarchy, and focused pacing while using original layout, components, copy, colors, and interaction design. It will favor a warm paper-like content surface so lengthy statutory material remains comfortable to read.

## Content-design guardrails

The official text and the plain-English material must be visibly distinct. Plain-English explanations will be labeled as an explanatory guide rather than law, preserve statutory qualifiers where possible, avoid legal advice, and link directly to the corresponding official language.

## Search and relationship feature sources

GovInfo supports U.S. Code-only keyword search through `collection:uscode`, as well as search fields for titles, chapters, sections, headings, and short titles. Its developer documentation describes a search service and API that require an api.data.gov key. The live product should therefore separate its immediate built-in search catalogue from any future official full-text API integration, and label result scope clearly rather than implying that a limited local index searches every word of the Code.

For the no-key, browser-efficient initial release, search can rank the locally maintained plain-language title descriptions, topic pathways, representative section entries, and curated related-law relationships. Each result must state whether it is a **guide index** result or an **official source index** result, then open the existing on-demand section reader. A later full-text implementation can use the documented official search service or a normalized release-point index.

The OLRC download page confirms it publishes each current release point in XML and XHTML for all titles and for individual titles. That makes a scheduled, server-side ingestion/index pipeline technically appropriate for a future full Code search without ever transferring the whole archive to a visitor’s browser.

Sources: <https://www.govinfo.gov/help/uscode>, <https://www.govinfo.gov/developers>, and <https://uscode.house.gov/download/download.shtml>
