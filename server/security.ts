import type { RequestHandler } from "express";

export const publicSecurityHeaders = {
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin",
} as const;

/** Applies non-secret, browser-facing hardening headers to every public response. */
export const securityHeaders: RequestHandler = (_req, res, next) => {
  Object.entries(publicSecurityHeaders).forEach(([name, value]) => res.setHeader(name, value));
  next();
};
