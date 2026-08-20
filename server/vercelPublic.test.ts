import { createServer } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { handleVercelPublicApi } from "./vercelPublicApi";

const servers: ReturnType<typeof createServer>[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve()))));
});

describe("Vercel public reader API", () => {
  it("answers the deployed-style tRPC path without loading optional provider services", async () => {
    const server = createServer(handleVercelPublicApi);
    servers.push(server);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected a TCP server address");

    const response = await fetch(`http://127.0.0.1:${address.port}/api/trpc/usCode.titles?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D`);

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("General Provisions");
    expect(response.headers.get("x-powered-by")).toBeNull();
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });
});
