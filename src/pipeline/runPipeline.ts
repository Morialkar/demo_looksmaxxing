import type { PipelineState } from "./state.js";
import { intake } from "./steps/intake.js";
import { safetyGate } from "./steps/safetyGate.js";
import { retrieve } from "./steps/retrieve.js";
import { compose } from "./steps/compose.js";
import { critique } from "./steps/critique.js";
import { format } from "./steps/format.js";

export type StepName =
  | "intake"
  | "safetyGate"
  | "retrieve"
  | "compose"
  | "critique"
  | "format";

// Added in Task 10 for SSE progress streaming. Optional and additive: every
// existing call site (Tasks 3, 9) keeps working unchanged since hooks
// defaults to {}.
export interface PipelineHooks {
  onStepComplete?: (step: StepName, state: PipelineState) => void;
}

// ASSUMPTION (design decision made in Task 3, per plan.md's "route resources
// court-circuite la génération"): retrieve/compose/critique only run on the
// normal route. format always runs — it renders either branch's output.
export async function runPipeline(
  initial: PipelineState,
  hooks: PipelineHooks = {},
): Promise<PipelineState> {
  const notify = (step: StepName, state: PipelineState) => {
    hooks.onStepComplete?.(step, state);
  };

  let state = await intake(initial);
  notify("intake", state);

  state = await safetyGate(state);
  notify("safetyGate", state);

  if (state.route !== "resources") {
    state = await retrieve(state);
    notify("retrieve", state);

    state = await compose(state);
    notify("compose", state);

    state = await critique(state);
    notify("critique", state);
  }

  state = await format(state);
  notify("format", state);

  return state;
}
