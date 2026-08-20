import { createServer } from "node:http";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { afterEach, describe, expect, it } from "vitest";
import handler from "../api/trpc/[...path]";
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
    expect(guide.summary).toMatch(/official language/i);
  }, 30_000);
});
