# plan.md — Agentic workflow looksmaxxing.guide (AFTER)

## Context and constraints

* Interview exercise, 40 minutes, TS/Node stack (Fastify).
* At-risk domain: young audience, widespread pseudo-science. Safety is an
  architectural decision, not a patch.
* Goal: a multi-step pipeline that generates a personalized routine from a user
  profile, with a critic loop.

## Architect First

### Overview

```
POST /workflow (SSE)
  └─> runPipeline(input)
        1. intake      → UserProfile (Zod)
        2. safetyGate  → route: normal | resources
        3. retrieve    → ContextDocs (vetted corpus only)
        4. compose     → DraftPlan (structured output)
        5. critique    → verdict: pass | revise (max 2 loops) | fallback
        6. format      → FinalPlan (markdown + disclaimers)
```

### Architecture decisions

1. Typed state object, pure functions. Each step: `(state: PipelineState) => Promise<PipelineState>`. No orchestration framework; extensible to BullMQ in production.
2. Zod at every boundary. Every LLM output is parsed and validated. Parse failure = retry once, otherwise an explicit error.
3. Safety gate before the pipeline, not after. Age gate + extreme-language detection in intake. The "resources" route short-circuits generation.
4. Curated RAG corpus. The corpus is made up of looksmaxxing.guide's own articles (dermatology, base fitness, grooming) — no external sources, no forum content. `compose` must point the user back to the relevant articles used (see `references` in `DraftPlan`). Real ingestion of articles into the RAG is out of scope for this exercise: assumed to already exist (ASSUMPTION), only the in-memory stub is implemented.
5. Adversarial critic. Second LLM call with a rejection-oriented prompt: unsupervised medical claims, invasive procedures, extreme dietary restriction. Max 2 revisions, otherwise a hard-coded conservative fallback.
6. SSE for step streaming. The client sees progress step by step.

### Schemas (contracts)

* `UserProfile`: age, goals[], budget, timePerDay, flags{ extremeLanguage, unrealisticGoals }
* `ContextDocs`: { source, excerpt, topic, url }[] — `url` points to the site article
* `DraftPlan`: sections[{ topic, steps[], frequency, references[{ title, url }] }]
* `CritiqueVerdict`: { pass: boolean, violations[], revisionNotes }
* `FinalPlan`: markdown (with "Go further" links per section) + disclaimers[]

## Test Everything Rigorously

### Unit tests (Vitest)

* Zod: every schema rejects malformed payloads and truncated LLM outputs.
* `safetyGate`: age < 18 → resources route; extreme language detected → resources route; normal profile → normal route.
* `critique`: "revise" verdict loops up to 2 times then falls back; "pass" verdict continues.
* Every step is pure: same input state, same output state (LLM mocked).

### Integration

* Full pipeline with mocked LLM: healthy profile → valid FinalPlan with disclaimers present.
* At-risk profile → no routine generated, resources output.
* Invalid LLM output at the compose step → one retry, then a clean error (no crash).

### Adversarial cases (name them in the interview)

* Prompt injection in quiz answers ("ignore previous instructions").
* Disguised goals (extreme caloric restriction framed as "fitness").
* A minor lying about their age: known limitation, to be documented honestly.

## Execution order (40 min)

1. (5 min) Zod schemas, all contracts first.
2. (5 min) Pipeline skeleton + state object, steps as stubs.
3. (10 min) Unit tests on safetyGate and the critique loop (LLM mocked).
4. (15 min) Step implementation, short inline prompts.
5. (5 min) Fastify + SSE endpoint, manual smoke test.

## Out of scope (say it, don't build it)

* Real vector store (a stub array of docs is enough).
* Auth, rate limiting, persistence.
* Critic fine-tuning; in production we'd add evals.
