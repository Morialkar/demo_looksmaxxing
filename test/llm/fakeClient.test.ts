import { describe, expect, it } from "vitest";
import { FakeLLMClient } from "../../src/llm/fakeClient.js";
import { critiqueVerdictSchema, draftPlanSchema } from "../../src/schemas.js";

describe("FakeLLMClient", () => {
  const client = new FakeLLMClient();

  it("returns a DraftPlan-shaped response for a compose prompt", async () => {
    const prompt = [
      "TASK: COMPOSE",
      "DOC_TITLE: Routine skincare de base",
      "DOC_URL: https://looksmaxxing.guide/articles/skincare-101",
    ].join("\n");

    const raw = await client.generate(prompt);
    const parsed = draftPlanSchema.safeParse(JSON.parse(raw));

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.sections[0]?.references).toEqual([
        {
          title: "Routine skincare de base",
          url: "https://looksmaxxing.guide/articles/skincare-101",
        },
      ]);
    }
  });

  it("returns a revise (pass: false) verdict when the critique prompt carries a risk marker", async () => {
    const prompt = "TASK: CRITIQUE\nRISK_SIGNAL: extreme_diet";
    const raw = await client.generate(prompt);
    const parsed = critiqueVerdictSchema.safeParse(JSON.parse(raw));

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.pass).toBe(false);
      expect(parsed.data.violations.length).toBeGreaterThan(0);
    }
  });

  it("returns a pass verdict for a clean critique prompt", async () => {
    const raw = await client.generate("TASK: CRITIQUE");
    const parsed = critiqueVerdictSchema.safeParse(JSON.parse(raw));

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.pass).toBe(true);
    }
  });

  it("throws on an unrecognized prompt shape instead of returning silent garbage", async () => {
    await expect(client.generate("no marker here")).rejects.toThrow();
  });
});
