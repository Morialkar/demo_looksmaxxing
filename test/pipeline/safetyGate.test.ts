import { describe, expect, it } from "vitest";
import { safetyGate } from "../../src/pipeline/steps/safetyGate.js";
import { createInitialState, type PipelineState } from "../../src/pipeline/state.js";
import type { UserProfile } from "../../src/schemas.js";

function stateWithProfile(profile: UserProfile): PipelineState {
  return { ...createInitialState(profile), profile };
}

const baseProfile: UserProfile = {
  age: 22,
  goals: ["fitness"],
  budget: 30,
  timePerDay: 15,
  flags: { extremeLanguage: false, unrealisticGoals: false },
};

describe("safetyGate", () => {
  it("routes a clean adult profile to normal", async () => {
    const result = await safetyGate(stateWithProfile(baseProfile));
    expect(result.route).toBe("normal");
  });

  it("routes age exactly 18 to normal (boundary)", async () => {
    const result = await safetyGate(
      stateWithProfile({ ...baseProfile, age: 18 }),
    );
    expect(result.route).toBe("normal");
  });

  it("routes age 17 to resources (boundary)", async () => {
    const result = await safetyGate(
      stateWithProfile({ ...baseProfile, age: 17 }),
    );
    expect(result.route).toBe("resources");
  });

  it("routes extreme language to resources regardless of age", async () => {
    const result = await safetyGate(
      stateWithProfile({
        ...baseProfile,
        flags: { extremeLanguage: true, unrealisticGoals: false },
      }),
    );
    expect(result.route).toBe("resources");
  });

  it("throws if state.profile is missing (intake did not run)", async () => {
    await expect(safetyGate(createInitialState({}))).rejects.toThrow();
  });
});
