// ASSUMPTION: a single generate(prompt) => string method is enough for both
// compose and critique — both steps parse the returned string against a Zod
// schema themselves, so the interface stays provider-agnostic.
export interface LLMClient {
  generate(prompt: string): Promise<string>;
}
