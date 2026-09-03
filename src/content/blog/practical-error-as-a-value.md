---
author: Ujjwal Ojha
pubDatetime: 2026-09-01T10:00:00+10:00
title: "The Error Is a Value"
slug: practical-error-as-a-value
featured: false
draft: true
description: "A hand-rolled Result over Promise<Result<T, E>>: map, flatMap, mapError, and match make Part 1's error contracts compose. Then four limits appear that no combinator removes."
tags:
  - error-handling
  - typescript
---

> **Part 2** of a series begun in [Exceptions Are Broken](/blog/exceptions-are-broken/), which argued that errors are contracts for the caller, not crashes for the runtime.

Thirty lines. This post builds all of it: one type, two constructors, four combinators, and a `pipe`.

The code makes Part 1 error contracts compose into a workflow. You can read the workflow from left to right. You can keep all thirty lines in your head.

First we look at the problem. Three calls in sequence give you three switches. Each switch is one level deeper than the switch before it. Then we build the code that removes this shape.

## Three calls, three switches

Part 1 gives a pattern: handle each error immediately after the call. We apply this pattern to a workflow of three calls.

`fetchUser` loads the buyer. `chargePayment` charges the active order. `sendReceipt` sends the receipt.

Each function returns its errors the way Part 1 demands. Thus each one gets the handling that Part 1 demands:

```ts
const user = await fetchUser("u_123");
if (!user.ok)
  switch (user.error._tag) {
    case "NotFound":
      return showUser("No such user");
    default: {
      const _exhaustive: never = user.error;
      return fail(_exhaustive);
    }
  }

const charged = await chargePayment(user.value.activeOrder);
if (!charged.ok)
  switch (
    charged.error._tag
    /* …same switch, one level deeper */
  ) {
  }

const sent = await sendReceipt(charged.value);
if (!sent.ok)
  switch (
    sent.error._tag
    /* …same switch, deeper still */
  ) {
  }

return sent.value;
```

Each `await` needs another switch. Each switch is almost a copy of the switch above it. It is one level deeper.

The example does not show the second and third switch bodies. I left them out on purpose. If you write them out, you see the same switch again.

The pattern is correct. But real workflows make sequential calls. For sequential calls, this pattern gives you nested switches.

The fix is not a better switch. Part 1 has a thesis: the error is a value. This post gives that value the tools it needs.

## One type, one rule

Start with the type from Part 1:

```ts
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```

Rust has this type in its standard library. Rust calls it `Result`. Our version has about thirty lines. You will build all of it.

After that, the library in the next post is not new. It is a better version of code that you already know.

One decision makes the design simple. The functions from Part 1 are `async`. A chain of two calls holds a `Promise<Result<T, E>>`. A `Result` with methods cannot handle a `Promise`.

Some libraries use two types and a bridge between them. neverthrow has a sync `Result` and an async `ResultAsync`. One rule removes this split:

**Every function that can fail is `async`, and it returns bare `ok` and `err`.**

```ts
const ok  = <T>(value: T): Result<T, never> => ({ ok: true, value })
const err = <E>(error: E): Result<never, E> => ({ ok: false, error })

const fetchUser     = (id: string): Promise<Result<User, NotFound>> => /* … */
const chargePayment = (order: Order): Promise<Result<Receipt, PaymentError>> => /* … */
const sendReceipt   = (r: Receipt): Promise<Result<Confirmation, NotificationFailed>> => /* … */
```

The `async` keyword does the conversion. `return err(...)` in an `async` function gives a `Promise` automatically. You do not write the wrapper.

A step that cannot fail gets the same treatment. It is also an `async` function.

Write `Promise<Result<T, E>>` in every signature. Do not use an alias. The signature then shows the error type before you read the function body.

## map: the first tool

The first tool changes a success value. It does not open the `Result`.

```ts
const map =
  <A, B>(f: (a: A) => B) =>
  <E>(m: Promise<Result<A, E>>): Promise<Result<B, E>> =>
    m.then(r => (r.ok ? ok(f(r.value)) : r));

const total = map(receipt => receipt.amount)(chargePayment(order));
```

`map` waits for the promise. Then it opens the result. If the result is `ok`, `map` applies `f` to the value. If the result is `err`, `map` returns it unchanged.

The composition happens inside `then`. Thus the code uses the promise. It does not fight the promise.

`map` does not touch the error channel. An error goes through `map` unchanged. The success type changes. The contract stays valid.

