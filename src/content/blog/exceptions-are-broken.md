---
author: Ujjwal Ojha
pubDatetime: 2026-09-01T10:00:00+10:00
title: "Exceptions Are Broken: Errors as Contracts, Not Crashes"
slug: exceptions-are-broken
featured: true
draft: false
description: We treat errors as crash events for the runtime when we should treat them as contracts for the caller, with stable tags, typed payloads, and messages demoted to logs.
tags:
  - error-handling
  - typescript
  - effect
---

Every function that can fail has a secret. We just don't write it down.

Take `fetchUser(id)`. It returns a user, or it fails: the user doesn't exist, the token expired, the database is down. Now take `chargePayment(order)`. It charges a card, or it fails: insufficient funds, card expired, upstream ledger is down.

The failure is part of the function's behavior as surely as the success case. But in most languages, that failure is shoved into a side channel, an exception, that is barely better than a `goto` to the top of the stack.

We tell ourselves exceptions are for "exceptional" situations. They aren't. Failures are ordinary, expected, and frequent. And the way we model them is broken in a way that warps every layer of our code.

This is a category error at the design level, not a syntax debate. We treat errors as crash events for the runtime when we should treat them as contracts for the caller. And a contract nobody is forced to read isn't a contract. Nothing about a thrown error is ever checked, so the compiler, the one tool that enforces contracts, never gets invited to the conversation.

## The error is a return type

A function that can fail doesn't have one return type, it has two. The happy path returns its value. The failure path returns its error. Both are part of the function's public API. Both are promises the function makes to whoever calls it.

If `chargePayment` can fail with `insufficient_funds`, then "I might return a payment failure with a reason" is a contract, exactly like "I return a `Receipt`" or "I take an `Order`." A caller needs to know that contract to do its job. Maybe it retries with another card, maybe it shows the user a specific message, maybe it backs off and retries later.

The same is true for simple cases. If `fetchUser` can fail with `not_found`, the caller needs a reliable way to branch on that, not just "something threw." Simple use cases need a contract just as much as complex ones. The complexity of the domain doesn't change the shape of the problem.

In TypeScript the simplest way to model that second channel is `Result<T, E> = { ok: true; value: T } | { ok: false; error: E }`. It's a second return value the type checker forces you to handle.

But the tools we reach for, `throw` and `try/catch`, the `Error` class, were designed for the opposite mental model. They were designed for a *crash*: unwind the stack, stop the program, print a message for a human to read. The error is an event that happened *to* the system, not a value the system *returns*.

That mismatch is the root of most error-handling pain.

## Two audiences, one object

This is the specific way it breaks. Every error we throw has at least two different consumers, and they want completely different things:

- **The internal / observer audience.** The human debugging at 3am, the log aggregator, the crash reporter. They want a readable story, *what happened, in English,* plus a stack trace for context. A free-form message string may be good for that case.
- **The external / contract audience.** The *calling code*: the `catch` block, the next function in the pipeline, the API layer deciding what HTTP status to return. They don't want a story. They want to discriminate ("which kind of error is this?"), extract structured data ("why did payment fail? is the upstream retriable?"), and decide ("retry, fall back, or propagate?").

The disaster is that we model both audiences with a single object, and we let the observer's needs dominate. The `message` string becomes the error's centerpiece, because it's what the human wants. But the caller can't do anything useful with a string.

So the caller improvises:

```ts
try {
  await chargePayment(order)
} catch (e) {
  if (e.message.includes("insufficient funds")) {
    return showUser("Not enough funds. Try another card.")
  }
  if (e.message.includes("upstream")) {
    return retryLater()
  }
  return showUser("Payment failed")
}

try {
  await fetchUser(id)
} catch (e) {
  if (e.message.includes("not found")) {
    return res.status(404).json({ error: e.message })
  }
  return res.status(500).json({ error: "unexpected" })
}
```

This is broken on every axis, whether the case is simple or complex:

- It branches on a human-readable string. "insufficient funds" vs "Insufficient Funds" vs "insufficient_funds" vs the localized message breaks it. The thing the caller depends on is the thing the observer controls.
- It carries no structured data. Where does the `attemptId` or `retriable` flag come from? Re-parsed out of the message, or a magic constant.
- It's fragile across boundaries. The alternative, `if (e instanceof PaymentFailedError)`, only works if both sides share the exact same class instance, which silently breaks the moment the error crosses a process, a bundle, or a deserialization boundary.

