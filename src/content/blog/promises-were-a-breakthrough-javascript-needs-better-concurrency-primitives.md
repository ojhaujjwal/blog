---
author: Ujjwal Ojha
pubDatetime: 2026-09-04T19:30:00+10:00
title: "Promises Were a Breakthrough: JavaScript Needs Better Concurrency Primitives"
slug: promises-were-a-breakthrough-javascript-needs-better-concurrency-primitives
featured: true
draft: false
description: Promises were the right answer in 2015. Retry, cancellation, structured concurrency, and resource safety have outgrown them. Here's the model that fills the gap.
tags:
  - concurrency
  - typescript
  - effect
---

Promises solved a 2013 problem: callback pyramids. But a Promise starts the moment you create it. It owns nothing after that. When your work must retry, stop, release resources, or carry request data, you write the missing parts yourself: thunks, AbortSignals, timeouts, and `finally` blocks.

I used Promises before JavaScript had them — [Q](https://github.com/kriskowal/q) in 2013, then the ECMAScript standard in 2015.

Promises still solve the callback problem well. But after years of building distributed systems in Node.js, I no longer think they are enough.

## Part I: Where Promises Fall Short

### A Promise Starts Too Soon to Retry

The executor is the function passed to `new Promise`. JavaScript calls it before the constructor returns. The operation can finish later, but its start is not deferred.

```ts
const request = new Promise((resolve) => {
  console.log("Request started");
  resolve(getUser());
});
```

The Promise is a handle to work that already started, not a reusable description of how to produce a value. Once it settles, it exposes the same result or error. It contains no instruction that can start a second attempt.

```ts
const request = getUser(); // getUser() starts the request immediately.

await retry(request); // Every attempt awaits the same settled Promise.
```

A thunk fixes this problem. The thunk is a recipe that creates a new Promise for each attempt.

```ts
await retry(() => getUser()); // Each attempt calls getUser() and starts a new Promise.
```

This pattern works, but every retryable API must expose a thunk. The caller must remember the convention.

### Cancellation Needs Manual Signal Plumbing

The standard Promise API has no cancellation operation. An `AbortController` produces an `AbortSignal` that asks an underlying operation to stop.

Every layer must accept and forward the signal, and the final client must honor it:

```ts
function showUser(id: string, signal: AbortSignal) {
  return userService.load(id, signal); // forwards again
}

function loadUser(id: string, signal: AbortSignal) {
  return httpClient.getUser(id, { signal }); // the client honors it
}
```

This is not Promise cancellation. It is a separate request to cancel the work. The pattern reaches `fetch`, Axios, or a database driver only when that library supports the signal.

TC39 tried to add [cancelable Promises](https://github.com/tc39/proposal-cancelable-promises). The proposal was withdrawn in 2016. The later discussion made a different distinction: [cancel requests, not results](https://github.com/tc39/proposal-cancellation).

A Promise can have several observers. One observer cannot safely control shared work for all the others.

### Timeouts Need Per-API Policy

A timeout is a separate operational rule. Some Promise-based clients accept a timeout option. Others require an `AbortSignal`. Others provide no timeout support.

```ts
async function generateReport(reportInput: ReportInput) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);

  try {
    return await reportClient.generate(reportInput, {
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}
```

The code owns the timer, signal, cleanup, and error mapping. Each client can use a different timeout API.

### Promise Combinators Do Not Own Concurrent Work

Structured concurrency gives concurrent child work an owner. The owner waits for its children and ends their work when the parent ends.

`Promise.all` rejects after the first error. The remaining operations continue in the background. To stop them, the code must create a controller and share its signal.

```ts
async function loadUsers(ids: ReadonlyArray<string>) {
  const controller = new AbortController();

  try {
    return await Promise.all(
      ids.map((id) => httpClient.getUser(id, { signal: controller.signal })),
    );
  } catch (error) {
    controller.abort();
    throw error;
  }
}
```

`Promise.all` did not perform this cancellation. The wrapper added a separate lifetime policy. It works only when the HTTP client honors the signal.

`Promise.race` has the same problem. Its losing operations continue after the winner settles.

### Promise Cleanup Is Manual

Async work can acquire a connection, stream, or lock. It must release that resource after success, failure, or cancellation.

```ts
async function useResource() {
  const resource = await acquire();

  try {
    return await resource.use();
  } finally {
    await resource.close();
  }
}
```

The code is correct only when every path keeps this structure. More composition creates more cleanup paths.

### The Workarounds Do Not Form One Model

Thunks solve eager execution. Abort signals solve some cancellation cases. Controllers coordinate some Promise groups. `finally` provides local cleanup.

Each workaround is useful. None of them gives all async work one owner, one lifetime, and one execution model. Part III builds one flow with each model side by side.

## Part II: Effect Uses a Different Model

[Effect](https://effect.website/docs/v4/resource-management/introduction) does not treat an asynchronous operation as a result that already exists. It represents the operation as a lazy program. The program describes what to do. Running it starts the work.

A fiber is the running instance of an Effect. The runtime can compose fibers, interrupt them, and supervise their child fibers.

### Lazy Programs Make Retry Natural

An Effect is a lazy description of work. Creating it does not start the work. A retry policy can run the same description again.

```ts
const program = Effect.gen(function* () {
  const user = yield* userClient.getUser(id).pipe(
    Effect.retry(Schedule.recurs(3))
  );
});
```

Nothing has run yet. `program` is still a description. Something must run it. Then `Effect.retry` decides to start another attempt. The API does not need a thunk convention.

### Fibers Make Interruption Explicit

A fiber is also the unit that Effect can interrupt. An Effect-native client can connect its request to fiber interruption: if the fiber is interrupted, the client stops the request.

When a user leaves a page, the UI can interrupt the page fiber. When a service shuts down gracefully, it can interrupt its root fiber.

The interruption is explicit in a small integration:

```ts
const pageFiber = Effect.runFork(pageProgram);

const stopPage = () => {
  void Effect.runPromise(Fiber.interrupt(pageFiber));
};
```

For a Node.js application, use [NodeRuntime.runMain](https://www.effect.website/docs/v4/platform/runtime) as the process entry point. It listens for `SIGINT` and `SIGTERM`, then interrupts the main fiber via `NodeRuntime.runMain(program)`.

### A Timer Is Also an Effect

An Effect timer can race the actual work. The first result wins. The loser is interrupted.

```ts
const timeout = Effect.gen(function* () {
  yield* Effect.sleep("5 seconds");
  return yield* Effect.fail("ReportTimedOut");
});

const timedReport = Effect.raceFirst(
  reportClient.generate(reportInput),
  timeout,
);
```

If report generation finishes first, Effect interrupts the timer. If the timer fails first, Effect interrupts report generation.

### `Effect.timeout` Standardizes the Pattern

`Effect.timeout` applies the same policy with one operator. It returns a standard `TimeoutError` when the deadline wins. It also interrupts the source Effect.

```ts
const timedReport = reportClient.generate(reportInput).pipe(
  Effect.timeout("5 seconds"),
  Effect.retry({
    times: 3,
    while: (error) => error._tag === "TimeoutError",
  }),
);
```

The two operators compose. `Effect.retry` sits outside the timeout. Every attempt gets a new five second limit. If the report runs long three times, it fails with `TimeoutError`.

The `while` predicate limits the retries to timeouts. Other failures, for example a bad report input, fail at once.

The report client still must support interruption. The timeout policy does not depend on a client-specific timeout API.

### Child Fibers Give Concurrent Work an Owner

`Effect.all` can run Effects concurrently. Its fail-fast behavior interrupts still-running children after a failure. The parent fiber owns these child fibers.

Consider a checkout flow: inventory and shipping run as preflight tasks, and the order write starts only after both succeed.

```ts
const checkout = (cart: Cart) =>
  Effect.gen(function* () {
    const [stock, shipping] = yield* Effect.all(
      [
        inventoryClient.check(cart),
        shippingClient.quote(cart),
      ],
      { concurrency: "unbounded" },
    );

    if (!stock.available) {
      return yield* Effect.fail("OutOfStock");
    }

    return yield* orderClient.create(cart, shipping);
  });
```

The inventory check and shipping quote run concurrently. `Effect.gen` waits for both results. The order request cannot start early.

If either preflight task fails, Effect interrupts the other task. This is the part that `Promise.all` does not provide by itself.

Part III extends this flow with a database connection, a request context, and retry policies.

### Scopes Own Resource Lifetimes

An Effect scope owns acquired resources. `Effect.acquireRelease` registers a finalizer when it acquires a resource. The finalizer runs when the scope closes.

```ts
const resourceEffect = Effect.acquireRelease(
  acquire,
  (resource) => resource.close(),
);

const program = Effect.scoped(
  Effect.gen(function* () {
    const resource = yield* resourceEffect;
    return yield* resource.use();
  }),
);
```

The scope closes after success, failure, or interruption. The cleanup policy stays with the resource.

> [!NOTE]
> Effect manages work only while its process runs. A graceful shutdown can interrupt the root fiber before the process ends. A hard kill or crash prevents finalizers from running. Idempotent operations and deadlines reduce the recovery risk.

### Context Carries Request Data

Dependency injection containers already remove much client and logger plumbing. LoopBack and NestJS also support request-scoped providers.

Authentication context is a different example of request data. Promise code must pass it through each asynchronous function that needs it.

```ts
function handleRequest(auth: AuthContext) {
  return userService.loadCurrent(auth);
}

function loadCurrent(auth: AuthContext) {
  return profileClient.load(auth.subjectId);
}
```

Effect `Context` records the services and request values that a program needs. A request provides its authentication context once. Child Effects can read that context where they run.

```ts
class AuthContext extends Context.Service<
  AuthContext,
  { readonly subjectId: string }
>()("AuthContext") {}

const currentSubjectId = Effect.gen(function* () {
  const auth = yield* AuthContext;
  return auth.subjectId;
});
```

`Effect.provideService` wraps only the Effect that receives it. Its child work can read the provided context. A parallel sibling keeps its own context.

```ts
const handleRequest = (subjectId: string) =>
  Effect.gen(function* () {
    const subject = yield* currentSubjectId;
    return yield* profileClient.load(subject);
  }).pipe(Effect.provideService(AuthContext, { subjectId }));

const requestA = handleRequest("subject-a");
const requestB = handleRequest("subject-b");

const parallelRequests = Effect.all([requestA, requestB], {
  concurrency: "unbounded",
});
```

<!--
  Diagram source: src/content/blog/promises-are-broken.flowchart.mmd
  Regenerate the SVG from the repo root with:
  npx -y @mermaid-js/mermaid-cli -i src/content/blog/promises-are-broken.flowchart.mmd -o public/assets/fiber-context.svg
-->
<img
  src="/assets/fiber-context.svg"
  alt="Diagram: a parent fiber with two request fibers, each running a child that reads a different subject id from its own context"
/>

`requestA` and `requestB` are the same program with different contexts. `requestA` reads `subject-a`. `requestB` reads `subject-b`. No branch sees the context of the other.

The Promise `handleRequest` above passes `auth` through the call chain. This one passes nothing.

This is not a global variable.

## Part III: The Same Flow in Promise and Effect

The previous section showed a checkout flow with two preflight tasks. The full flow adds three requirements:

- The order write needs a database connection. The connection must close on every path.
- The inventory check must retry when the network fails.
- The shipping quote has a five second limit.

This is the full flow as one Effect:

```ts
const checkout = (cart: Cart) =>
  Effect.gen(function* () {
    // connectDb reads AuthContext from Context
    const db = yield* Effect.acquireRelease(
      connectDb(),
      (db) => db.close(),
    );

    const [stock, shipping] = yield* Effect.all(
      [
        inventoryClient.check(cart).pipe(
          Effect.retry({
            times: 2,
            while: (error) => error._tag === "TimeoutError",
          }),
        ),
        shippingClient.quote(cart).pipe(Effect.timeout("5 seconds")),
      ],
      { concurrency: "unbounded" },
    );

    if (!stock.available) {
      return yield* Effect.fail("OutOfStock");
    }

    return yield* orderClient.create(cart, shipping, db);
  }).pipe(Effect.provideService(AuthContext, session.auth));
```

Each policy appears one time:

- `Effect.acquireRelease` closes the connection after success, failure, and interruption.
- `Effect.retry` retries the inventory check after a timeout. Every attempt gets a new deadline.
- `Effect.timeout` gives the shipping quote five seconds. It interrupts the quote when the deadline passes.
- `Effect.all` runs the two preflight tasks at the same time. It interrupts the other task when one fails.
- `AuthContext` is provided one time, at the boundary. `connectDb` reads it. No function passes it as a parameter.

The flow is still a description. An interrupt cancels every request in flight. The connection finalizer still runs.

This is the same flow with Promises:

```ts
// 1. auth is a parameter that every function must accept (Effect: Context)
async function checkout(
  cart: Cart,
  auth: AuthContext,
  signal: AbortSignal,
) {
  const db = await connectDb(auth);

  // 2. a child controller forwards the caller's signal (Effect: fiber interruption)
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal.addEventListener("abort", onAbort);

  try {
    let stock;
    let shipping;

    try {
      ([stock, shipping] = await Promise.all([
        checkInventory(cart, controller.signal),
        quoteShipping(cart, controller.signal),
      ]));
    } catch (error) {
      // 3. fail-fast is manual: stop the sibling Promise.all leaves running (Effect: Effect.all)
      controller.abort();
      throw error;
    }

    if (!stock.available) {
      throw new OutOfStockError();
    }

    return await orderClient.create(cart, shipping, db, {
      signal: controller.signal,
    });
  } finally {
    // 4. cleanup lives here and only here; forget it and the connection leaks (Effect: acquireRelease)
    signal.removeEventListener("abort", onAbort);
    await db.close();
  }
}

// 5. timeout is hand-rolled per call: controller, timer, cleanup (Effect: Effect.timeout)
async function quoteShipping(cart: Cart, signal: AbortSignal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);

  try {
    return await shippingClient.quote(cart, {
      signal: AbortSignal.any([signal, controller.signal]),
    });
  } finally {
    clearTimeout(timer);
  }
}

// 6. retry is a hand-rolled loop; each attempt needs a fresh deadline (Effect: Effect.retry)
async function checkInventory(cart: Cart, signal: AbortSignal) {
  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);

    try {
      return await inventoryClient.check(cart, {
        signal: AbortSignal.any([signal, controller.signal]),
      });
    } catch (error) {
      if (attempt >= 2 || !isTimeoutError(error)) {
        throw error;
      }
    } finally {
      clearTimeout(timer);
    }
  }
}
```

This Promise version is correct. It has 75 lines. The Effect version has 27 lines. The Promise version also uses six conventions: thread the auth, forward the signal, stop the sibling, remember the cleanup, write the timeout, write the retry. You can forget each one.

## Promises Are Still Useful at the Edge

A Promise is still the right handle at the edge of a program. `fetch` returns one. Browser APIs return them. `Effect.runPromise` returns one. So Promise code and Effect code meet at the boundary without friction.

Inside the edge, Part III showed the difference. The same three requirements took 75 lines of Promise code and 27 lines of Effect code. The Promise version was boilerplate and manual juggling. The Effect version was simpler, once you learn the model.

Promises solved the callback problem. They leave retry, cancellation, structure, cleanup, and context to you. Effect solves those problems with better primitives.

## Further Reading

- [ECMAScript 2015 Promise specification](https://262.ecma-international.org/6.0/#sec-promise-objects)
- [TC39 cancelable Promises proposal](https://github.com/tc39/proposal-cancelable-promises)
- [TC39 cancellation discussion](https://github.com/tc39/proposal-cancellation)
- [Effect retrying](https://www.effect.website/docs/v4/error-management/retrying)
- [Effect timing out](https://www.effect.website/docs/v4/error-management/timing-out)
- [Effect resource management](https://www.effect.website/docs/v4/resource-management/scope)
- [Effect fibers](https://www.effect.website/docs/v4/concurrency/fibers)
- [Effect NodeRuntime](https://www.effect.website/docs/v4/platform/runtime)

---

*This post was written with AI assistance. The ideas are all my own.*
