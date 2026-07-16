import { describe, expect, it, vi } from "vitest";
import { createCritique } from "../../src/pipeline/steps/critique.js";
import { fallbackPlan } from "../../src/pipeline/fallbackPlan.js";
import { createInitialState, type PipelineState } from "../../src/pipeline/state.js";
import type { DraftPlan, UserProfile } from "../../src/schemas.js";

const profile: UserProfile = {
  age: 22,
  goals: ["clear skin"],
  budget: 30,
  timePerDay: 15,
  flags: { extremeLanguage: false, unrealisticGoals: false },
};

const draftPlan: DraftPlan = {
  sections: [
    { topic: "skincare", steps: ["Nettoyant doux"], frequency: "quotidien", references: [] },
  ],
};

function stateWithDraft(): PipelineState {
  return { ...createInitialState(profile), profile, draftPlan };
}

const passVerdict = JSON.stringify({ pass: true, violations: [], revisionNotes: "" });
const reviseVerdict = JSON.stringify({
  pass: false,
  violations: ["contenu à risque"],
  revisionNotes: "reformuler",
});

describe("critique", () => {
  it("passes on the first evaluation without calling compose again", async () => {
    const generate = vi.fn().mockResolvedValue(passVerdict);
    const composeStep = vi.fn(async (s: PipelineState) => s);
    const critique = createCritique({ generate }, composeStep);

    const result = await critique(stateWithDraft());

    expect(result.critique?.pass).toBe(true);
    expect(composeStep).not.toHaveBeenCalled();
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("revises once via compose, then passes on the second evaluation", async () => {
    const generate = vi
      .fn()
      .mockResolvedValueOnce(reviseVerdict)
      .mockResolvedValueOnce(passVerdict);
    const newDraft: DraftPlan = {
      sections: [
        { topic: "skincare", steps: ["Version révisée"], frequency: "quotidien", references: [] },
      ],
    };
    const composeStep = vi.fn(async (s: PipelineState) => ({ ...s, draftPlan: newDraft }));
    const critique = createCritique({ generate }, composeStep);

    const result = await critique(stateWithDraft());

    expect(composeStep).toHaveBeenCalledTimes(1);
    expect(result.critique?.pass).toBe(true);
    expect(result.draftPlan).toEqual(newDraft);
    expect(result.revisionCount).toBe(1);
  });

  it("falls back to the hard-coded conservative plan after 2 revisions, loop terminates", async () => {
    const generate = vi.fn().mockResolvedValue(reviseVerdict); // always revise
    const composeStep = vi.fn(async (s: PipelineState) => s);
    const critique = createCritique({ generate }, composeStep);

    const result = await critique(stateWithDraft());

    expect(composeStep).toHaveBeenCalledTimes(2); // MAX_REVISIONS
    expect(generate).toHaveBeenCalledTimes(3); // initial + 2 revisions
    expect(result.draftPlan).toEqual(fallbackPlan);
    expect(result.critique?.pass).toBe(true);
  });

  it("throws if state.draftPlan is missing (compose did not run)", async () => {
    const generate = vi.fn().mockResolvedValue(passVerdict);
    const composeStep = vi.fn(async (s: PipelineState) => s);
    const critique = createCritique({ generate }, composeStep);

    await expect(
      critique({ ...createInitialState(profile), profile }),
    ).rejects.toThrow();
  });
});
