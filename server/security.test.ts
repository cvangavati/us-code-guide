import { describe, expect, it, vi } from "vitest";
import { publicSecurityHeaders, securityHeaders } from "./security";

describe("securityHeaders", () => {
  it("applies conservative browser-facing headers without depending on secret configuration", () => {
    const setHeader = vi.fn();
    const next = vi.fn();

    securityHeaders({} as never, { setHeader } as never, next);

    expect(next).toHaveBeenCalledOnce();
    Object.entries(publicSecurityHeaders).forEach(([name, value]) => {
      expect(setHeader).toHaveBeenCalledWith(name, value);
    });
  });
});
