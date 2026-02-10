import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { searchAggregator } from "./aggregator";

const app = new Elysia()
  .use(cors())
  .get(
    "/search",
    async ({ query }) => {
      const { q, limit, includeArxiv, includePubmed, startDate, endDate, includeAbstracts } = query;
      if (!q) {
        return [];
      }
      return await searchAggregator(q, {
        limit: limit ? parseInt(limit) : 5,
        includeArxiv: includeArxiv === undefined ? undefined : includeArxiv === 'true',
        includePubmed: includePubmed === undefined ? undefined : includePubmed === 'true',
        startDate,
        endDate,
        includeAbstracts: includeAbstracts === 'true'
      });
    },
    {
      query: t.Object({
        q: t.String(),
        limit: t.Optional(t.String()),
        includeArxiv: t.Optional(t.String()),
        includePubmed: t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        includeAbstracts: t.Optional(t.String())
      }),
    }
  );

export type App = typeof app;
export { app };
