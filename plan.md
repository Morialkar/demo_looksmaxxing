# plan.md — Agentic workflow looksmaxxing.guide (AFTER)

## Contexte et contraintes

* Exercice d'interview, 40 minutes, stack TS/Node (Fastify).
* Domaine à risque: public jeune, pseudo-science répandue. La safety est une décision d'architecture, pas un patch.
* Objectif: pipeline multi-étapes qui génère une routine personnalisée à partir d'un profil utilisateur, avec critic loop.

## Architect First

### Vue d'ensemble

```
POST /workflow (SSE)
  └─> runPipeline(input)
        1. intake      → UserProfile (Zod)
        2. safetyGate  → route: normal | resources
        3. retrieve    → ContextDocs (corpus vetté seulement)
        4. compose     → DraftPlan (structured output)
        5. critique    → verdict: pass | revise (max 2 loops) | fallback
        6. format      → FinalPlan (markdown + disclaimers)
```

### Décisions d'architecture

1. State object typé, fonctions pures. Chaque étape: `(state: PipelineState) => Promise<PipelineState>`. Pas de framework d'orchestration; extensible vers BullMQ en prod.
2. Zod à chaque frontière. Tout output LLM est parsé et validé. Échec de parse = retry une fois, sinon erreur explicite.
3. Safety gate avant le pipeline, pas après. Age-gate + détection de langage extrême dans l'intake. Route "resources" court-circuite la génération.
4. Corpus RAG curé. Le corpus est constitué des articles du site looksmaxxing.guide lui-même (dermato, fitness de base, grooming), pas de sources externes ni de contenu de forums. `compose` doit orienter l'utilisateur vers les articles pertinents utilisés (voir `references` dans `DraftPlan`). L'ingestion réelle des articles dans le RAG est hors scope de cet exercice: on assume qu'elle existe déjà (ASSUMPTION), seul le stub in-memory est implémenté.
5. Critic adversarial. Deuxième appel LLM avec prompt de rejet: médical non supervisé, procédures invasives, restriction alimentaire extrême. Max 2 révisions, sinon fallback conservateur hard-codé.
6. SSE pour le streaming des étapes. Le client voit la progression step par step.

### Schémas (contrats)

* `UserProfile`: age, goals[], budget, timePerDay, flags{ extremeLanguage, unrealisticGoals }
* `ContextDocs`: { source, excerpt, topic, url }[] — `url` pointe vers l'article du site
* `DraftPlan`: sections[{ topic, steps[], frequency, references[{ title, url }] }]
* `CritiqueVerdict`: { pass: boolean, violations[], revisionNotes }
* `FinalPlan`: markdown (avec liens "Pour aller plus loin" par section) + disclaimers[]

## Test Everything Rigorously

### Unitaires (Vitest)

* Zod: chaque schéma rejette les payloads malformés et les outputs LLM tronqués.
* `safetyGate`: age < 18 → route resources; langage extrême détecté → route resources; profil normal → route normale.
* `critique`: verdict "revise" boucle max 2 fois puis fallback; verdict "pass" continue.
* Chaque step est pure: même state d'entrée, même state de sortie (LLM mocké).

### Intégration

* Pipeline complet avec LLM mocké: profil sain → FinalPlan valide avec disclaimers présents.
* Profil à risque → aucune routine générée, output resources.
* Output LLM invalide au step compose → un retry, puis erreur propre (pas de crash).

### Cas adversariaux (les nommer en interview)

* Prompt injection dans les réponses du quiz ("ignore previous instructions").
* Objectifs déguisés (restriction calorique extrême formulée en "fitness").
* Mineur qui ment sur son âge: limite connue, à documenter honnêtement.

## Ordre d'exécution (40 min)

1. (5 min) Schémas Zod, tous les contrats d'abord.
2. (5 min) Squelette du pipeline + state object, steps en stubs.
3. (10 min) Tests unitaires sur safetyGate et critique loop (LLM mocké).
4. (15 min) Implémentation des steps, prompts inline courts.
5. (5 min) Endpoint Fastify + SSE, smoke test manuel.

## Hors scope (à dire, pas à faire)

* Vraie base vectorielle (stub avec un tableau de docs suffit).
* Auth, rate limiting, persistence.
* Fine-tuning du critic; en prod on ajouterait des evals.
