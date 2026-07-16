import type { ContextDoc } from "../schemas.js";

// ASSUMPTION: stands in for real RAG ingestion of looksmaxxing.guide's own
// articles (plan.md decision #4 — corpus = site articles, evidence-based,
// no forums, no external sources). `keywords` is an internal matching aid
// only, not part of the ContextDocs contract, so it never leaks past
// retrieve() into compose's prompt or the API response.
interface CorpusEntry {
  doc: ContextDoc;
  keywords: string[];
}

const corpus: CorpusEntry[] = [
  {
    doc: {
      source: "Routine skincare de base",
      excerpt:
        "Nettoyant doux matin et soir, hydratant, SPF 30+ tous les jours. Éviter le surgommage.",
      topic: "skincare",
      url: "https://looksmaxxing.guide/articles/skincare-101",
    },
    keywords: ["skin", "peau", "visage"],
  },
  {
    doc: {
      source: "Comprendre l'acné sans paniquer",
      excerpt:
        "L'acné est multifactorielle; consulter un dermatologue avant tout traitement agressif.",
      topic: "skincare",
      url: "https://looksmaxxing.guide/articles/acne-comprendre",
    },
    keywords: ["acne", "acné", "boutons"],
  },
  {
    doc: {
      source: "Musculation pour débutants",
      excerpt:
        "3 séances par semaine, mouvements composés, progression graduelle, repos suffisant.",
      topic: "fitness",
      url: "https://looksmaxxing.guide/articles/muscu-debutant",
    },
    keywords: ["muscle", "muscu", "fitness", "gym"],
  },
  {
    doc: {
      source: "Nutrition de base pour la prise de masse ou la perte de gras",
      excerpt:
        "Un déficit ou surplus calorique modéré, pas de restriction extrême. Manger varié.",
      topic: "fitness",
      url: "https://looksmaxxing.guide/articles/nutrition-base",
    },
    keywords: ["nutrition", "poids", "gras", "masse", "alimentation"],
  },
  {
    doc: {
      source: "Entretien de la barbe et des cheveux",
      excerpt:
        "Shampoing adapté, huile à barbe, coupe régulière chez un professionnel.",
      topic: "grooming",
      url: "https://looksmaxxing.guide/articles/grooming-base",
    },
    keywords: ["cheveux", "hair", "barbe", "beard", "grooming"],
  },
];

// Free-text goals ("clear skin") are matched to articles by substring
// keyword, not exact topic equality — a real embedding-based RAG search is
// explicitly out of scope (plan.md: "Vraie base vectorielle... hors scope").
export function findDocsForGoal(goal: string): ContextDoc[] {
  const g = goal.toLowerCase();
  return corpus
    .filter((entry) => entry.keywords.some((keyword) => g.includes(keyword)))
    .map((entry) => entry.doc);
}
