# looksmaxxing.guide — agentic routine pipeline

A small Fastify service that turns a user profile into a personalized, safety-gated
routine, streamed step by step over SSE. Built as an interview exercise, following
the [AFTER methodology](https://github.com/Morialkar/after) (Architect First, Test
Everything Rigorously).

```
POST /workflow (SSE)
  intake → safetyGate → retrieve → compose → critique → format
```

- **Safety first**: age/language checks route risky profiles straight to resources,
  before any generation happens.
- **Grounded RAG**: the corpus is looksmaxxing.guide's own articles (stubbed
  in-memory); `compose` only ever cites articles it was actually given.
- **Adversarial critic**: a second LLM pass rejects unsupervised medical claims,
  invasive procedures, and extreme restriction, revising up to twice before falling
  back to a hard-coded conservative plan.
- **No real LLM provider**: `LLMClient` is an interface with a deterministic
  `FakeLLMClient` behind it — no API key, no network call, swappable later.

## Run it

```bash
npm install
npm run build   # type-check + compile
npm test        # 54 tests, Vitest
npm run dev      # http://localhost:3000
```

```bash
curl -N -X POST http://localhost:3000/workflow \
  -H "Content-Type: application/json" \
  -d '{"age":22,"goals":["clear skin"],"budget":30,"timePerDay":15,"flags":{"extremeLanguage":false,"unrealisticGoals":false}}'
```

## Docs

- [`plan.md`](plan.md) — spec and architecture.
- [`tasks.md`](tasks.md) — Phase 2 task breakdown, one entry per implementation task.
- [`CLAUDE.md`](CLAUDE.md) — the AFTER protocol this project was built under.
- [`TRANSCRIPT.md`](TRANSCRIPT.md) — how the methodology caught planning gaps and a
  design flaw along the way.

## License

MIT — see [LICENSE](LICENSE).
