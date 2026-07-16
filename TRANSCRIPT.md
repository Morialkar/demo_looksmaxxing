# Session transcript — building looksmaxxing.guide's pipeline under AFTER

This is a reconstructed account of the session that produced this repository, written
in English for reviewers who don't read the French working notes (`plan.md`,
`tasks.md`, commit messages). It is not a raw system log — it's an honest summary of
what was asked, what was decided, and — the part worth reading — the moments where
the AFTER methodology's discipline (phase gates, tests-with-code, explicit markers)
caught a mistake *before* it became a shipped bug, or caught it *in* a test rather
than in review.

## Starting point

The user supplied `plan.md`: a pre-written spec/architecture/test-plan for a 40-minute
interview exercise — a Fastify pipeline that turns a user profile into a personalized
routine, with a safety gate, a curated RAG corpus, and an adversarial critic loop.
The instruction was to build it "following the AFTER methodology" (Architect First,
Test Everything Rigorously — `/Users/nao/AFTER`).

## Phase 0/1 — reading the plan as a spec, not just a to-do list

Before writing any code, the plan was read against AFTER's actual Phase 0/1
requirements (problem/users/goals/non-goals, constraints, tech-choice alternatives,
project standards). Two real gaps surfaced immediately:

- No LLM client was specified for the `compose`/`critique` steps.
- No alternatives were documented for any technology choice.

The user's answer to "what LLM client?" was: *"use OpenCode, or I don't remember, the
free CLI we used in YVCDB."* Rather than guessing what "OpenCode" meant in this
context, the actual `Morialkar/yvcdb` repository was inspected via `gh api`. It turned
out YVCDB does have an `opencode` provider (`internal/runner/provider_opencode.go`) —
but it's a **subprocess wrapper around the `opencode` CLI binary**, built to drive an
interactive coding agent (`opencode run "<message>" --format json --auto`), not an SDK
for generating structured JSON from a running server. Reusing it here would have meant
shelling out to an external binary from inside a Fastify route for what should be a
simple `prompt -> string` call — an architectural mismatch that would only have
surfaced once someone tried to actually wire it in.

This was caught *before any code existed*, by looking at the real thing instead of
trusting the half-remembered name. The resolution: an `LLMClient` interface plus a
deterministic `FakeLLMClient` (no network call, no API key, no `REQUIRES_REVIEW`
surface), with the real-provider swap left as an isolated one-line change for later.

## Mid-plan amendment — the RAG requirement

Partway through (after Task 0 scaffolding, before any schema code existed), the user
added a requirement: the corpus must be the site's own articles, and `compose` must
point users back to them. Because this landed *before* `schemas.ts` was written, it
was folded straight into the Phase 0/1 documents (`ContextDocs.url`,
`DraftPlan.sections[].references`) rather than bolted on after the fact — the kind of
timing AFTER's phase gates are meant to create: catch the shape change while it's
still cheap.

## Task-by-task implementation — where the plan itself turned out to be incomplete

Each of the 11 tasks (0–10) was implemented with tests written alongside the code,
verified by running the actual test command before being marked done, then committed
and pushed individually. Three points in that sequence are worth calling out
specifically, because they're gaps *in the plan that was written before any code was
touched* — not bugs introduced during implementation, but planning omissions that only
became visible once the next task tried to build on top of the missing piece:

1. **Task 4 (`safetyGate`)**: writing the routing logic required a validated
   `UserProfile` on the pipeline state. Checking `tasks.md` showed intake — pipeline
   step 1 in `plan.md`'s own architecture diagram — had never been given its own task
   in the Phase 2 breakdown. It was folded into Task 4 with its own tests
   (`test/pipeline/intake.test.ts`), and `tasks.md` was corrected in the same commit,
   not silently patched.

