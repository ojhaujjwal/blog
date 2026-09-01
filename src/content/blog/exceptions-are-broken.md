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

Take `chargePayment(order)`. It charges a card, or it fails: insufficient funds, card expired, upstream ledger is down.

The failure is part of the function's behavior as surely as the success case. But in most languages it's shoved into a side channel, an exception, that is barely better than a `goto` to the top of the stack. We tell ourselves exceptions are for "exceptional" situations, but we're treating errors as crash events for the runtime when we should treat them as contracts for the caller. And a contract nobody is forced to read isn't a contract: nothing about a thrown error is ever checked. The compiler never sees it.

## The error is a return type

A function that can fail doesn't have one return type, it has two: the explicit one, and the thrown errors as implicit return types. Both are promises the function makes to its callers.

If `chargePayment` can fail with `insufficient_funds`, then "I might return a payment failure with a reason" is a contract, exactly like "I return a `Receipt`" or "I take an `Order`." A caller needs that contract to do its job: retry with another saved card, show the error to the user, or back off and try again later.

In TypeScript the simplest way to model that second channel is `Result<T, E> = { ok: true; value: T } | { ok: false; error: E }`. It's a second return value the type checker forces you to handle.

But the tools we reach for, `throw` and `try/catch` and the `Error` class, were designed for the opposite mental model: a crash, not a return. Throw abandons the current function and each caller until it hits a catch, then stops the program and prints a message for a human to read. The error is an event that happened to the system, not a value the system returns.

## Two audiences, one object

Every error we throw has at least two different consumers, and they want completely different things:

- **The internal / observer audience.** The human debugging at 3am, the log aggregator, the crash reporter. They want a readable story, *what happened, in English,* plus a stack trace for context. A free-form message string may be good for that case.
- **The external / contract audience.** The *calling code*: the `catch` block, the next function in the pipeline, the API layer deciding what HTTP status to return. They don't want a story. They want to tell one failure from another ("is this insufficient funds or an expired card?"), pull out the facts ("why did payment fail? is the upstream retriable?"), and decide what to do ("retry, fall back, or propagate?").

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
```

This is broken on every axis:

- It branches on a human-readable string. "insufficient funds" vs "Insufficient Funds" vs "insufficient_funds" vs the localized message breaks it. The thing the caller depends on is the thing the observer controls.
- It carries no structured data. Where does the `attemptId` or `retriable` flag come from? Re-parsed out of the message, or a magic constant.
- It's fragile across boundaries. The alternative, `if (e instanceof PaymentFailedError)`, only works if both sides share the exact same class instance, which silently breaks the moment the error crosses a process, a bundle, or a deserialization boundary.

## The halfway house: a proper exception

At this point you might reach for the obvious fix. Stop throwing bare strings, write a proper exception class.

```ts
class PaymentFailedError extends Error {
  constructor(
    readonly reason: "insufficient_funds" | "card_expired",
    readonly attemptId: string,
  ) {
    super(`payment failed: ${reason}, attempt ${attemptId}`)
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

This is better. A stable discriminator in the exception name, typed fields for `reason` and `attemptId`, the message demoted to log decoration. Every complaint so far, addressed. Ship it.

And yet it's still not a contract. Four reasons, and no amount of class design fixes any of them:

**The signature lies.**

```ts
function chargePayment(order: Order): Promise<Receipt>
//                                        Errors? ← nowhere.
```

The signature takes an `Order` and returns a `Receipt`, and says nothing about the failure we just spent a class modeling. `chargePayment` could throw anything, or nothing. The signature is the same.

In TypeScript, **`catch` is `unknown` by design.** Even with a perfectly designed exception class, the `e` in `catch (e)` is `unknown`. The TypeScript team formally declined typed `throws` clauses, so you're back to narrowing by hand, with no guarantee your `instanceof` list is complete. The exception knows what it is. The language just won't pass that knowledge to the caller.

**No exhaustiveness.** Next year, payments grows a new failure: card declined. You add it:

```ts
class CardDeclinedError extends Error {}
```

and ship. Nothing breaks. Every call site that catches payment errors compiles exactly as before, and its fallback branch silently swallows the new case. The contract changed and nobody who signed it was told.

**The default is propagation, not handling.** `throw` doesn't ask the caller to decide. It unwinds past every function until it hits a `catch`, often one written for a different failure. A returned error is the opposite: it sits in the caller's hands, unhandled and unignorable, nagging the compiler until someone deals with it.

The obvious rebuttal is Java. It tried checked exceptions, and a generation of developers learned to hate them. The idea wasn't wrong; the price was. The tax was `throws` clauses spelled out by hand on every signature down the call stack, even at the middle layers that only pass errors along. The trapdoor was extending `RuntimeException`: silently unchecked again, zero compile errors. That's why the ecosystem opted out. What I want is the checking without the tax or the trapdoor: errors that declare themselves as they compose, get checked where they're handled (not by every bystander in the stack), and travel in the type that's already there, the return type.

The fix is a shift in what we expect an error to be. An error at a boundary is a value with a public shape, and that shape puts the caller first: a stable discriminator to switch on, immune to wording, localization, and refactors; typed, structured properties carrying the actual data of the failure, declared instead of parsed; and a message, optional and last, for the observer only. The message gets demoted from "the error" to "a nice-to-have for logs." The discriminator and the payload *become* the error.

## What good looks like

The caller handles it manually, right after the call.

```ts
type PaymentError = { _tag: "PaymentFailed"; reason: "insufficient_funds" | "card_expired"; attemptId: string } | { _tag: "UpstreamUnavailable"; retriable: boolean }

const charged = await chargePayment(order) // Result<Receipt, PaymentError>

if (!charged.ok) switch (charged.error._tag) {
  case "PaymentFailed": return showUser(charged.error.reason, { attemptId: charged.error.attemptId })
  case "UpstreamUnavailable": return charged.error.retriable ? retryLater() : fail()
  default: { const _exhaustive: never = charged.error; return fail(_exhaustive) }
}
```

That last line is the payoff. Add `{ _tag: "CardDeclined"; reasonCode: string }` to the union tomorrow and `_exhaustive: never` turns red in every switch in the codebase. The compiler walks you to each call site and refuses to compile until it handles the new case. And because the error travels in the return type, the contract survives across modules and serialization. Miss a case and the build fails, not production.

You don't need a new library to apply the idea. You need the mindset. The error is part of the API. Write the contract down.

None of this gives up production debugging. The log becomes a projection of the contract: one function at the boundary renders `_tag` and the payload (`payment.failed reason=insufficient_funds attempt=abc123`) with the stack captured at the failure site. You gain fields you can query instead of prose you can only read.

Serve the caller first. The log is a projection of the contract, not a substitute for one.
