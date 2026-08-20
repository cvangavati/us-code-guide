import { createServer } from "node:http";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { afterEach, describe, expect, it, vi } from "vitest";
import handler, { sourceGroundedGuide } from "../api/trpc/[...path]";
import type { AppRouter } from "./routers";

const servers: ReturnType<typeof createServer>[] = [];

afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve()))));
});

describe("Vercel public reader API", () => {
  it("answers the deployed-style tRPC path without loading optional provider services", async () => {
    const server = createServer(handler);
    servers.push(server);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected a TCP server address");

    const response = await fetch(`http://127.0.0.1:${address.port}/api/trpc/usCode.titles?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D`);

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('"result"');
    expect(response.headers.get("x-powered-by")).toBeNull();
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("deserializes a section through the reader's superjson tRPC contract", async () => {
    const server = createServer(handler);
    servers.push(server);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected a TCP server address");

    const client = createTRPCClient<AppRouter>({
      links: [httpBatchLink({ url: `http://127.0.0.1:${address.port}/api/trpc`, transformer: superjson })],
    });
    const section = await client.usCode.section.query({ title: 1, section: "2" });

    expect(section.heading).toContain("County");
    expect(section.officialText[0]).toContain("county");
  }, 30_000);

  it("returns a clearly labeled reading guide through the reader's Vercel mutation contract", async () => {
    const server = createServer(handler);
    servers.push(server);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected a TCP server address");

    const client = createTRPCClient<AppRouter>({
      links: [httpBatchLink({ url: `http://127.0.0.1:${address.port}/api/trpc`, transformer: superjson })],
    });
    const guide = await client.usCode.explain.mutate({ title: 1, section: "2" });

    expect(guide.label).toBe("Plain-English guide — not legal advice");
    expect(guide.generated).toBe(true);
    expect(guide.summary).toMatch(/county/i);
    expect(guide.summary).toMatch(/used more broadly/i);
    expect(guide.keyPoints[0]).toMatch(/^Line 1:/);
    expect(guide.keyPoints.join(" ")).not.toMatch(/read that sentence|should|mandatory wording/i);
    expect(guide.keyPoints.join(" ")).not.toMatch(/July|Stat\./i);
  }, 30_000);

  it("creates a plain-English entry for every displayed statutory line without a five-line cap", () => {
    const guide = sourceGroundedGuide({
      heading: "Example section",
      officialText: Array.from({ length: 7 }, (_, index) => `Line ${index + 1} has words to explain.`),
    });

    expect(guide.keyPoints).toHaveLength(7);
    expect(guide.keyPoints[6]).toMatch(/^Line 7:/);
    expect(guide.trace.keyPointParagraphs).toHaveLength(7);
    expect(guide.trace.keyPointParagraphs[6]).toEqual([7]);
  });

  it("restates common statutory grammar rules in everyday English rather than repeating their formal wording", () => {
    const guide = sourceGroundedGuide({
      heading: "Rules of construction",
      officialText: [
        "(a) In determining the meaning of any Act of Congress, unless the context indicates otherwise-",
        "words importing the singular include and apply to several persons, parties, or things;",
        "words importing the masculine gender include the feminine as well;",
      ],
    });

    expect(guide.keyPoints[0]).toContain("default rules for reading federal laws");
    expect(guide.keyPoints[1]).toContain("more than one person, group, or thing");
    expect(guide.keyPoints[2]).toContain("cover women");
  });

  it("turns definitions and rule sentences into reader-first explanations instead of near-copying source language", () => {
    const guide = sourceGroundedGuide({
      heading: "Example section",
      officialText: [
        "For the purposes of this section, the term “county” includes the District of Columbia and Puerto Rico.",
        "The Secretary shall submit a report to Congress each year.",
      ],
    });

    expect(guide.keyPoints[0]).toBe("Line 1: Here, “county” is used more broadly than its everyday label. It can cover the District of Columbia and Puerto Rico.");
    expect(guide.keyPoints[0]).not.toContain("term “county” includes");
    expect(guide.keyPoints[0]).not.toContain("For the purposes of this section");
    expect(guide.keyPoints[1]).toBe("Line 2: In everyday terms, The Secretary has to send a report to Congress each year.");
    expect(guide.keyPoints[1]).not.toContain("shall submit");
  });

  it("explains public-records limits, fees, and court review in practical terms", () => {
    const guide = sourceGroundedGuide({
      heading: "Public records",
      officialText: [
        "(a)(1) Except to the extent that a person has actual and timely notice of the terms of it, a person may not be adversely affected by a matter required to be published and not so published.",
        "(a)(4)(A)(ii)(I) Fees shall be limited to reasonable standard charges for document search, duplication, and review when records are requested for commercial use.",
        "(a)(4)(A)(vii) In any action by a requester regarding the waiver of fees under this section, the court shall determine the matter de novo.",
      ],
    });

    expect(guide.keyPoints).toEqual([
      "Line 1: An unpublished rule generally cannot be used against someone who did not receive timely notice of it.",
      "Line 2: For commercial requests, fees can cover reasonable costs for searching, copying, and reviewing records.",
      "Line 3: A court decides a fee-waiver dispute from the beginning, using the information the agency had at the time.",
    ]);
    expect(guide.keyPoints.join(" ")).not.toMatch(/except to the extent|shall be limited|determine the matter de novo/i);
  });

  it("turns public-records subclauses into complete explanations instead of source fragments", () => {
    const guide = sourceGroundedGuide({
      heading: "Public records",
      officialText: [
        "(a)(2)(D)(i) That have been released to any person under paragraph (3); and",
        "(a)(2)(D)(ii)(I) that because of the nature of their subject matter, the agency determines have become or are likely to become the subject of subsequent requests for substantially the same records; or",
        "(a)(4)(A)(iii) Such agency regulations shall provide that fees shall be limited.",
        "(a)(4)(A)(iv)(II) Documents shall be furnished without any charge or at a charge reduced below the fees established under clause (ii) if disclosure of the information is in the public interest.",
        "(a)(2) It has been indexed and either made available or published as provided by this paragraph; or",
        "(a)(2) The party has actual and timely notice of the terms of it.",
        "(c)(1) An agency, or part of an agency, that is an element of the intelligence community may not make any record available under this paragraph.",
      ],
    });

    expect(guide.keyPoints).toEqual([
      "Line 1: The agency must post records it has already released in response to a request.",
      "Line 2: The agency must also post records likely to be requested again because people often seek similar information.",
      "Line 3: The agency's fee rules must include the limits described next.",
      "Line 4: Fees should be waived or reduced when releasing the information would meaningfully help the public understand government work.",
      "Line 5: A record can be relied on only after it has been indexed and made public.",
      "Line 6: A person can be held to a record or decision when they received timely notice of it.",
      "Line 7: Intelligence-community agencies have a special exception that can let them avoid confirming or releasing certain records.",
    ]);
    expect(guide.keyPoints.join(" ")).not.toMatch(/that have been released|such agency regulations|documents shall be furnished|it has been indexed and either made|the party has actual and timely notice/i);
  });

  it("excludes a standalone derivation heading and explains a substantive public-records rule in practical language", async () => {
    const realFetch = globalThis.fetch;
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith("https://uscode.house.gov/")) {
        return new Response(`
          <h3>§99. Public records</h3>
          <p>Each agency shall make available to the public information as follows.</p>
          <p>Descriptions of its central and field organization and the established places at which the public may obtain information.</p>
          <h4>Derivation</h4>
          <p>U.S. Code and Statutes at Large comparison.</p>
        `);
      }
      return realFetch(input, init);
    }));
    const server = createServer(handler);
    servers.push(server);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected a TCP server address");
    const client = createTRPCClient<AppRouter>({
      links: [httpBatchLink({ url: `http://127.0.0.1:${address.port}/api/trpc`, transformer: superjson })],
    });

    const guide = await client.usCode.explain.mutate({ title: 5, section: "99" });

    expect(guide.keyPoints).toEqual([
      "Line 1: Federal agencies have to make the listed information available to the public.",
      "Line 2: The public notice must explain where the agency operates, who people can contact, and how to get information.",
    ]);
    expect(guide.keyPoints.join(" ")).not.toMatch(/derivation|U\.S\. Code and Statutes at Large/i);
    expect(guide.keyPoints.join(" ")).not.toContain("Each agency shall make available");
  });
});
