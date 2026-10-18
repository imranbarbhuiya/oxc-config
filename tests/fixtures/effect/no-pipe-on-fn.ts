import { Effect } from 'effect';

export const named = Effect.fn('named')(function* () {
	yield* Effect.log('named');
}).pipe(Effect.withSpan('outer'));

export const untraced = Effect.fnUntraced(function* () {
	yield* Effect.log('untraced');
}).pipe(Effect.withSpan('outer'));

export const allowed = Effect.gen(function* () {
	yield* Effect.log('gen');
}).pipe(Effect.withSpan('gen'));

export const combinators = Effect.fn('combinators')(function* () {
	yield* Effect.log('combinators');
}, Effect.withSpan('outer'));
