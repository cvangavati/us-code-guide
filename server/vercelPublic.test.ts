import { createServer } from "node:http";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { afterEach, describe, expect, it } from "vitest";
import handler, { sourceGroundedGuide } from "../api/trpc/[...path]";
import type { AppRouter } from "./routers";

const servers: ReturnType<typeof createServer>[] = [];

afterEach(async () => {
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
});
