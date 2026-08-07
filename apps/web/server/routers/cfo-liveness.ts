import { z } from "zod";
import { eq } from "drizzle-orm";
import { entities } from "@xenboox/db/schema/organization";
import { runCFOPipeline, createInputEvent } from "@xenboox/agents/core";

import { db } from "@/lib/db";
import { mapPipelineResultToLiveness } from "@/lib/cfo-liveness";
import {
  router,
  rlsProtectedProcedure,
  handleMutationError,
} from "@/lib/trpc/server";

export const cfoLivenessRouter = router({
  /** Run the real CFO pipeline for an instruction and return its liveness payload */
  run: rlsProtectedProcedure
    .input(
      z.object({
        instruction: z.string().min(1).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const entityId = ctx.entityId!;
        const userId = ctx.session!.user!.id!;

        const entity = await db.query.entities.findFirst({
          where: eq(entities.id, entityId),
          columns: { id: true, name: true, organizationId: true },
        });
        if (!entity) {
          throw new Error("Entity not found");
        }

        const result = await runCFOPipeline(
          createInputEvent({
            channel: "web_chat",
            userId,
            orgId: entity.organizationId,
            entityId,
            entityName: entity.name,
            currency: "GMD",
            rawContent: input.instruction,
          }),
        );

        return mapPipelineResultToLiveness(result);
      } catch (error) {
        handleMutationError(error, "Failed to run CFO pipeline");
      }
    }),
});
