import { afterEach, describe, expect, it, vi } from "vitest";
import { runPipeline } from "../../src/pipeline/runPipeline.js";
import { createInitialState } from "../../src/pipeline/state.js";
import * as composeModule from "../../src/pipeline/steps/compose.js";
import * as critiqueModule from "../../src/pipeline/steps/critique.js";
import * as formatModule from "../../src/pipeline/steps/format.js";

afterEach(() => {
  vi.restoreAllMocks();
});

const healthyRaw = {
  age: 22,
  goals: ["clear skin"],
  budget: 30,
  timePerDay: 15,
  flags: { extremeLanguage: false, unrealisticGoals: false },
};

describe("runPipeline integration (FakeLLMClient, per plan.md 'Intégration')", () => {
  it("produces a valid FinalPlan with disclaimers for a healthy profile", async () => {
    const result = await runPipeline(createInitialState(healthyRaw));

    expect(result.route).toBe("normal");
    expect(result.finalPlan?.markdown.length).toBeGreaterThan(0);
    expect(result.finalPlan?.disclaimers.length).toBeGreaterThan(0);
  });

  it("routes an under-18 profile to resources, no routine generated", async () => {
    const result = await runPipeline(
      createInitialState({ ...healthyRaw, age: 15 }),
    );

    expect(result.route).toBe("resources");
    expect(result.draftPlan).toBeUndefined();
    expect(result.finalPlan?.markdown).toContain("Ressources");
    expect(result.finalPlan?.disclaimers.length).toBeGreaterThan(0);
  });

  it("routes an extreme-language profile to resources, no routine generated", async () => {
    const result = await runPipeline(
      createInitialState({
        ...healthyRaw,
        flags: { extremeLanguage: true, unrealisticGoals: false },
      }),
    );

    expect(result.route).toBe("resources");
    expect(result.draftPlan).toBeUndefined();
  });

  it("surfaces a clean error when compose fails, without calling critique/format or crashing", async () => {
    const composeSpy = vi
      .spyOn(composeModule, "compose")
      .mockRejectedValueOnce(
        new Error("compose: LLM output invalid after 2 attempts"),
      );
    const critiqueSpy = vi.spyOn(critiqueModule, "critique");
    const formatSpy = vi.spyOn(formatModule, "format");

    await expect(runPipeline(createInitialState(healthyRaw))).rejects.toThrow(
      "compose: LLM output invalid",
    );

    expect(composeSpy).toHaveBeenCalledTimes(1);
    expect(critiqueSpy).not.toHaveBeenCalled();
    expect(formatSpy).not.toHaveBeenCalled();
  });
});
