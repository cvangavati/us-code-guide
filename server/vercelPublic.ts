import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { initTRPC } from "@trpc/server";
import express, { type Request, type Response } from "express";
import superjson from "superjson";
import { z } from "zod";
import { US_CODE_TITLES } from "../shared/usCode";
import { securityHeaders } from "./security";
import { getOfficialSection, getTitleSectionIndex } from "./usCode";

type VercelPublicContext = { req: Request; res: Response };

const t = initTRPC.context<VercelPublicContext>().create({ transformer: superjson });
const citationInput = z.object({
  title: z.coerce.number().int().min(1).max(54),
  section: z.string().trim().min(1).max(64).regex(/^[0-9A-Za-z.-]+$/),
});

export const vercelPublicRouter = t.router({
  usCode: t.router({
    titles: t.procedure.query(() => US_CODE_TITLES),
    titleSections: t.procedure.input(z.object({ title: z.coerce.number().int().min(1).max(54) })).query(({ input }) =>
      getTitleSectionIndex(input.title)
    ),
    section: t.procedure.input(citationInput).query(({ input }) =>
      getOfficialSection(input.title, input.section)
    ),
  }),
});

/** Public reader API for Vercel; deliberately excludes optional auth, storage, and LLM services. */
export function createVercelPublicApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(securityHeaders);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: vercelPublicRouter,
      createContext: ({ req, res }) => ({ req, res }),
    })
  );
  return app;
}
