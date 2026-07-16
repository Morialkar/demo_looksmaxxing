import { describe, expect, it, vi } from "vitest";
import { ComposeError, createCompose } from "../../src/pipeline/steps/compose.js";
import { createInitialState, type PipelineState } from "../../src/pipeline/state.js";
import type { ContextDoc, UserProfile } from "../../src/schemas.js";

const profile: UserProfile = {
  age: 22,
  goals: ["clear skin"],
  budget: 30,
  timePerDay: 15,
  flags: { extremeLanguage: false, unrealisticGoals: false },
};

const contextDocs: ContextDoc[] = [
  {
    source: "Routine skincare de base",
    excerpt: "Nettoyant doux matin et soir.",
    topic: "skincare",
    url: "https://looksmaxxing.guide/articles/skincare-101",
  },
];

function stateWithDocs(docs: ContextDoc[]): PipelineState {
  return { ...createInitialState(profile), profile, contextDocs: docs };
}

const validDraftPlanJson = JSON.stringify({
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
});

describe("compose", () => {
  it("returns a DraftPlan whose references trace back to the retrieved docs", async () => {
    const compose = createCompose({ generate: vi.fn().mockResolvedValue(validDraftPlanJson) });

    const result = await compose(stateWithDocs(contextDocs));

    expect(result.draftPlan?.sections[0]?.references).toEqual([
      {
        title: "Routine skincare de base",
        url: "https://looksmaxxing.guide/articles/skincare-101",
      },
    ]);
  });

  it("strips a reference url that isn't among the retrieved ContextDocs (no fabricated links)", async () => {
    const fabricated = JSON.stringify({
      sections: [
        {
          topic: "skincare",
          steps: ["Nettoyant doux"],
          frequency: "quotidien",
          references: [
            { title: "Invented", url: "https://looksmaxxing.guide/articles/does-not-exist" },
          ],
        },
      ],
    });
    const compose = createCompose({ generate: vi.fn().mockResolvedValue(fabricated) });

    const result = await compose(stateWithDocs(contextDocs));

    expect(result.draftPlan?.sections[0]?.references).toEqual([]);
  });

  it("returns references: [] when no docs were retrieved for the topic", async () => {
    const noRefsResponse = JSON.stringify({
      sections: [{ topic: "unknown", steps: ["step"], frequency: "quotidien" }],
    });
    const compose = createCompose({ generate: vi.fn().mockResolvedValue(noRefsResponse) });

    const result = await compose(stateWithDocs([]));

    expect(result.draftPlan?.sections[0]?.references).toEqual([]);
  });

  it("retries once on malformed output and succeeds on the second attempt", async () => {
    const generate = vi
      .fn()
      .mockResolvedValueOnce("not json")
      .mockResolvedValueOnce(validDraftPlanJson);
    const compose = createCompose({ generate });

    const result = await compose(stateWithDocs(contextDocs));

    expect(generate).toHaveBeenCalledTimes(2);
    expect(result.draftPlan).toBeDefined();
  });

  it("throws ComposeError after two malformed attempts, no crash", async () => {
    const generate = vi.fn().mockResolvedValue("not json");
    const compose = createCompose({ generate });

    await expect(compose(stateWithDocs(contextDocs))).rejects.toThrow(ComposeError);
    expect(generate).toHaveBeenCalledTimes(2);
  });
});
