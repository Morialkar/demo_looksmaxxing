# tasks.md — Phase 2 Plan (AFTER, Greenfield)

Decisions locked for this phase (see conversation for rationale):
- Package manager / layout: npm, `src/` + `test/` separated.
- LLM client: `LLMClient` interface + deterministic `FakeLLMClient`. No real provider,
  no API key, no network call. Swapping in a real provider later is a Task 2 follow-up,
  not part of this plan.
- ASSUMPTION: Node LTS, TypeScript strict mode, Vitest as test runner (per plan.md).

Each task must leave the project in a testable state. Run the listed verification
command and show its output before marking a task done.

---

## Task 0 — Project scaffolding

- **Objective**: npm project, TS config, Vitest config, folder structure.
- **Files**: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `src/`, `test/`.
- **Context**: TS strict mode. Deps: `fastify`, `zod`, `vitest`, `tsx` (dev). Scripts: `build`, `dev`, `test`.
- **Acceptance criteria**: `npm install` succeeds; `npm run build` succeeds on an empty `src/`; `npm test` runs with 0 tests, no error.
- **Tests**: infra task, no unit tests — the verification command below is the check.
- **Dependencies**: none.
- **Verification**: `npm install && npm run build && npm test`

## Task 1 — Schemas & contracts (Zod)

- **Objective**: `UserProfile`, `ContextDocs`, `DraftPlan`, `CritiqueVerdict`, `FinalPlan`, `PipelineState` as Zod schemas + inferred types.
- **Files**: `src/schemas.ts`, `test/schemas.test.ts`.
- **Context**: contracts defined in `plan.md` → "Schémas (contrats)". `ContextDocs` carries a `url` (site article link); `DraftPlan.sections[]` carries `references: { title, url }[]` so `compose` can point users back to the site articles used.
- **Acceptance criteria**: every schema exported; `.safeParse` used at every boundary (no bare `.parse` that can throw uncaught); `references` defaults to `[]` when absent rather than being required non-empty (a section may legitimately cite nothing).
- **Tests**: nominal (valid `UserProfile` parses; `DraftPlan` with populated `references` parses), edge (age boundary, e.g. exactly 18; section with empty `references[]`), error (missing required field; truncated/malformed JSON shaped like a DraftPlan LLM output; `references[].url` not a valid URL string).
- **Dependencies**: Task 0.
- **Verification**: `npx vitest run test/schemas.test.ts`

## Task 2 — LLMClient interface + fake implementation

- **Objective**: `LLMClient` interface (single method, e.g. `generate(prompt: string): Promise<string>`) and a `FakeLLMClient` returning deterministic, schema-shaped output keyed off recognizable prompt markers (compose vs critique).
- **Files**: `src/llm/client.ts`, `src/llm/fakeClient.ts`, `test/llm/fakeClient.test.ts`.
- **Acceptance criteria**: fake output for a compose-shaped prompt parses against `DraftPlan` schema; fake output for a critique-shaped prompt parses against `CritiqueVerdict`.
- **Tests**: nominal (compose prompt → valid DraftPlan JSON string), edge (prompt containing risk markers → fake returns a `revise` verdict), error (unrecognized prompt shape → explicit thrown error, not silent garbage).
- **Dependencies**: Task 1.
- **Verification**: `npx vitest run test/llm/fakeClient.test.ts`

## Task 3 — Pipeline skeleton + state object

- **Objective**: `PipelineState` type and `runPipeline()` orchestrator wiring the 6 steps as pass-through stubs, in order.
- **Files**: `src/pipeline/state.ts`, `src/pipeline/runPipeline.ts`, `src/pipeline/steps/{intake,safetyGate,retrieve,compose,critique,format}.ts` (stubs).
- **Acceptance criteria**: `runPipeline(input)` resolves; each step is called exactly once, in declared order.
- **Tests**: nominal (call order verified via mocks/spies), error (a step throwing rejects the pipeline promise instead of being swallowed).
- **Dependencies**: Task 1.
- **Verification**: `npx vitest run test/pipeline/runPipeline.test.ts`

## Task 4 — `safetyGate` implementation

