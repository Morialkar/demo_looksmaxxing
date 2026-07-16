import type {
  ContextDocs,
  CritiqueVerdict,
  DraftPlan,
  FinalPlan,
  UserProfile,
} from "../schemas.js";

export type Route = "normal" | "resources";

// Fields are populated progressively as the pipeline advances; a step only
// relies on a field once the step before it in runPipeline's order has run.
export interface PipelineState {
  raw: unknown;
  profile?: UserProfile;
  route?: Route;
  contextDocs?: ContextDocs;
  draftPlan?: DraftPlan;
  critique?: CritiqueVerdict;
  revisionCount: number;
  finalPlan?: FinalPlan;
}

export function createInitialState(raw: unknown): PipelineState {
  return { raw, revisionCount: 0 };
}
