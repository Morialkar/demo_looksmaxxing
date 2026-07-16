import { critiqueVerdictSchema, type UserProfile } from "../../schemas.js";
import type { LLMClient } from "../../llm/client.js";
import { CRITIQUE_MARKER, FakeLLMClient, RISK_MARKER } from "../../llm/fakeClient.js";
import type { PipelineState } from "../state.js";
import { compose } from "./compose.js";
import { fallbackPlan } from "../fallbackPlan.js";

const MAX_REVISIONS = 2; // per plan.md: "Max 2 révisions, sinon fallback conservateur"

type StepFn = (state: PipelineState) => Promise<PipelineState>;

function buildPrompt(state: PipelineState, profile: UserProfile): string {
  // unrealisticGoals is checked here, not in safetyGate (Task 4) — disguised
  // extreme goals ("restriction calorique extrême formulée en fitness") are
  // a critique-time content concern, not an intake-time gate.
  const riskLine = profile.flags.unrealisticGoals ? `${RISK_MARKER} unrealistic_goals` : "";
  return [CRITIQUE_MARKER, riskLine, JSON.stringify(state.draftPlan)]
    .filter((line) => line.length > 0)
    .join("\n");
}

function safeParseJson(raw: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}

export function createCritique(llmClient: LLMClient, composeStep: StepFn) {
  return async function critique(initial: PipelineState): Promise<PipelineState> {
    let state = initial;

    for (let revision = 0; revision <= MAX_REVISIONS; revision++) {
      if (!state.profile) {
        throw new Error("critique: state.profile is not set — intake must run first");
      }
      if (!state.draftPlan) {
        throw new Error("critique: state.draftPlan is not set — compose must run first");
      }

      const raw = await llmClient.generate(buildPrompt(state, state.profile));
      const parsedJson = safeParseJson(raw);
      const verdict = parsedJson.ok ? critiqueVerdictSchema.safeParse(parsedJson.value) : undefined;
      const passed = verdict?.success === true && verdict.data.pass;

      if (passed) {
        return { ...state, critique: verdict.data };
      }

      const isLastAttempt = revision === MAX_REVISIONS;
      if (isLastAttempt) {
        return {
          ...state,
          draftPlan: fallbackPlan,
          critique: { pass: true, violations: [], revisionNotes: "max revisions exhausted, fallback used" },
        };
      }

      state = await composeStep(state);
      state = { ...state, revisionCount: state.revisionCount + 1 };
    }

    // Unreachable: the loop always returns by revision === MAX_REVISIONS.
    throw new Error("critique: exhausted loop without returning");
  };
}

// Default wiring for the pipeline: FakeLLMClient + the default compose step,
// per the project's locked decision (no real provider in this exercise).
export const critique = createCritique(new FakeLLMClient(), compose);
