# Handoff — "Exceptions Are Broken" Series Outline

**Date:** 2026-09-01
**Next session focus:** Draft the detailed outline for the multi-part blog series (user said "for the outline"). Start with Part 2; the user had been offered "grill the plan" vs "draft detailed Part 2 outline" and chose the outline.

## Artifacts (reference, don't duplicate)

- `src/content/blog/exceptions-are-broken.md` — Part 1, **published** (featured: true, draft: false). Thesis: errors are contracts for the caller, not crash events for the runtime. Payoff: discriminated union + exhaustive `_tag` switch.
- `raw/blog/broken-exceptions-part-1.md` — prior session's handoff: grilling decisions (thesis, two-audience model, voice, anchor examples, no Go code, title), research sources. Read it before drafting.
- Repo: Astro blog (AstroPaper) at `/Users/uo/Projects/blog-openapi-contract-testing`. No root `AGENTS.md`. No `effect` dependency pinned — the blog repo only hosts prose.

## Decision made this session

User asked: go straight to Effect, or insert a Result/map/flatMap post first?

**Answer: insert the Result post between Part 1 and Effect — built to fail on purpose at the end.** Rationale:

1. Part 1's payoff code is verbose (switch after every call). The reader's next natural question is "how do I compose three of these without a nesting pyramid?" — and that question *is* `flatMap`. Jumping to Effect answers a question the reader hasn't asked yet.
2. `yield*` in `Effect.gen` is flatMap. Readers who hand-rolled `flatMap` read Effect as "my plumbing, industrialized"; readers who didn't read it as magic and bounce.
3. Straight-to-Effect reads as library evangelism; the dependency-free Result post makes the Effect part credible.

## Agreed series spine

**Part 1 — done** (`exceptions-are-broken.md`).

**Part 2 — "The Error Is a Value"** (hand-rolled `Result`, no library)
- Open by conceding Part 1's cost: three sequential calls with the Part 1 pattern → nesting hell.
- Build `ok`/`err`, `map`, `flatMap`, `match` in ~40 lines. One-sentence nod to neverthrow for readers who stop here (honors Part 1's "you don't need a new library" closing line).
- Rebuild the same pipeline: `fetchUser` → `chargePayment` → `sendReceipt`; same errors (`NotFound`, `PaymentFailed`, `UpstreamUnavailable`). Line to land: `flatMap` is how two contracts merge — errors declare themselves as they compose.
- Closing movement = the collapse, three pains named but NOT fixed:
  1. Two worlds: `Result<T, E>` sync vs `Promise<Result<T, E>>` async, everything written twice
  2. Recovery has no structure: retry/timeout/fallback hand-rolled per call site
  3. Plumbing noise: business logic drowns in chains
- Last line hands off to Effect.

**Part 3 — Effect intro**
- Same pipeline as `Effect<Receipt, PaymentError>`. `Data.TaggedError` = Part 1's contract shape as a library feature (no mandatory `message` — observation from prior session's brainstorm).
- `Effect.gen` shown side-by-side with the hand-rolled `flatMap` from Part 2 ("the plumbing is the library now").
- Series payoff line: the `E` channel is *inferred* through composition — Part 1's spec ("declare themselves as they compose") fulfilled.
- `catchTag`/`catchTags` at the layer that knows what to do, not propagation through bystanders.

**Part 4 — Production** (closer)
- Part 2's pains resolved as one-liners: retry with `Schedule`, `timeout`, `orElse` fallback.
- Part 1's promise kept: tagged errors → structured logs ("the log is a projection of the contract").
- Climax: **Failure vs Defect** — Part 1's "errors are contracts, not crashes" completes as "and bugs *are* crashes, on purpose." This is the expected/unexpected split from the prior brainstorm, natively encoded in Effect.

Pain → Effect mapping table (ends Part 2 / anchors Part 3–4):

| Pain Part 2 ends on | Effect's answer |
|---|---|
| sync/async two worlds | one `Effect` type for both |
| hand-maintained unions | inferred `E` channel |
| hand-rolled retry/timeout | `Schedule` + combinators |
| `flatMap` chain noise | `Effect.gen` / `yield*` |
| nothing for actual bugs | Failure vs Defect |

## Craft rules (agreed)

- **Never say "monad"** in the posts. Reader already knows `flatMap`: `Array.flatMap`, and `Promise.then` *is* flatMap.
- **Same three examples every part** (`fetchUser`/`NotFound`, `chargePayment`/`PaymentFailed`, `UpstreamUnavailable`) — readers measure progress by watching identical code shrink.
- **Each part ends on a problem, not a summary.** No "in the next post we'll explore."
- **Part 1 needs no edits** — its body never promises "next: Effect," so inserting the Result part is safe.
- Keep prior-session constraints: no Go code, practitioner voice for engineers living in `try/catch`, opinionated but concrete.
- **Before drafting Parts 3–4 beats, load the `effect` skill** (targets Effect v4) — the repo pins nothing, so verify API surface rather than trusting memory.
- Compression variant if user wants shorter: merge Parts 3+4 into "Effect in production" (3 parts total). Do NOT merge away Part 2 — it's what makes the series an argument rather than a pitch.

## Open / next steps

- Draft the detailed outline (per-post section beats, code sketches, word-count targets). Repo convention is to keep planning artifacts under `raw/blog/` (see `raw/blog/broken-exceptions-part-1.md`) — suggest saving the outline there.
- Part 1 is live; no code changes made this session (`npm run ci` not run, nothing to run it for).
- Series titles beyond Part 1 are undecided — only Part 2's working title ("The Error Is a Value") was proposed.

## Suggested skills for next agent

- `effect` — load before writing Part 3–4 outline beats (Effect v4 API: `Data.TaggedError`, `Effect.gen`, `catchTag`, `Schedule`, Failure/Defect)
- `unslop` or `avoid-ai-writing` — apply when writing outline/blog prose (per skill: must always apply)
- `grill-me` / `grilling` — if the user wants the outline stress-tested before drafting prose
- `handoff` — to re-handoff after the outline is drafted
