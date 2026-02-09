import { Elysia } from "elysia";
// import { db } from "./db";

// Mock User Type
type User = {
  id: number;
  name: string;
  role: string;
};

// Auth Middleware
const ensureAuthenticated = (app: Elysia) =>
  app.derive(() => {
    // TODO: Replace with JWT/OAuth check in production
    // For now, we just check NODE_ENV
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      return {
        user: {
          id: 1,
          name: "Dev Admin",
          role: "admin",
        } as User,
      };
    }
    
    // In production, we would throw an error if not authenticated
    // throw new Error("Unauthorized");
    return { user: null };
  });

const app = new Elysia()
  .use(ensureAuthenticated)
  .get("/", () => "Hello Elysia")
  .get("/api/projects", ({ user }) => {
    if (!user) {
      return { error: "Unauthorized" };
    }
    return {
      message: `Hello ${user.name}, here are your projects`,
      projects: ["Project A", "Project B"],
    };
  })
  .listen(3000);

export type App = typeof app;

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
