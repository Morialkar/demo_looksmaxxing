import { describe, expect, it } from "vitest";
import { intake, IntakeValidationError } from "../../src/pipeline/steps/intake.js";
import { createInitialState } from "../../src/pipeline/state.js";

const validRaw = {
  age: 25,
  goals: ["clear skin"],
  budget: 30,
  timePerDay: 15,
  flags: { extremeLanguage: false, unrealisticGoals: false },
};

describe("intake", () => {
  it("parses a valid raw payload into state.profile", async () => {
    const result = await intake(createInitialState(validRaw));
    expect(result.profile).toEqual(validRaw);
  });

  it("strips unknown fields rather than rejecting the payload", async () => {
    const result = await intake(
      createInitialState({ ...validRaw, unexpectedField: "ignored" }),
    );
    expect(result.profile).toEqual(validRaw);
  });

  it("throws IntakeValidationError on a malformed raw payload, not a silent pass-through", async () => {
    const malformed = { age: 25 };
    await expect(intake(createInitialState(malformed))).rejects.toThrow(
      IntakeValidationError,
    );
  });
});
