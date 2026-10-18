import { Effect } from 'effect';

export const arrow = (id: string) =>
	Effect.gen(function* () {
		yield* Effect.log(id);
	});

export function declaration(id: string) {
	return Effect.gen(function* () {
		yield* Effect.log(id);
	}).pipe(Effect.withSpan('declaration'));
}

export const service = {
	method: (id: string) =>
		Effect.gen(function* () {
			yield* Effect.log(id);
		}),
};

export const callback = Effect.forEach(['1'], (id) =>
	Effect.gen(function* () {
		yield* Effect.log(id);
	}),
);
