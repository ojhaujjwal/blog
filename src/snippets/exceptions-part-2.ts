// Companion code for "The Error Is a Value" (part 2 of the exceptions series).
// `npm run build` typechecks this file (prebuild runs `tsc --noEmit`), so the
// code printed in the post cannot drift from code that compiles.
//
// Trade-off vs the repo's coding standards, kept deliberately: this file
// mirrors the published post 1:1 for series continuity. Boolean `ok`
// discriminator (the exact type part 1 printed), plain tagged-object errors
// rather than `Error` subclasses, the `never` exhaustiveness idiom rather than
// `casesHandled`, and a hand-rolled `pipe` with `any` in its variadic runtime.
// No JSDoc: the post is the documentation.

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
function pipe<A, B = never, C = never, D = never>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D
): D;
function pipe<A, B = never, C = never, D = never, Out = never>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => Out
): Out;
// SAFETY: the overloads guarantee each function accepts the previous result.
// TypeScript cannot express pairwise argument alignment for a variadic reduce.
function pipe(a: unknown, ...fs: Array<(x: any) => unknown>): unknown {
  return fs.reduce((x, f) => f(x), a);
}

export { ok, err, map, flatMap, mapError, match, pipe };

// The running example.

type Order = { id: string };
type User = { id: string; activeOrder: Order };
type Receipt = { amount: number };
type Confirmation = { receiptId: string };

type NotFound = { _tag: "NotFound" };
type PaymentFailed = {
  _tag: "PaymentFailed";
  reason: "insufficient_funds" | "card_expired";
  attemptId: string;
};
type UpstreamUnavailable = {
  _tag: "UpstreamUnavailable";
  service: string;
  retriable: boolean;
};
type NotificationFailed = { _tag: "NotificationFailed"; channel: string };

type PaymentError = PaymentFailed | UpstreamUnavailable;

declare function fetchUser(id: string): Promise<Result<User, NotFound>>;
declare function chargePayment(
  order: Order
): Promise<Result<Receipt, PaymentError>>;
declare function sendReceipt(
  receipt: Receipt
): Promise<Result<Confirmation, NotificationFailed>>;

export const receiptAmount = (order: Order) =>
  pipe(
    chargePayment(order),
    map(receipt => receipt.amount)
  );

export type PlaceOrderError =
  | { _tag: "UserNotFound" }
  | { _tag: "PaymentUnavailable"; retriable: boolean };

export const placeOrder = (
  userId: string
): Promise<Result<Receipt, PlaceOrderError>> =>
  pipe(
    fetchUser(userId),
    flatMap(u => chargePayment(u.activeOrder)),
    mapError(e => {
      switch (e._tag) {
        case "NotFound":
          return { _tag: "UserNotFound" } as const;
        case "PaymentFailed":
          return { _tag: "PaymentUnavailable", retriable: false } as const;
        case "UpstreamUnavailable":
          return {
            _tag: "PaymentUnavailable",
            retriable: e.retriable,
          } as const;
      }
    })
  );

declare const log: { error: (message: string, fields: unknown) => void };
declare function showUser(message: string): void;
declare function retryLater(): void;
declare function fail(error?: unknown): void;

export const handlePlaceOrder = (userId: string): Promise<void> =>
  pipe(
    placeOrder(userId),
    flatMap(sendReceipt),
    match({
      ok: confirmation =>
        showUser(`Order confirmed: ${confirmation.receiptId}`),
      err: e => {
        log.error("order.failed", { tag: e._tag, ...e });
        switch (e._tag) {
          case "UserNotFound":
            return showUser("No such user");
          case "PaymentUnavailable":
            return e.retriable ? retryLater() : showUser("Payment failed");
          case "NotificationFailed":
            return showUser("Order placed, but the receipt email failed");
          default: {
            const _exhaustive: never = e;
            return fail(_exhaustive);
          }
        }
      },
    })
  );
