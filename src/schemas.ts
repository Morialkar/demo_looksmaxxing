import { z } from "zod";

export const userProfileSchema = z.object({
  age: z.number().int().min(1).max(120),
  goals: z.array(z.string().min(1)).min(1),
  budget: z.number().nonnegative(),
  timePerDay: z.number().positive(),
  flags: z.object({
    extremeLanguage: z.boolean(),
    unrealisticGoals: z.boolean(),
  }),
});
export type UserProfile = z.infer<typeof userProfileSchema>;

export const contextDocSchema = z.object({
  source: z.string().min(1),
  excerpt: z.string().min(1),
  topic: z.string().min(1),
  url: z.string().url(),
});
export type ContextDoc = z.infer<typeof contextDocSchema>;

export const contextDocsSchema = z.array(contextDocSchema);
export type ContextDocs = z.infer<typeof contextDocsSchema>;

export const referenceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
});
export type Reference = z.infer<typeof referenceSchema>;

export const draftPlanSectionSchema = z.object({
  topic: z.string().min(1),
  steps: z.array(z.string().min(1)).min(1),
  frequency: z.string().min(1),
  references: z.array(referenceSchema).default([]),
});
export type DraftPlanSection = z.infer<typeof draftPlanSectionSchema>;

export const draftPlanSchema = z.object({
  sections: z.array(draftPlanSectionSchema).min(1),
});
export type DraftPlan = z.infer<typeof draftPlanSchema>;

export const critiqueVerdictSchema = z.object({
  pass: z.boolean(),
  violations: z.array(z.string()).default([]),
  revisionNotes: z.string().default(""),
});
export type CritiqueVerdict = z.infer<typeof critiqueVerdictSchema>;

// disclaimers.length > 0 is enforced here, not left to the format step to
// remember (Task 8 acceptance criteria: every FinalPlan carries disclaimers).
export const finalPlanSchema = z.object({
  markdown: z.string().min(1),
  disclaimers: z.array(z.string().min(1)).min(1),
});
export type FinalPlan = z.infer<typeof finalPlanSchema>;
