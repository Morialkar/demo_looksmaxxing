import type { FastifyInstance } from "fastify";
import { userProfileSchema } from "../schemas.js";
import { runPipeline } from "../pipeline/runPipeline.js";
import { createInitialState } from "../pipeline/state.js";
import type { PipelineState } from "../pipeline/state.js";
import type { StepName } from "../pipeline/runPipeline.js";

export async function workflowRoutes(app: FastifyInstance): Promise<void> {
  app.post("/workflow", async (request, reply) => {
    // Validated here, before SSE headers go out, so a malformed body gets a
    // normal 400 JSON response instead of an error mid-stream.
    const parsed = userProfileSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: parsed.error.message });
      return;
    }

    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const sendEvent = (payload: Record<string, unknown>) => {
      reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    try {
      await runPipeline(createInitialState(parsed.data), {
        onStepComplete: (step: StepName, state: PipelineState) => {
          if (step === "format") {
            sendEvent({ step, route: state.route, finalPlan: state.finalPlan });
          } else {
            sendEvent({ step, route: state.route });
          }
        },
      });
    } catch (error) {
      sendEvent({
        step: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      reply.raw.end();
    }
  });
}