`f` cannot fail. Give `map` a step that can fail, and you get a problem. The failure becomes a value inside the success. You then have a `Promise` of an `ok` that holds a `Result`. This is not composition. It is a failure that pretends to be a success. To sequence steps that can fail, you need a different tool.

## flatMap: the chain

`flatMap` takes a callback that returns another `Promise<Result>`. The tool then flattens the two layers into one:

```ts
const flatMap =
  <A, B, E2>(f: (a: A) => Promise<Result<B, E2>>) =>
  async <E>(m: Promise<Result<A, E>>): Promise<Result<B, E | E2>> => {
    const r = await m;
    return r.ok ? f(r.value) : err(r.error);
  };

const confirmation = flatMap(sendReceipt)(
  flatMap(u => chargePayment(u.activeOrder))(fetchUser("u_123"))
);
```

Read the type in two layers. The outer function takes `f` and learns `A`, `B`, and the new error type `E2`. The inner function stays generic in `E`. It learns the error type when the value arrives. The result carries `E | E2`.

This union is the whole series in one type. `fetchUser` brings `NotFound`. `chargePayment` brings `PaymentError`. The chain shows both. Nobody writes them by hand.

The body has the only `await`. `flatMap` waits for the input result. Then it gives the success value to the next step.

One license: pretend the user carries their active order. `flatMap` sends one success value through the chain. So the data must flow this way.

Now read the example from top to bottom. It is the workflow: load, charge, send. But the code order is inverted — the send appears first, wrapped around the charge, wrapped around the load. Function-first arguments make the nesting worse, not better. This is the reading-order problem in its purest form.

A note on style. These are free functions, not methods. A method lives on the inner value. The inner value cannot wait for a promise. Data-last is the other half of the same decision: the function goes in first, the value arrives later. Remember this shape.

> **The trap:** `map` takes a callback that returns a value. `flatMap` takes a callback that can also fail; it returns a `Promise<Result>`. A sync transform uses `map`. A failing step uses `flatMap`. This boundary is the whole design.

## pipe: the reading order

Functions that take the value last have a standard fix. RxJS calls it `pipe`. fp-ts has one. Effect exports the same function. Ours is five overloads over a two-line loop:

```ts
function pipe<A>(a: A): A;
function pipe<A, B = never>(a: A, ab: (a: A) => B): B;
function pipe<A, B = never, C = never>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C
): C;
// …two more overloads, same shape, up to five arguments

function pipe(a: unknown, ...fs: Array<(x: any) => unknown>): unknown {
  return fs.reduce((x, f) => f(x), a);
}
```

Every overload says the same thing: give the value to the first function, and each result to the next. Effect's docs give one rule. Every function after the value must accept exactly one argument. `pipe` calls each step with the previous result and nothing else.

Our combinators already follow this rule. Data-last was the setup. `pipe` is the payoff:

```ts
const confirmation = pipe(
  fetchUser("u_123"),
  flatMap(u => chargePayment(u.activeOrder)),
  flatMap(sendReceipt)
);
```

Read it left to right: load, charge, send. The types survive the trip because of the two-layer split in `flatMap`. The error channel stays generic until `pipe` gives the value to the inner function. The union grows on schedule.

If you go on to Effect, you will meet its combinators in two shapes: data-last for `pipe`, data-first for direct calls. You have now built the `pipe` half yourself.

## mapError: the boundary is designed

The error channel now gets a tool of its own. This is where Part 1's two audiences start to pay off.

`placeOrder` wraps the fetch and the charge. Its raw errors are `NotFound`, `PaymentFailed`, and `UpstreamUnavailable`. That is an internal conversation. The caller needs three answers. Did the user exist? Can payment go through? If the ledger is down, is it worth a retry? `attemptId` and service names help the person who debugs at 3am. They do not help the caller.

```ts
type PlaceOrderError =
  | { _tag: "UserNotFound" }
  | { _tag: "PaymentUnavailable"; retriable: boolean };

const placeOrder = (
  userId: string
): Promise<Result<Receipt, PlaceOrderError>> =>
  pipe(
    fetchUser(userId),
    flatMap(u => chargePayment(u.activeOrder)),
    mapError(e => {
      /* NotFound → UserNotFound; the rest → PaymentUnavailable, carrying `retriable` */
    })
  );
```

The narrow type is the API. Internal errors stop at the boundary. What crosses is what the caller decides on. The full payload still reaches the log line at the edge, exactly as Part 1 promised.

And nobody upstream voted for these four tags. `placeOrder` decided what to show. If your error type is whatever the deepest layer produced, you did not design an API. You emptied a drawer.

