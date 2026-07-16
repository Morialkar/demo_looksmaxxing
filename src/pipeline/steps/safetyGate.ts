import type { PipelineState } from "../state.js";

export async function safetyGate(state: PipelineState): Promise<PipelineState> {
  if (!state.profile) {
    throw new Error("safetyGate: state.profile is not set — intake must run first");
  }

  // unrealisticGoals is intentionally not checked here: it's a critique-time
  // concern (Task 7, disguised extreme goals), not an intake-time gate.
  const { age, flags } = state.profile;
  const route = age < 18 || flags.extremeLanguage ? "resources" : "normal";

  return { ...state, route };
}
