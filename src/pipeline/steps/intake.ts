import { userProfileSchema } from "../../schemas.js";
import type { PipelineState } from "../state.js";

export class IntakeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntakeValidationError";
  }
}

export async function intake(state: PipelineState): Promise<PipelineState> {
  const result = userProfileSchema.safeParse(state.raw);
  if (!result.success) {
    throw new IntakeValidationError(result.error.message);
  }
  return { ...state, profile: result.data };
}
