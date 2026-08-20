# The People’s U.S. Code Guide

The People’s U.S. Code Guide is a browser-efficient, plain-English companion for exploring the United States Code. It presents the requested statutory section beside a clearly labeled reading guide, rather than loading a full title or the entire Code into a visitor’s browser.

## What the reader does

| Capability | Behavior |
|---|---|
| Official-text reader | Retrieves one requested U.S. Code section at a time and retains an official-source link and status label. |
| Plain-English guide | Keeps a non-advisory explanation distinct from the statutory text and links guide claims back to displayed paragraphs. |
| Discovery | Offers title, topic, chapter, section, representative-section, citation, and plain-language search paths. |
| Search scope | Labels curated guide results separately from official citation-index results, with an official GovInfo full-Code search link for broader queries. |
| Navigation trails | Shows curated related-law connections where maintained and a structural next-step route for every chapter returned by the active official title index. |
| Personal reading tools | Keeps saved folders and recently viewed history in the visitor’s browser; no account is required. |
| Theme | Provides a persistent light/dark mode control for long-form reading. |

## Data and source boundaries

The project uses the Office of the Law Revision Counsel as the primary source target and can fall back to clearly labeled GovInfo archive material when required. The current implementation does **not** bundle or permanently ingest the full U.S. Code. It loads requested sections and compact title indexes on demand.

Plain-language search is intentionally transparent: its local results come from a maintained reading-guide and citation index, not a complete full-text legal index. Every search card identifies its result scope. The interface also gives users a query-preserving link to the official GovInfo U.S. Code search for broader official searching.

> This application is a reading aid, not legal advice or a substitute for official legal research. Verify statutory language, currentness, and context through the linked official source.

## Privacy and browser-local data

Saved sections, custom folders, recent history, and theme preference are stored in the current browser’s local storage. They are not sent to the application database and are not synchronized between devices. Clearing browser site data removes them.

## Public exposure and secret handling

The public application does not need user API keys. Server-only credentials and platform configuration stay outside the client bundle. The site deliberately avoids an analytics snippet or public tracking configuration. The repository must never include environment files, private keys, access tokens, passwords, or secret values.

Run the public-boundary check before a release:

```bash
pnpm security:scan
pnpm verify:public
```

The scanner reports only affected file names and marker categories; it never prints a suspected credential value. It checks tracked project files and built public artifacts for common token/private-key signatures and disallowed public configuration names.

## Development

```bash
pnpm install
pnpm dev
```

The app uses React, TypeScript, Tailwind CSS, Express, and tRPC. The main public reader is in `client/src/pages/Home.tsx`; reusable reading, search, history, and folder models are in `shared/readerFeatures.ts`; official source retrieval is in `server/usCode.ts`.

## Verification

```bash
pnpm run check
pnpm test
pnpm run build
```

Tests cover citation and navigation helpers, official-text normalization, plain-language search source labels, chapter routing, saved folders, filtered folder workflows, recently viewed history, and theme persistence.

## GitHub synchronization

The project is connected to the `user_github` remote. Saving a managed project checkpoint synchronizes the current committed state with the connected GitHub repository. Avoid force-pushes or destructive resets; use managed checkpoints to preserve a recoverable history.

## Deployment

The supported deployment path is the project’s managed hosting, which keeps its server-only configuration in the hosting environment and supports custom domains. If you use a different host, it must serve the **Vite client build** rather than the bundled Node server file.

The included `vercel.json` is an external-host compatibility layer. It runs `pnpm run build:client`, serves only `dist/public`, preserves reader URLs such as `/read/18/1030`, and routes the browser-facing official-text and title-index requests under `/api/trpc/*` to the lightweight Vercel Function at `api/trpc/[...path].ts`. In Vercel, use the repository root and do not override the Output Directory to `dist`; the configuration sets it to `dist/public` deliberately.

> Do not copy Manus-managed environment values or keys into another host. Browser-local reading lists work without a database. The official-text reader uses public government sources, while provider-backed plain-English generation and Manus OAuth/storage routes remain intentionally outside the lightweight Vercel API. They require separately configured, Vercel-compatible server-side services if you intend to use those optional routes outside managed hosting.

## Future improvements

The next major data enhancement is a release-point ingestion pipeline that normalizes and indexes all official title/chapter/section headings and full text on the server, while continuing to send only the relevant result or section to the reader.