- **Objective**: age < 18 → route `resources`; extreme-language flag → route `resources`; else → route `normal`.
- **Files**: `src/pipeline/steps/safetyGate.ts`, `test/pipeline/safetyGate.test.ts`.
- **Acceptance criteria**: matches `plan.md` safety rules exactly; no LLM call in this step (pure rule check on `UserProfile.flags`/`age`).
- **Tests**: nominal (adult, clean profile → normal), edge (age exactly 18 → normal, age 17 → resources), error (n/a — malformed profile already rejected upstream by Task 1's schema).
- **Dependencies**: Task 1, 3.
- **Verification**: `npx vitest run test/pipeline/safetyGate.test.ts`

## Task 5 — `retrieve` implementation (stub corpus)

- **Objective**: in-memory corpus array modeling looksmaxxing.guide's own articles (dermatology, base fitness, grooming — evidence-based, no forum content, no external sources). Each entry has a `url` (site slug) alongside `source`/`excerpt`/`topic`. `retrieve()` filters by topic.
- **Files**: `src/corpus/corpus.ts` (static data), `src/pipeline/steps/retrieve.ts`, `test/pipeline/retrieve.test.ts`.
- **Context**: ASSUMPTION — real ingestion of site articles into a RAG store is out of scope; the stub array stands in for it (per plan.md decision #4).
- **Acceptance criteria**: returns non-empty `ContextDocs[]` (each with a valid `url`) for a known goal topic; returns an empty array (not an error) for an unmatched topic.
- **Tests**: nominal, edge (topic with zero matching docs), error n/a (pure function).
- **Dependencies**: Task 1, 3.
- **Verification**: `npx vitest run test/pipeline/retrieve.test.ts`

## Task 6 — `compose` implementation

- **Objective**: build a prompt from `UserProfile` + `ContextDocs`, call `LLMClient.generate`, parse the response against `DraftPlan`, retry once on parse failure, else throw an explicit error. The prompt carries each retrieved doc's `title`/`url`; the parsed `DraftPlan` must populate `sections[].references` from the docs actually relevant to that section's topic — compose directs the user back to the site articles it drew from, it does not invent links.
- **Files**: `src/pipeline/steps/compose.ts`, `test/pipeline/compose.test.ts`.
- **Acceptance criteria**: valid output → `DraftPlan` whose `references[].url` values are a subset of the `url`s present in the `ContextDocs` passed in (no fabricated links); malformed-then-valid → succeeds on retry; malformed twice → explicit thrown error, no crash, no silent fallback here (fallback is critique's job, Task 7).
- **Tests**: nominal (section references trace back to retrieved doc urls), edge (retry-then-succeed; topic with no matching doc → `references: []`, not fabricated), error (both attempts malformed).
- **Dependencies**: Task 1, 2, 3, 5.
- **Verification**: `npx vitest run test/pipeline/compose.test.ts`

## Task 7 — `critique` implementation (adversarial loop)

- **Objective**: second LLM call with a rejection-oriented prompt (unsupervised medical claims, invasive procedures, extreme dietary restriction). `pass` → proceed; `revise` → loop back to compose, max 2 times; exceeding max → hard-coded conservative fallback `DraftPlan`.
- **Files**: `src/pipeline/steps/critique.ts`, `src/pipeline/fallbackPlan.ts`, `test/pipeline/critique.test.ts`.
- **Acceptance criteria**: loop terminates in all cases (no infinite loop possible even if LLM always returns `revise`).
- **Tests**: nominal (pass on first try), edge (revise once then pass), error (revise 3 times → fallback triggers, loop terminates at bound).
- **Dependencies**: Task 1, 2, 3, 6.
- **Verification**: `npx vitest run test/pipeline/critique.test.ts`

## Task 8 — `format` implementation

- **Objective**: `DraftPlan` (or the fallback plan) → `FinalPlan` (markdown + non-empty `disclaimers[]`). Each section's `references[]` is rendered as a "Pour aller plus loin" markdown link list directly under that section.
- **Files**: `src/pipeline/steps/format.ts`, `test/pipeline/format.test.ts`.
- **Acceptance criteria**: `disclaimers.length > 0` in every case, including the fallback path; a section with `references: []` renders with no link list (not an empty heading); ASSUMPTION — the fallback plan (Task 7) ships with `references: []` throughout, ships no article links.
- **Tests**: nominal (references rendered as markdown links), edge (fallback plan formats correctly with no reference links; section with empty references omits the block), error n/a.
- **Dependencies**: Task 1, 3.
- **Verification**: `npx vitest run test/pipeline/format.test.ts`

## Task 9 — Integration tests (full pipeline, LLM faked)

- **Objective**: exercise `runPipeline()` end to end with `FakeLLMClient`, per `plan.md` → "Intégration".
- **Files**: `test/pipeline/integration.test.ts`.
- **Acceptance criteria**: (1) healthy profile → valid `FinalPlan` with disclaimers; (2) risky profile (age < 18 or extreme language) → `resources` output, no routine generated; (3) compose invalid twice → clean thrown error surfaced to the caller, not a crash.
- **Tests**: the three scenarios above, each as its own test case.
- **Dependencies**: Tasks 1–8.
- **Verification**: `npx vitest run test/pipeline/integration.test.ts`

## Task 10 — Fastify endpoint + SSE

- **Objective**: `POST /workflow`, SSE stream emitting one event per pipeline step as it completes.
- **Files**: `src/server.ts`, `src/routes/workflow.ts`, `test/routes/workflow.test.ts`.
- **Acceptance criteria**: malformed request body → `400` with a Zod-derived error message (validation at the API boundary, Task 1 schemas reused); valid body → SSE stream with one event per step + a final event; risky profile → stream short-circuits to a `resources` event only.
- **Tests**: nominal (valid body streams all events), error (malformed body → 400), edge (risky profile → short-circuit).
- **Dependencies**: Tasks 1–9.
- **Verification**: `npx vitest run test/routes/workflow.test.ts`, then manual smoke test: `npm run dev` in one shell, `curl -N -X POST http://localhost:3000/workflow -H "Content-Type: application/json" -d '{...}'` in another.

---

## Notes carried from plan.md

- `REQUIRES_REVIEW`: none expected in this plan — no auth, no payments, no real secrets
  (LLM client is faked). If a real `LLMClient` provider is added later, that change
  is `REQUIRES_REVIEW` for secret handling.
- Corpus curation (evidence-based only, no forum content) is a product decision to be
  stated verbally in the interview per `plan.md`; Task 5's code comment restates it as
  the reason the corpus is a hand-picked array, not a scraped one.
- Out of scope, unchanged from `plan.md`: real vector store, auth, rate limiting,
  persistence, critic fine-tuning/evals.
