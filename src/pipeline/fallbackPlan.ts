import type { DraftPlan } from "../schemas.js";

// Hard-coded conservative fallback per plan.md: used when critique's
// adversarial loop can't get a compliant draft within 2 revisions.
// ASSUMPTION: ships with no article references — generic-safe content only,
// not tied to any specific retrieved doc.
export const fallbackPlan: DraftPlan = {
  sections: [
    {
      topic: "general",
      steps: [
        "Nettoyant doux et hydratant, deux fois par jour.",
        "30 minutes d'activité physique modérée, 3 à 4 fois par semaine.",
        "Sommeil régulier et alimentation équilibrée, sans restriction.",
      ],
      frequency: "quotidien",
      references: [],
    },
  ],
};
