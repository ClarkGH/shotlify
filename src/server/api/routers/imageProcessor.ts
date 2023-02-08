import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "../trpc";

const fileSchema = z.object({
  files: z.array(z.string()),
});

export const processorRouter = createTRPCRouter({
  processImages: publicProcedure
    .input(fileSchema)
    .mutation(({ input }) => {
      return {
        files: `Wakka ${input.files[0] || 'hi'} wakka`,
      };
    }),
});
