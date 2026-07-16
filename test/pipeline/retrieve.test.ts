import { describe, expect, it } from "vitest";
import { retrieve } from "../../src/pipeline/steps/retrieve.js";
import { createInitialState, type PipelineState } from "../../src/pipeline/state.js";
import type { UserProfile } from "../../src/schemas.js";

function stateWithGoals(goals: string[]): PipelineState {
  const profile: UserProfile = {
    age: 22,
    goals,
    budget: 30,
    timePerDay: 15,
    flags: { extremeLanguage: false, unrealisticGoals: false },
  };
  return { ...createInitialState(profile), profile };
}

describe("retrieve", () => {
  it("returns non-empty ContextDocs with valid urls for a known goal topic", async () => {
    const result = await retrieve(stateWithGoals(["clear skin"]));

    expect(result.contextDocs?.length).toBeGreaterThan(0);
    for (const doc of result.contextDocs ?? []) {
      expect(() => new URL(doc.url)).not.toThrow();
    }
  });

  it("returns an empty array, not an error, for an unmatched topic", async () => {
    const result = await retrieve(stateWithGoals(["become taller"]));
    expect(result.contextDocs).toEqual([]);
  });

  it("dedupes a doc matched by more than one goal", async () => {
    // "skin" and "peau" are both keywords on the same skincare-101 doc.
    const result = await retrieve(stateWithGoals(["skin", "peau"]));
    const urls = (result.contextDocs ?? []).map((d) => d.url);
    expect(urls.length).toBe(1);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("throws if state.profile is missing (intake did not run)", async () => {
    await expect(retrieve(createInitialState({}))).rejects.toThrow();
  });
});
