import { Duration, Effect, Layer, Option, Schedule, Schema, Context } from 'effect';
import { clearTimeout, setTimeout } from 'node:timers';

export class Timeout extends Schema.TaggedError<Timeout>()('Timeout', {}) {}

export class FetchError extends Schema.TaggedError<FetchError>()('FetchError', {
	cause: Schema.Unknown,
}) {}

export class Point extends Schema.TaggedClass<Point>()('Point', { x: Schema.Number, y: Schema.Number }) {}

export const fetchText = Effect.fn('fetchText')(function* (url: string) {
	const response = yield* Effect.tryPromise({
		try: (signal) => fetch(url, { signal }),
		catch: (error) => new FetchError({ cause: error }),
	});
	return yield* Effect.tryPromise({
		try: () => response.text(),
		catch: (error) => new FetchError({ cause: error }),
	});
});

export const withRetry = fetchText('https://example.com').pipe(
	Effect.retry(Schedule.exponential(Duration.millis(10))),
	Effect.timeoutOrElse({ duration: Duration.seconds(1), orElse: () => Effect.fail(new Timeout()) }),
	Effect.match({ onFailure: (error) => error._tag, onSuccess: (text) => text.length }),
);

export const resource = Effect.acquireRelease(Effect.succeed({ close: () => undefined }), (handle) =>
	Effect.sync(() => handle.close()),
);

export const maybe = Option.fromNullishOr(new URLSearchParams("q=1").get("q")).pipe(Option.map((value) => value.length));

export class Clock extends Context.Service<Clock, { readonly now: Effect.Effect<number> }>()('app/Clock') {
	static readonly layer = Layer.succeed(Clock, Clock.of({ now: Effect.sync(() => Date.now()) }));
}

export const delayed = Effect.callback<number>((resume) => {
	const timer = setTimeout(() => resume(Effect.succeed(1)), 10);
	return Effect.sync(() => clearTimeout(timer));
});

export const scoped = Effect.scoped(
	Effect.gen(function* () {
		const handle = yield* resource;
		const clock = yield* Clock;
		const now = yield* clock.now;
		yield* Effect.log(now, new Point({ x: 1, y: 2 }));
		return handle;
	}),
).pipe(Effect.provide(Clock.layer), Effect.ensuring(Effect.log('done')));