The error was supposed to be a contract. Instead it's an opaque string with a personality. And notice, the simple `fetchUser` example is already broken in the same way as the complex payment one. The problem isn't complexity, it's the primitive.

## Why the design makes this inevitable

Look at the canonical error constructor:

```ts
throw new Error("payment failed: insufficient funds, attempt abc123")
throw new Error("user not found: 42")
```

The message is required, central, and it's a string. That's the whole primitive. There is no first-class place for "this is a *kind* of error" or "here is the structured payload a caller can use." You *can* bolt properties on afterward (`err.attemptId = "abc123"`), and people do, but it's ad hoc, untyped, and invisible at the type level. The language gives you a crash event and one string, and dares you to build a contract on top.

The result is that we treat error handling as an afterthought. We wrap it around the outside of working code, late, once, at the top of the stack, where we can only log and bail. The contract was never written down, because the primitive we get does not let us write it down.

## The halfway house: a proper exception

At this point you might reach for the obvious fix. Stop throwing bare strings, write a proper exception class.

```ts
class PaymentFailedError extends Error {
  readonly _tag = "PaymentFailed"
  constructor(
    readonly reason: "insufficient_funds" | "card_expired",
    readonly attemptId: string,
  ) {
    super(`payment failed: ${reason}, attempt ${attemptId}`)
    this.name = "PaymentFailedError"
  }
}

try {
  await chargePayment(order)
} catch (e) {
  if (e instanceof PaymentFailedError) {
    if (e.reason === "insufficient_funds") return showUser("Not enough funds. Try another card.")
    if (e.reason === "card_expired") return showUser("Your card has expired.")
    return showUser("Payment failed")
  }
  return showUser("Payment failed")
}
```

This is the fix. It's genuinely better. You get a stable discriminator in `_tag`, typed structured props on `reason` and `attemptId`, and the message demoted to decoration for logs. Every complaint in the last two sections is addressed. Ship it. And yes, `instanceof` still has its own fragility across process and deserialization boundaries, but let's take the win where we can get it. That's not even the deepest problem.

And yet, this is still not a contract. Four reasons, and no amount of class design fixes any of them:

**The signature lies.**

```ts
function chargePayment(order: Order): Promise<Receipt>
//                                        errors? ← nowhere. Half the function's behavior is invisible.
```

The type says the function takes an `Order` and returns a `Receipt`. It says nothing about the failure we just spent a class modeling. The error, which the post's whole thesis says is half the function's public API, is invisible to the type system. `chargePayment` could throw anything, or nothing, the signature is the same.

**`catch` is `unknown` by design.** Even with a perfectly designed exception class, the `e` in `catch (e)` is `unknown`, or worse, `any`. TypeScript cannot and will not tell you what that call threw. The TypeScript team formally declined typed `throws` clauses, on the grounds that the JavaScript ecosystem can't support them. So you're back to narrowing by hand, with no compile-time guarantee that your `instanceof` list is complete. The exception knows what it is. The language just won't pass that knowledge to the caller.

**No exhaustiveness.** Next year, payments grows a new failure: card declined. You add it:

```ts
class CardDeclinedError extends Error { readonly _tag = "CardDeclined" }
```

and ship. Nothing breaks, not at any of the twenty call sites that catch payment errors. Each one compiles exactly as before, and each one's `else`/fallback branch silently swallows the new case. With exceptions, introducing a new error type is invisible to the compiler. No error, no warning, no prompt. The contract changed and nobody who signed it was told.

**The default is propagation, not handling.** `throw` doesn't ask the caller to decide. It unwinds toward whatever `catch` happens to be nearest, often one that was written for a different failure and can only log and bail. A returned error is the opposite. It sits in the caller's hands, unhandled and unignorable, nagging the compiler until someone deals with it.

