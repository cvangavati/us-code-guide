import type { IncomingMessage, ServerResponse } from "node:http";
import { US_CODE_TITLES } from "../shared/usCode";
import { publicSecurityHeaders } from "./security";
import { getOfficialSection, getTitleSectionIndex } from "./usCode";

type CitationInput = { title: number; section: string };

function sendJson(res: ServerResponse, status: number, body: unknown) {
  Object.entries(publicSecurityHeaders).forEach(([name, value]) => res.setHeader(name, value));
  res.removeHeader("X-Powered-By");
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function readInput(url: URL) {
  const raw = url.searchParams.get("input");
  if (!raw) return undefined;
  const parsed = JSON.parse(raw) as Record<string, { json?: unknown }>;
  return parsed["0"]?.json;
}

function validateTitle(value: unknown): number {
  const title = typeof value === "object" && value ? Number((value as { title?: unknown }).title) : NaN;
  if (!Number.isInteger(title) || title < 1 || title > 54) throw new Error("A U.S. Code title from 1 through 54 is required.");
  return title;
}

function validateCitation(value: unknown): CitationInput {
  const title = validateTitle(value);
  const section = typeof value === "object" && value ? String((value as { section?: unknown }).section ?? "").trim() : "";
  if (!/^[0-9A-Za-z.-]{1,64}$/.test(section)) throw new Error("A valid U.S. Code section is required.");
  return { title, section };
}

function result(data: unknown) {
  return [{ result: { data: { json: data } } }];
}

function error(message: string) {
  return [{ error: { json: { message, code: -32600, data: { code: "BAD_REQUEST", httpStatus: 400 } } } }];
}

/**
 * Dependency-light Vercel Node handler for the browser-facing public reader.
 * Its batch response envelope matches the tRPC client's public GET calls.
 */
export async function handleVercelPublicApi(req: IncomingMessage, res: ServerResponse) {
  try {
    if (req.method !== "GET") {
      sendJson(res, 405, error("Only GET requests are supported by the public reader API."));
      return;
    }

    const requestUrl = new URL(req.url ?? "/", `https://${req.headers.host ?? "localhost"}`);
    const procedure = requestUrl.pathname.split("/").filter(Boolean).at(-1)?.split(".").at(-1);
    const input = readInput(requestUrl);

    if (procedure === "titles") {
      sendJson(res, 200, result(US_CODE_TITLES));
      return;
    }
    if (procedure === "titleSections") {
      sendJson(res, 200, result(await getTitleSectionIndex(validateTitle(input))));
      return;
    }
    if (procedure === "section") {
      const citation = validateCitation(input);
      sendJson(res, 200, result(await getOfficialSection(citation.title, citation.section)));
      return;
    }

    sendJson(res, 404, error("Unknown public reader procedure."));
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "The requested public reader data could not be loaded.";
    sendJson(res, 400, error(message));
  }
}
