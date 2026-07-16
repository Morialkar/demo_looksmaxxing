import type { LLMClient } from "./client.js";

// ASSUMPTION: prompt marker convention shared with the compose/critique steps
// (Task 6/7). Real steps build prompts containing these markers; a real
// provider swapped in later would ignore them, an LLM just reads the prompt.
export const COMPOSE_MARKER = "TASK: COMPOSE";
export const CRITIQUE_MARKER = "TASK: CRITIQUE";
export const RISK_MARKER = "RISK_SIGNAL:";

const DOC_TITLE_RE = /DOC_TITLE: (.+)/g;
const DOC_URL_RE = /DOC_URL: (\S+)/g;

// Deterministic stand-in for a real LLM: no network call, no API key, no
// REQUIRES_REVIEW surface. Swapping in a real provider is a follow-up task,
// not part of this exercise (see plan.md decision on LLMClient).
export class FakeLLMClient implements LLMClient {
  async generate(prompt: string): Promise<string> {
    if (prompt.includes(COMPOSE_MARKER)) {
      return this.composeResponse(prompt);
    }
    if (prompt.includes(CRITIQUE_MARKER)) {
      return this.critiqueResponse(prompt);
    }
    throw new Error(
      `FakeLLMClient: unrecognized prompt shape (missing ${COMPOSE_MARKER} or ${CRITIQUE_MARKER} marker)`,
    );
  }

  private composeResponse(prompt: string): string {
    const titles = [...prompt.matchAll(DOC_TITLE_RE)].map((m) => m[1]);
    const urls = [...prompt.matchAll(DOC_URL_RE)].map((m) => m[1]);
    const references =
      urls.length > 0 && urls[0] !== undefined
        ? [{ title: titles[0] ?? "Article", url: urls[0] }]
        : [];

    const plan = {
      sections: [
        {
          topic: "general",
          steps: ["Étape générée par le fake LLM"],
          frequency: "quotidien",
          references,
        },
      ],
    };
    return JSON.stringify(plan);
  }

  private critiqueResponse(prompt: string): string {
    const risky = prompt.includes(RISK_MARKER);
    const verdict = risky
      ? {
          pass: false,
          violations: ["contenu à risque détecté"],
          revisionNotes: "Retirer le contenu à risque et reformuler.",
        }
      : { pass: true, violations: [], revisionNotes: "" };
    return JSON.stringify(verdict);
  }
}
