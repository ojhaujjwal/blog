# Handoff — Exceptions Are Broken Blog

**Date:** 2026-09-01
**Artifact:** `src/content/blog/exceptions-are-broken.md` .

## What was agreed (final shared understanding)

Via `grilling` skill (2 rounds, frontier now empty):

- **Thesis:** Errors are broken because they conflate two audiences and are designed as crash events, not contracts. Reframe: error is a **return type / contract for the caller**, not just a crash for the runtime/observer.
- **Two audiences model (core framing):**
  - Internal / observer — human/logs, wants message + stack trace
  - External / contract — calling code, wants to discriminate (tag/kind), extract typed props, decide (retry/fallback/propagate/communicate)
- **Prescription:** Stable discriminator (`_tag`/`kind`) + typed structured props first, message demoted to optional/last (observer only, never control flow).
- **Voice:** Practitioner blog for engineers living in `try/catch`; opinionated but concrete, not academic.
- **Scope:** Blog1 = self-contained critique + payoff; Effect introduced only as brief 3–4 sentence teaser at end. Dedicated Effect follow-up is Blog2 — out of scope for now.
- **Examples:** Must show pattern applies to **both simple and complex** cases (user explicitly requested):
  - Simple: `fetchUser` → `NotFound`
  - Complex: `chargePayment` → `PaymentFailed { reason: "insufficient_funds", attemptId }`
  - Slightly-complex/infra: `UpstreamUnavailable { service, retriable }` and `ValidationFailed { field, rule }`
- **Payoff code:** Included — discriminated union + exhaustive `switch` on `_tag` (never on `message`).
- **Title:** `Exceptions Are Broken: Errors as Contracts, Not Crashes` (recommended, user accepted via "yes to rest").
- **Constraint:** No Go code in blog1; Go's `%w`/`%v` used only as *inspiration* for internal vs external boundary, not as syntax in post. Effect not leading.

## What was discussed (evolution)

1. **Initial research phase:** User exploring JS `Error(message, code)` — observation that `Error` needn't crash; can be handled via retry, fallback, user communication, validation, rate limiting. Assistant tabled actionable responses: retry/backoff, fallback, degrade, communicate, negotiate, re-auth, defer/queue, circuit-break, rollback, log/observe, aggregate, ignore, propagate. Reframe: expected vs unexpected errors (expected = returned value, unexpected = bug/crash).
2. **Go deep-dive (requested, then retracted):** How Go does it — `error` interface, `(value, error)` returns, sentinel vs custom types, wrapping via `fmt.Errorf %w` vs `%v`, `errors.Is/As/Join`, `Unwrap`. Detailed `%w` vs `%v` as API contract decision (expose vs hide). User later said: **do not include Go example** in blog — keep as inspiration only. Liked the contract-design / internal-vs-external distinction.
3. **Effect inspiration:** User noted `Data.TaggedError` has no mandatory `message`; you add props manually and discriminate via `_tag`. Assistant mapped: `_tag` + typed props = external/contract, `message` = internal/observer — clean decoupling JS `Error` conflates.
4. **Blog structuring under grilling:** Agreed not to lead with Effect; lead with brokenness, introduce Effect model near end. Iterated on title, voice, scope, anchor examples via two grilling rounds.

## Research sources consulted

- Websearch 2026-09-01: `Go error handling 2025 2026 try builtin errors.Is errors.As wrapping` — returned:
  - `pkg.go.dev/errors` (Is, As, AsType, Join, Unwrap, ErrUnsupported)
  - `go.dev/blog/go1.13-errors` (wrapping philosophy, %w, When to Wrap)
  - `sharpskill.dev` — Go Error Handling 2026: Patterns, Wrapping and Interview Questions (sentinel/custom, %w vs %v)
  - `backendbytes.com/articles/go-error-handling-patterns` (decision tree: sentinel vs wrap vs custom vs Join)
  - `blog.teliaz.com` — Effective Error Handling in Go: From `if err != nil` to `errors.AsType` (Go 1.26 AsType)
  - `glukhov.org` — Go Error Handling Architecture: Boundaries and Patterns (boundaries, retryable)
  - `dev.to/ohugonnot` — Wrapping Go errors: where, and mostly why (Dave Cheney 2016 vs 2021 reversal, public-boundary rule)
  - `tip.golang.org/src/errors/errors.go` source
- Local repo context: `AGENTS.md`, `CONTEXT.md`, `effect-smol/LLMS.md` referenced implicitly (Effect usage in this repo). No file reads beyond workspace listing.

## Current artifact

- `blogs/exceptions-are-broken.md` — final draft reflecting all above decisions. Do not duplicate here; reference path.

## Open / next steps

- Blog1 is written; no further grilling frontier remains. User may want iteration on tone/examples or to start Blog2 (dedicated Effect error modeling).
- No code changes beyond the blog post; `npm run ci` not yet run (no src changes).

## Suggested skills for next agent

- `effect` — if drafting Blog2 (Effect `Data.TaggedError`, typed error channels, retry/recovery patterns)
- `avoid-ai-writing` — if polishing Blog1 prose for AI-isms before publish
- `implement` — if turning the contract model into src code (services/layers) per `effect` skill
- `domain-modeling` — if formalizing error taxonomy (PaymentFailed, UpstreamUnavailable, etc.) into ubiquitous language / ADR
