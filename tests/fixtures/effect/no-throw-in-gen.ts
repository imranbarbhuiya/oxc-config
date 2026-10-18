import { Effect } from 'effect';

export const gen = Effect.gen(function* () {
	yield* Effect.log('gen');
	throw new Error('gen');
});

export const named = Effect.fn('named')(function* (flag: boolean) {
	if (flag) throw new Error('named');
	yield* Effect.log('named');
});

export const nested = Effect.gen(function* () {
	const value = yield* Effect.try({
		try: () => {
			throw new Error('allowed');
		},
		catch: () => 'failed',
	});
	return value;
});

export function plain() {
	throw new Error('allowed');
}
