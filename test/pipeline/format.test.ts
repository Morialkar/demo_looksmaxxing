import { describe, expect, it } from "vitest";
import { format } from "../../src/pipeline/steps/format.js";
import { fallbackPlan } from "../../src/pipeline/fallbackPlan.js";
import { createInitialState, type PipelineState } from "../../src/pipeline/state.js";
import type { DraftPlan } from "../../src/schemas.js";

const draftPlanWithRefs: DraftPlan = {
  sections: [
    {
      topic: "skincare",
      steps: ["Nettoyant doux matin et soir"],
      frequency: "quotidien",
      references: [
        {
          title: "Routine skincare de base",
          url: "https://looksmaxxing.guide/articles/skincare-101",
        },
      ],
    },
  ],
};

function stateWithDraftPlan(draftPlan: DraftPlan): PipelineState {
  return { ...createInitialState({}), draftPlan };
}

describe("format", () => {
  it("renders section references as a 'Pour aller plus loin' markdown link list", async () => {
    const result = await format(stateWithDraftPlan(draftPlanWithRefs));

    expect(result.finalPlan?.markdown).toContain("Pour aller plus loin");
    expect(result.finalPlan?.markdown).toContain(
      "[Routine skincare de base](https://looksmaxxing.guide/articles/skincare-101)",
    );
    expect(result.finalPlan?.disclaimers.length).toBeGreaterThan(0);
  });

  it("omits the reference block for a section with references: []", async () => {
    const noRefsPlan: DraftPlan = {
      sections: [
        { topic: "fitness", steps: ["10 min de marche"], frequency: "quotidien", references: [] },
      ],
    };
    const result = await format(stateWithDraftPlan(noRefsPlan));

    expect(result.finalPlan?.markdown).not.toContain("Pour aller plus loin");
  });

  it("formats the fallback plan with disclaimers and no reference links", async () => {
    const result = await format(stateWithDraftPlan(fallbackPlan));

    expect(result.finalPlan?.disclaimers.length).toBeGreaterThan(0);
    expect(result.finalPlan?.markdown).not.toContain("Pour aller plus loin");
  });

  it("renders resources markdown when route is 'resources', with no draftPlan needed", async () => {
    const state: PipelineState = { ...createInitialState({}), route: "resources" };
    const result = await format(state);

    expect(result.finalPlan?.markdown).toContain("Ressources");
    expect(result.finalPlan?.disclaimers.length).toBeGreaterThan(0);
  });

  it("throws if draftPlan is missing and route isn't 'resources'", async () => {
    await expect(format(createInitialState({}))).rejects.toThrow();
  });
});
