import type { PipelineState } from "../state.js";

// Stub for Task 3. Task 7 replaces this with the adversarial critique loop
// (max 2 revisions, then hard-coded fallback).
export async function critique(state: PipelineState): Promise<PipelineState> {
  return state;
}