The obvious rebuttal is Java. It tried checked exceptions, and a generation of developers learned to hate them. But Java's failure was the mechanism, not the goal. The tax was `throws` clauses spelled out by hand on every signature down the entire call stack, even at the middle layers that only pass errors along and don't care. The trapdoor was extending `RuntimeException` instead. Then the method is unchecked again, silently, zero compile errors. That's why the ecosystem opted out, and why new Java APIs are unchecked-only. What I want is the checking without the tax or the trapdoor. Errors should declare themselves as they compose, get checked where they're handled, not by every bystander in the stack, and travel in the type that's already there, the return type.

## Treat the error as a contract

The fix is a shift in what we expect an error to *be*. An error at a boundary is a value with a public shape, and that shape should put the caller first:

1. A stable discriminator. A tag, a `kind`, a type, something the caller can switch on reliably, immune to wording, localization, and refactors. Not a message string, not `instanceof`.
2. Typed, structured properties. The payload the caller acts on: `reason`, `attemptId`, `retriable`, `field`. The actual data of the failure, declared, not parsed.
3. A message, optional and last. The human-readable explanation belongs to the observer. It's useful for logs. It is *not* the error's identity, and it must never be what control flow depends on.

Notice the inversion. The message gets demoted from "the error" to "a nice-to-have for logs." The tag and the payload *become* the error. That single change, separating the observer's needs from the contract's needs, is most of the battle.

## What good looks like

The same shape works for the simple case and the complex one. That's the point, and yes, the caller handles it manually, right after the call.

```ts
type FetchUserError = { _tag: "NotFound"; id: string } | { _tag: "UpstreamUnavailable"; retriable: boolean }
type PaymentError = { _tag: "PaymentFailed"; reason: "insufficient_funds" | "card_expired"; attemptId: string } | { _tag: "UpstreamUnavailable"; retriable: boolean }

const fetched = await fetchUser(id) // Result<User, FetchUserError>
if (!fetched.ok) switch (fetched.error._tag) {
  case "NotFound": return res.status(404).json({ error: `User ${fetched.error.id} not found` })
  case "UpstreamUnavailable": return fetched.error.retriable ? retry() : fail()
}

const charged = await chargePayment(order) // Result<Receipt, PaymentError>
if (!charged.ok) switch (charged.error._tag) {
  case "PaymentFailed": return showUser(charged.error.reason, { attemptId: charged.error.attemptId })
  case "UpstreamUnavailable": return charged.error.retriable ? retryLater() : fail()
  default: { const _exhaustive: never = charged.error; return fail(_exhaustive) }
}
```

That last line is the payoff. Introduce a new error tomorrow. Add `{ _tag: "CardDeclined"; reasonCode: string }` to the `PaymentError` union and `_exhaustive: never` turns red in every switch in the codebase. The compiler walks you to each call site that needs to learn the new case, and refuses to compile until it has. This is the thing exceptions can never give you. A new throw is invisible to the type checker, so every unhandled call site quietly falls through to the generic branch and waits for production to find it.

Same pattern for the simple `fetchUser` and the complex `chargePayment`. The function declares its error contract in the return type, `Result<T, E>` introduced above, and the caller branches explicitly right after the call, `if (!ok) switch (error._tag)`. Discriminate on tag, extract typed data, decide. Control flow never depends on a message, the tag survives across modules and serialization, and because the error travels in the return type the handling is checked. Miss a case and the build fails, not production. The manual `if (!ok)` is intentional. The follow-up shows how Effect keeps the contract while removing the boilerplate.

You don't need a new library to apply the idea. You need the mindset. The error is part of the API. Write the contract down. Serve the caller, not the log.

## Where this goes next

What we've described is errors as values. Typed, structured, part of the function's contract. Libraries like Effect build directly on this idea. Its `Data.TaggedError` is one clean expression of it, where you declare the tag and typed props and the message is intentionally optional. And because those errors travel in the type of the effect itself, the checking is real. An unhandled error is a type error, not a `catch` you forgot to write.

I'll cover that modeling in detail in a dedicated follow-up on Effect errors.

---

*The shift is simple. Stop thinking of errors as things that happen *to* your program, crashes to be caught and logged. Start thinking of them as values your functions *return*, contracts your code makes and keeps. Discriminate on a tag, carry real data, demote the message, and make the contract checked, part of the type, impossible to forget. The rest is just learning to write the contract down.*
