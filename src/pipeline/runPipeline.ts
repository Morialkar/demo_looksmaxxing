import type { PipelineState } from "./state.js";
import { intake } from "./steps/intake.js";
import { safetyGate } from "./steps/safetyGate.js";
import { retrieve } from "./steps/retrieve.js";
import { compose } from "./steps/compose.js";
import { critique } from "./steps/critique.js";
import { format } from "./steps/format.js";

// ASSUMPTION (design decision made in Task 3, per plan.md's "route resources
// court-circuite la génération"): retrieve/compose/critique only run on the
// normal route. format always runs — it renders either branch's output.
export async function runPipeline(initial: PipelineState): Promise<PipelineState> {
  let state = await intake(initial);
  state = await safetyGate(state);

  if (state.route !== "resources") {
    state = await retrieve(state);
    state = await compose(state);
    state = await critique(state);
  }

  state = await format(state);
  return state;
}
