import type { DraftPlan, DraftPlanSection, FinalPlan } from "../../schemas.js";
import type { PipelineState } from "../state.js";

const STANDARD_DISCLAIMERS = [
  "Ceci n'est pas un avis médical. Consulte un professionnel de santé pour toute question spécifique.",
];

const RESOURCES_DISCLAIMERS = [
  "Nous n'avons pas généré de routine pour ce profil.",
  "Si tu te sens en difficulté, parles-en à un adulte de confiance ou à un professionnel de santé.",
];

function renderSection(section: DraftPlanSection): string {
  const lines = [`## ${section.topic}`, `Fréquence: ${section.frequency}`, "", ...section.steps.map((s) => `- ${s}`)];
  if (section.references.length > 0) {
    lines.push("", "**Pour aller plus loin**");
    lines.push(...section.references.map((r) => `- [${r.title}](${r.url})`));
  }
  return lines.join("\n");
}

function renderDraftPlan(draftPlan: DraftPlan): string {
  return draftPlan.sections.map(renderSection).join("\n\n");
}

function renderResources(): string {
  return [
    "# Ressources",
    "",
    "Nous n'avons pas pu générer de routine personnalisée pour ce profil.",
    "",
    "- Parles-en à un adulte de confiance.",
    "- [Fil Santé Jeunes](https://www.filsantejeunes.com/)",
  ].join("\n");
}

export async function format(state: PipelineState): Promise<PipelineState> {
  if (state.route === "resources") {
    const finalPlan: FinalPlan = {
      markdown: renderResources(),
      disclaimers: RESOURCES_DISCLAIMERS,
    };
    return { ...state, finalPlan };
  }

  if (!state.draftPlan) {
    throw new Error("format: state.draftPlan is not set — compose/critique must run first");
  }

  const finalPlan: FinalPlan = {
    markdown: renderDraftPlan(state.draftPlan),
    disclaimers: STANDARD_DISCLAIMERS,
  };
  return { ...state, finalPlan };
}
