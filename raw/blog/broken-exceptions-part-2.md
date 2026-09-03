# Part 2 Planning — "The Error Is a Value"

**Date:** 2026-09-01
**Status:** Implemented (2026-09-02): data-last combinators + 5-overload `pipe` shipped in post and snippet; `tsc` green, `astro build` green, draft renders at `/blog/practical-error-as-a-value/`. The stale duplicate draft (`practical-error-as-a-value.md`, a byte-copy of the superseded skeleton with a colliding slug) was deleted with user approval. This file is the planning record: constraints, decisions ledger, error inventory, workflow.
**Series context:** `raw/blog/broken-exceptions-part-1.md` (prior handoff — audience, voice, anchor-example rationale, research sources). Part 1 live at `src/content/blog/exceptions-are-broken.md` (~1,440 words / 5 code blocks).

## Series-wide constraints (inherited, do not re-litigate)

- Practitioner voice for engineers living in `try/catch`; opinionated but concrete.
- **Never say "monad."** Reader already knows `flatMap`: `Array.flatMap`, and `Promise.then` *is* flatMap.
- Same anchor examples every part: `fetchUser`/`NotFound`, `chargePayment`/`PaymentFailed` + `UpstreamUnavailable`.
- No Go code, series-wide (Go's boundary thinking is unspoken inspiration only).
- Each part ends on a problem the next part solves; no "in the next post we'll explore."
- Settled without asking: concurrency out of Part 2 scope (Part 3/4 territory); exhaustiveness not re-taught (reference Part 1's `never` check).

## Decisions ledger (Part 2-specific, from grilling)

| Decision | Outcome |
|---|---|
| Title | "The Error Is a Value" |
| Core shape | Boolean `ok` discriminator — same type Part 1 printed in prose; `_tag` stays on error payloads only |
| One type | Async-first: `Promise<Result<T, E>>` is the ONLY type. No `Result`/`AsyncResult` split, no alias — inline `Promise<Result<T, E>>` in every signature (sets up Part 3's visible shrink to `Effect<Receipt, PaymentError>`) |
| Lift rule | Every fallible function is `async` and returns bare `ok`/`err`; the `async` keyword is the only lift; sync is the degenerate async case. No `lift()`, no `of()`, no second constructor set |
| Combinators | `ok`, `err`, `map`, `flatMap`, `mapError`, `match` — **free functions, data-last, curried generics** (data params outer, incoming `E` generic on the inner function; naive all-params-outer placement instantiates `E` as `unknown` and silently erases the error channel — verified by scratch test). Composed via hand-rolled `pipe`, 5 overloads max with `= never` defaults. Cross-checked against Effect v4: `pipe` at `Function.ts:613` (21 overloads there), `Effect.flatMap` at `Effect.ts:2001` (same curried shape, union `E1 \| E`). New section "pipe: the reading order" after flatMap; post notes Effect ships dual arities |
| Trap-box | One callout: `map` takes a *sync* callback, `flatMap` takes an *async* one — that boundary is the whole game |
| Pipeline | 3 steps: `fetchUser(id)` → `chargePayment(user.activeOrder)` → `sendReceipt(receipt)`. One-line license for `activeOrder` ("pretend the user carries their active order") |
| New error | `NotificationFailed { channel }` from `sendReceipt` — needed so the union visibly grows for the bloat demo |
| `match` | Handler object: `match(m, { ok: v => ..., err: e => ... })` — keys echo constructors, both channels required; the union inside still narrows with Part 1's `never` check |
| Opener | Part-1 pattern on three awaited calls; level one shown in full (with `never` line), levels two/three elided: `// …same switch, deeper` |
| `mapError` beat | Middle-layer narrowing: `placeOrder` hides internal errors (`attemptId`, service names), exposes only what callers decide on (`UserNotFound`, `PaymentUnavailable { retriable }`) — two-audiences + expose-vs-hide boundary rule doing real work |
| Final listing | Yes — complete machinery listing right before the collapse ("that's it, that's the machinery") |
| Effect name-drops | Library-free body until the final sentence. The unification win is presented as *ours*; the tease reveals a runtime already made the call |
| Prior art | Rust nod at the type definition ("Rust ships this shape in its standard library"). Neverthrow line **inverted**: it ships two classes (`Result` + `ResultAsync`) for exactly the duality this design dissolves |
| Collapse | 4 pains: (1) hand-maintained unions (code), (2) no recovery structure (prose), (3) **"you operate the machine"** — machinery names at every step + generic-placement fragility (the `unknown` erasure), (4) handmade unification glue + `Promise` can't cancel — timeout "gives up," the fetch keeps running (one sentence, no fiber vocabulary). Mapping onto Effect features (inferred `E`, `Schedule`, `gen`, runtime) stays implicit; `Effect.gen`/`yield*` removes the names `pipe` couldn't |
| Tease | One sentence: "Next: hand the plumbing to a runtime where sync and async were never separate types to begin with." |
| Length | ≈2,300 words / 9 code blocks + 1 trap-box blockquote. Ceiling moved from 2,100 after the pipe section was added (user decision); post is code-heavy, prose ≈1,600 |
| Verification | Snippets live in `src/snippets/exceptions-part-2.ts` (astro strict tsconfig includes `src/**`); `"prebuild": "tsc --noEmit"` added to package.json |
| Mechanics | One-sentence banner linking Part 1 (`/blog/exceptions-are-broken/` — confirmed route structure); frontmatter `draft: true`, `featured: false`, slug `practical-error-as-a-value`, tags: `error-handling`, `typescript`, `effect` |

## Error inventory (Part 2)

- `NotFound` — minimal tag-only (Part 1's simple anchor)
- `PaymentFailed { reason: "insufficient_funds" | "card_expired"; attemptId: string }` — unchanged from Part 1
- `UpstreamUnavailable { service: string; retriable: boolean }` — unchanged from Part 1
- `NotificationFailed { channel: string }` — **new**, exists to make union growth visible
- `PaymentError = PaymentFailed | UpstreamUnavailable` — same union name as Part 1
- `PlaceOrderError` — the *designed* surface from the `mapError` beat

## Workflow when drafting

1. Write `src/snippets/exceptions-part-2.ts` first (real types + combinators + pipeline stubs + one exhaustive `match` usage so `tsc` checks the `never` line).
2. Add `"prebuild": "tsc --noEmit"` to `package.json`; run `npm run build` to verify snippets compile. (Astro strict tsconfig includes `src/**`; if `tsc` misses the file, extend `include`.)
3. Fill in the skeleton at `src/content/blog/practical-error-as-a-value.md` — replace the HTML-comment beat notes with prose; frontmatter is already in place.
4. Run `unslop`/`avoid-ai-writing` pass before publish.
5. Part 1 footer line ("written with AI assistance") is a series convention — keep it.

## Open / next steps

- Draft Part 2 from the skeleton (frontmatter matches Part 1's header pattern; `pubDatetime` is a placeholder — bump at publish). **Status: drafted with pipe (2026-09-02), build green, draft page renders at `/blog/practical-error-as-a-value/`.**
- Part 3 outline afterward — **load the `effect` skill first** (Effect v4 API surface: `Data.TaggedError`, `Effect.gen`, `catchTag`, `Schedule`, Failure vs Defect). Part 2's `pipe` preps readers for Effect-code style; Part 3's side-by-side is hand-rolled pipe chain vs `Effect.gen` ("gen removes the names").
- Part 3 must pay off Part 2's four pains in order and must visibly shrink `Promise<Result<Receipt, PaymentError>>` → `Effect<Receipt, PaymentError>` (the inline-signature decision was made to set up this comparison).
- Part 3/4 titles undecided.
