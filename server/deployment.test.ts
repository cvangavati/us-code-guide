import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type VercelConfig = {
  framework: string;
  buildCommand: string;
  outputDirectory: string;
  rewrites: Array<{ source: string; destination: string }>;
};

describe("Vercel deployment configuration", () => {
  it("serves the Vite client output and preserves reader deep links", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8")) as VercelConfig;

    expect(config.framework).toBe("vite");
    expect(config.buildCommand).toBe("pnpm run build:client");
    expect(config.outputDirectory).toBe("dist/public");
    expect(config.rewrites).toContainEqual({ source: "/read/:title/:section", destination: "/index.html" });
    expect(existsSync("api/[...path].ts")).toBe(true);
  });
});
