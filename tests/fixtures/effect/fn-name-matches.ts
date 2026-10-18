import { Effect } from 'effect';

export const findUser = Effect.fn('lookup')(function* (id: string) {
	yield* Effect.log(id);
});

export const service = {
	query: Effect.fn('Database.select')(function* (sql: string) {
		yield* Effect.log(sql);
	}),
};

export const matching = Effect.fn('matching')(function* () {
	yield* Effect.log('ok');
});

export const qualified = Effect.fn('Service.qualified')(function* () {
	yield* Effect.log('ok');
});
