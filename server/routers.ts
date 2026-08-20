import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { US_CODE_TITLES } from "../shared/usCode";
import { getOfficialSection, getTitleSectionIndex, makePlainEnglishGuide } from "./usCode";

const citationInput = z.object({
  title: z.coerce.number().int().min(1).max(54),
  section: z.string().trim().min(1).max(64).regex(/^[0-9A-Za-z.-]+$/),
});

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  usCode: router({
    titles: publicProcedure.query(() => US_CODE_TITLES),
    titleSections: publicProcedure.input(z.object({ title: z.coerce.number().int().min(1).max(54) })).query(({ input }) =>
      getTitleSectionIndex(input.title)
    ),
    section: publicProcedure.input(citationInput).query(({ input }) =>
      getOfficialSection(input.title, input.section)
    ),
    explain: publicProcedure.input(citationInput).mutation(async ({ input }) => {
      const section = await getOfficialSection(input.title, input.section);
      return makePlainEnglishGuide(section);
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