2. **Task 8 (`format`)**: the acceptance criteria only described turning a `DraftPlan`
   into a `FinalPlan`. But `runPipeline`'s branching (built in Task 3) skips
   `retrieve`/`compose`/`critique` entirely when `safetyGate` routes to `"resources"`
   — meaning `format` can be called with *no* `draftPlan` at all. `tasks.md` didn't
   mention this branch. Caught by re-reading the orchestrator logic before writing
   `format.ts`, fixed by adding a dedicated resources-branch render path and a test
   for it (`route === "resources"` renders resources markdown, not a crash).

3. **`runPipeline`'s signature evolving across three tasks**: Task 3 built it as
   `(state) => Promise<PipelineState>`; Task 10 needed per-step progress for SSE
   streaming. Rather than bolt streaming logic into the route handler and duplicate
   the routing decisions already living in `runPipeline`, an optional
   `PipelineHooks.onStepComplete` callback was added — additive, defaulted to a
   no-op, so Tasks 3 and 9's existing tests kept passing unchanged. Verified by
   re-running the full suite after the change, not assumed.

None of these three were caught by a human reviewer spotting them in a diff — they
surfaced because the next task's *tests* wouldn't make sense (or the code literally
couldn't be written) without the missing piece first. That's the "test everything
rigorously" half of AFTER doing real work, not just documenting intent.

## Design decisions surfaced instead of guessed

A few choices were flagged explicitly rather than resolved silently, per AFTER's
`DECISION_REQUIRED` rule:

- Package manager and folder layout (npm, `src/`+`test/` separated) — asked, not
  assumed.
- LLM client strategy — asked, then corrected once the YVCDB investigation showed the
  first answer didn't fit (see above).
- Git commit/push cadence for the remaining tasks — asked once, then followed
  consistently rather than re-confirmed on every task.
- Whether the fallback plan should carry article references — flagged as an
  `ASSUMPTION` (no references) rather than decided silently; never revisited because
  it never became load-bearing.

## Final phase — adversarial review

Per AFTER's Greenfield workflow, a read-only adversarial pass ran against the full
implementation before calling it done. It surfaced three real findings that unit
tests alone hadn't caught, because they're properties of the *system*, not of any
single function:

1. **The critique loop never feeds `violations`/`revisionNotes` back into `compose`.**
   With a deterministic client, a "revise" verdict regenerates an identical draft on
   every attempt — the loop can only ever land on the hard-coded fallback for any
   profile the critic doesn't pass immediately, never actually converge on a
   corrected draft. This is a real gap in what the "adversarial critic" is supposed
   to do, distinct from whether it's *safe* (it is — the fallback is conservative).
2. **The SSE `{step: "error"}` path in the route handler had zero test coverage** —
   implemented, reachable, never actually executed by a test.
3. **Markdown output isn't escaped** — inert today because the only content source is
   the fully-controlled `FakeLLMClient`, but a live injection surface the moment a
   real LLM provider is swapped in.

The verdict returned was **READY WITH EXPLICITLY ACCEPTED RISKS** — each risk named
for the human to own, not silently waived. The user's call: accept them as known
limitations to state verbally in the interview, rather than spend the remaining time
fixing them.

## Where this leaves the code

- 11 tasks, 11 commits, each with its own passing verification command before being
  pushed.
- 54 tests, full suite green from a clean `npm install && npm run build && npm test`.
- Manual smoke-tested via a real running server (`npm run dev` + `curl`) for all three
  request shapes: healthy profile, under-18/risky profile, malformed body.
- Three planning gaps found and fixed *during* implementation, documented in the
  commits that fixed them rather than smoothed over.
- Three risks named at the end, explicitly accepted rather than silently shipped.

The methodology's actual contribution here wasn't preventing mistakes — plans had
gaps, an early technical guess (`opencode`) was wrong, and the critic loop has a real
design flaw. What it did was surface each of those *before* they were mistaken for
finished work: a task couldn't start until the state it needed existed, a schema
change couldn't land without a plan.md edit in the same breath, and the last phase was
a dedicated pass whose only job was to distrust everything that came before it.