## match: the terminal

The combinators build. `match` ends. It takes two handlers, one for each channel. Both are required, so a missing error handler is a compile error. Inside the error handler, Part 1's `never` check still guards the union.

```ts
const outcome = await pipe(
  placeOrder("u_123"),
  flatMap(sendReceipt),
  match({
    ok: confirmation => showUser("Order confirmed"),
    err: e => {
      log.error("order.failed", { tag: e._tag, ...e }); // the observer's line, structured
      switch (e._tag) {
        case "UserNotFound":
          return showUser("No such user");
        case "PaymentUnavailable":
          return e.retriable ? retryLater() : fail();
        case "NotificationFailed":
          return showUser("Placed, but the email failed");
        default: {
          const _exhaustive: never = e;
          return fail(_exhaustive);
        }
      }
    },
  })
);
```

This has the same behavior as the pyramid at the start of the post. Every tag is handled. The compiler checks each one. One flat handler object replaces three nested switches.

Both audiences get served at one place. The caller gets the switch. The observer gets `log.error("order.failed", { tag: e._tag, ...e })` — structured fields, not prose. Two audiences, one object, no conflict.

Here is all the code together:

```ts
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

const map =
  <A, B>(f: (a: A) => B) =>
  <E>(m: Promise<Result<A, E>>): Promise<Result<B, E>> =>
    m.then(r => (r.ok ? ok(f(r.value)) : r));

const flatMap =
  <A, B, E2>(f: (a: A) => Promise<Result<B, E2>>) =>
  async <E>(m: Promise<Result<A, E>>): Promise<Result<B, E | E2>> => {
    const r = await m;
    return r.ok ? f(r.value) : err(r.error);
  };

const mapError =
  <E, F>(f: (e: E) => F) =>
  <A>(m: Promise<Result<A, E>>): Promise<Result<A, F>> =>
    m.then(r => (r.ok ? r : err(f(r.error))));

const match =
  <A, E, Out>(handlers: { ok: (value: A) => Out; err: (error: E) => Out }) =>
  (m: Promise<Result<A, E>>): Promise<Out> =>
    m.then(r => (r.ok ? handlers.ok(r.value) : handlers.err(r.error)));

function pipe<A>(a: A): A;
function pipe<A, B = never>(a: A, ab: (a: A) => B): B;
function pipe<A, B = never, C = never>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C
): C;
// …two more overloads, same shape, up to five arguments
function pipe(a: unknown, ...fs: Array<(x: any) => unknown>): unknown {
  return fs.reduce((x, f) => f(x), a);
}
```

About thirty lines. The error is a value, so it gets the tools that every value gets. That is the whole idea. Now we look at four limits of this code.

## Where it breaks

**One: the unions grow by hand.** Inside an expression, `flatMap` grows the error channel for you. But a named function needs a written signature. Each middle layer repeats the union:

```ts
// every layer hands its caller a bigger union, and every middleman re-wraps it
Promise<
  Result<
    Confirmation,
    NotFound | PaymentFailed | UpstreamUnavailable | NotificationFailed
  >
>;
```

Four tags, spelled out at every layer. Add a fifth failure next year, and you edit every one of these unions, in every file, in every signature. Part 1 said: errors declare themselves as they compose. They do. But you are the one who declares them, again and again.

**Two: recovery has no structure.** The retry you want takes three inputs: which errors, how many tries, how long between tries. What you actually write is a loop with a counter and a delay, at every call site that needs it. Timeout is another loop. Fallback is another. Part 1 said: retry is a decision that the caller makes. This type does not help the caller make it.

**Three: you operate the machine.** `pipe` brought back the reading order. But the tools still run every step. Every fallible step wears the name `flatMap`. Every transform wears `map`. And the generic placement is fragile: put the error channel on the wrong side of the arrow, and TypeScript fills it in as `unknown`. The union then disappears, with no error message. The nesting is gone. The work is not.

**Four: promises are eager and unstoppable.** A call starts its work immediately. `fetchUser("u_123")` starts the fetch. There is no way to hold "a fetch that will happen later." So you cannot compose, test, or postpone a step on your own. And a `Promise` cannot stop. A timeout gives up. The fetch keeps running. It still charges the card. Thirty lines can describe failure. They cannot manage it.

None of this is a bug in the pattern. It is the pattern at its size limit.

Next: hand the plumbing to a runtime where sync and async were never separate types to begin with.

---

*This post was written with AI assistance. The ideas are my own.*
