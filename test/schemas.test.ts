import { describe, expect, it } from "vitest";
import {
  contextDocSchema,
  contextDocsSchema,
  critiqueVerdictSchema,
  draftPlanSchema,
  finalPlanSchema,
  userProfileSchema,
} from "../src/schemas.js";

describe("userProfileSchema", () => {
  it("parses a nominal valid profile", () => {
    const result = userProfileSchema.safeParse({
      age: 22,
      goals: ["clear skin"],
      budget: 50,
      timePerDay: 15,
      flags: { extremeLanguage: false, unrealisticGoals: false },
    });
    expect(result.success).toBe(true);
  });

  it("parses the age-18 boundary without an off-by-one rejection", () => {
    const result = userProfileSchema.safeParse({
      age: 18,
      goals: ["fitness"],
      budget: 0,
      timePerDay: 10,
      flags: { extremeLanguage: false, unrealisticGoals: false },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a profile missing a required field", () => {
    const result = userProfileSchema.safeParse({
      age: 22,
      budget: 50,
      timePerDay: 15,
      flags: { extremeLanguage: false, unrealisticGoals: false },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-positive age", () => {
    const result = userProfileSchema.safeParse({
      age: 0,
      goals: ["fitness"],
      budget: 0,
      timePerDay: 10,
      flags: { extremeLanguage: false, unrealisticGoals: false },
    });
    expect(result.success).toBe(false);
  });
});

describe("contextDocSchema / contextDocsSchema", () => {
  it("parses a nominal array of site-article docs", () => {
    const result = contextDocsSchema.safeParse([
      {
        source: "Routine skincare de base",
        excerpt: "Nettoyant doux deux fois par jour...",
        topic: "skincare",
        url: "https://looksmaxxing.guide/articles/skincare-101",
      },
    ]);
    expect(result.success).toBe(true);
  });

  it("rejects a doc with a non-URL url field", () => {
    const result = contextDocSchema.safeParse({
      source: "Routine skincare de base",
      excerpt: "Nettoyant doux deux fois par jour...",
      topic: "skincare",
      url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });
});

describe("draftPlanSchema", () => {
  it("parses a nominal plan with populated references", () => {
    const result = draftPlanSchema.safeParse({
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
    expect(result.success).toBe(true);
  });

  it("defaults references to [] when a section cites nothing", () => {
    const result = draftPlanSchema.safeParse({
      sections: [
        { topic: "fitness", steps: ["10 min de marche"], frequency: "quotidien" },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sections[0]?.references).toEqual([]);
    }
  });

  it("rejects a truncated LLM-shaped output missing required section fields", () => {
    const result = draftPlanSchema.safeParse({
      sections: [{ topic: "skincare" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a section reference with an invalid url", () => {
    const result = draftPlanSchema.safeParse({
      sections: [
        {
          topic: "skincare",
          steps: ["Nettoyant doux"],
          frequency: "quotidien",
          references: [{ title: "Article", url: "not-a-url" }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe("critiqueVerdictSchema", () => {
  it("parses a nominal pass verdict", () => {
    const result = critiqueVerdictSchema.safeParse({ pass: true });
    expect(result.success).toBe(true);
  });

  it("rejects a verdict missing the required pass field", () => {
    const result = critiqueVerdictSchema.safeParse({ violations: [] });
    expect(result.success).toBe(false);
  });
});

describe("finalPlanSchema", () => {
  it("parses a nominal final plan", () => {
    const result = finalPlanSchema.safeParse({
      markdown: "# Ta routine",
      disclaimers: ["Ceci n'est pas un avis médical."],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a final plan with no disclaimers", () => {
    const result = finalPlanSchema.safeParse({
      markdown: "# Ta routine",
      disclaimers: [],
    });
    expect(result.success).toBe(false);
  });
});
