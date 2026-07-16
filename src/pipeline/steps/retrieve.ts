import { findDocsForGoal } from "../../corpus/corpus.js";
import type { ContextDoc } from "../../schemas.js";
import type { PipelineState } from "../state.js";

export async function retrieve(state: PipelineState): Promise<PipelineState> {
  if (!state.profile) {
    throw new Error("retrieve: state.profile is not set — intake must run first");
  }

  const seenUrls = new Set<string>();
  const contextDocs: ContextDoc[] = [];
  for (const goal of state.profile.goals) {
    for (const doc of findDocsForGoal(goal)) {
      if (!seenUrls.has(doc.url)) {
        seenUrls.add(doc.url);
        contextDocs.push(doc);
      }
    }
  }

  return { ...state, contextDocs };
}
