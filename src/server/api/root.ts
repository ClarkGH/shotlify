import { createTRPCRouter } from "./trpc";
import { processorRouter } from "./routers/imageProcessor";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here
 */
export const appRouter = createTRPCRouter({
  processor: processorRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
