import { draftPlanSchema, type ContextDoc, type DraftPlan, type UserProfile } from "../../schemas.js";
import type { LLMClient } from "../../llm/client.js";
import { COMPOSE_MARKER, FakeLLMClient } from "../../llm/fakeClient.js";
import type { PipelineState } from "../state.js";

const MAX_ATTEMPTS = 2; // one retry, per plan.md: "Échec de parse = retry une fois"

export class ComposeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ComposeError";
  }
}

function buildPrompt(profile: UserProfile, docs: ContextDoc[]): string {
  const docLines = docs
    .map((d) => `DOC_TITLE: ${d.source}\nDOC_URL: ${d.url}\nDOC_TOPIC: ${d.topic}\nDOC_EXCERPT: ${d.excerpt}`)
    .join("\n");
  return [
    COMPOSE_MARKER,
    `GOALS: ${profile.goals.join(", ")}`,
    `TIME_PER_DAY_MINUTES: ${profile.timePerDay}`,
    `BUDGET: ${profile.budget}`,
    docLines,
  ]
    .filter((line) => line.length > 0)
    .join("\n");
}

function safeParseJson(raw: string): { ok: true; value: unknown } | { ok: false; error: unknown } {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch (error) {
    return { ok: false, error };
  }
}

// The LLM only ever sees article urls we handed it in the prompt (DOC_URL
// lines); anything else in its response is a hallucinated citation, not a
// malformed-output retry case — silently dropped rather than surfaced as an
// error, so one bad link doesn't fail the whole plan.
function stripUngroundedReferences(plan: DraftPlan, allowedUrls: Set<string>): DraftPlan {
  return {
    sections: plan.sections.map((section) => ({
      ...section,
      references: section.references.filter((ref) => allowedUrls.has(ref.url)),
    })),
  };
}

export function createCompose(llmClient: LLMClient) {
  return async function compose(state: PipelineState): Promise<PipelineState> {
    if (!state.profile) {
      throw new Error("compose: state.profile is not set — intake must run first");
    }
    const contextDocs = state.contextDocs ?? [];
    const allowedUrls = new Set(contextDocs.map((d) => d.url));
    const prompt = buildPrompt(state.profile, contextDocs);

    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const raw = await llmClient.generate(prompt);
      const parsedJson = safeParseJson(raw);
      if (!parsedJson.ok) {
        lastError = parsedJson.error;
        continue;
      }
      const result = draftPlanSchema.safeParse(parsedJson.value);
      if (result.success) {
        return { ...state, draftPlan: stripUngroundedReferences(result.data, allowedUrls) };
      }
      lastError = result.error;
    }

    throw new ComposeError(
      `compose: LLM output invalid after ${MAX_ATTEMPTS} attempts: ${String(lastError)}`,
    );
  };
}

// Default wiring for the pipeline: FakeLLMClient per the project's locked
// decision (no real provider in this exercise). Swapping providers later
// means changing this line, not runPipeline.ts.
export const compose = createCompose(new FakeLLMClient());
