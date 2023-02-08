import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "../trpc";

const imageSchema = z.object({
  images: z.array(z.string()),
});

export const processorRouter = createTRPCRouter({
  processImages: publicProcedure
    .input(imageSchema)
    .mutation(({ input }) => {
      return {
        images: input.images,
      };
    }),
});
