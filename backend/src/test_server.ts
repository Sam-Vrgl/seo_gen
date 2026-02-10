import { Elysia } from "elysia";
import { searchAggregator } from "./aggregator";

// Mock User Type
type User = {
  id: number;
  name: string;
  role: string;
};

// Auth Middleware
const ensureAuthenticated = (app: Elysia) =>
  app.derive(() => {
    return {
      user: {
        id: 1,
        name: "Dev Admin",
        role: "admin",
      } as User,
    };
  });

const app = new Elysia()
  .use(ensureAuthenticated)
  .get("/api/search", async ({ query }) => {
    const q = query.q;
    if (!q) {
      return { error: "Query parameter 'q' is required" };
    }
    const articles = await searchAggregator(q);
    return { articles };
  })
  .listen(3001);

console.log(
  `🦊 Test Server is running at ${app.server?.hostname}:${app.server?.port}`
);
