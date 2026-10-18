import { Config, Context, Data, Effect, Layer, Schema } from 'effect';

import type { Result } from 'effect';

export class Db extends Context.Service<
	Db,
	{
		readonly findUser: (id: string) => Effect.Effect<User, DbError>;
	}
>()('app/Db') {
	static readonly layer = Layer.effect(
		Db,
		Effect.gen(function* () {
			const url = yield* Config.Redacted('DATABASE_URL');
			yield* Effect.log('Connecting', url);

			const findUser = Effect.fn('Db.findUser')(function* (id: string) {
				if (id.length === 0) return yield* new DbError({ message: 'Empty id' });
				return new User({ id, name: 'Alice' });
			});

			return Db.of({ findUser });
		}),
	);
}

export class DbError extends Schema.TaggedError<DbError>()('DbError', {
	message: Schema.String,
}) {}

export class User extends Schema.Class<User>('User')({
	id: Schema.String,
	name: Schema.String,
}) {}

export class NotFound extends Data.TaggedError('NotFound')<{ readonly id: string }> {}

export class Port extends Context.Reference<number>('app/Port', { defaultValue: () => 3_000 }) {}

export const greet = Effect.fn('greet')(
	function* (id: string) {
		const db = yield* Db;
		const user = yield* db.findUser(id);
		yield* Effect.log(`Hello ${user.name}`);
		return user.name;
	},
	Effect.withSpan('greet.outer'),
	Effect.annotateLogs({ method: 'greet' }),
);

export const validate = Effect.fnUntraced(function* (size: number) {
	if (!Number.isInteger(size)) return yield* Effect.fail(new NotFound({ id: String(size) }));
	return size;
});

export const constant = Effect.gen(function* () {
	return 1;
});

export const parsed = Effect.try({
	try: () => {
		throw new Error('parse');
	},
	catch: () => new NotFound({ id: 'parse' }),
});

export const all = Effect.forEach(
	['1', '2'],
	(id) =>
		Effect.gen(function* () {
			yield* Effect.log(id);
			return id;
		}),
	{ concurrency: 2 },
).pipe(Effect.withSpan('all'));

export const program = greet('1').pipe(Effect.provide(Db.layer));

export type Outcome = Result.Result<string, DbError>;
