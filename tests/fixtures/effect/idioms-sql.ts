import { Effect, Layer, Context } from 'effect';
import { SqlClient } from 'effect/sql';

interface Order {
	readonly id: string;
	readonly userId: string;
	readonly total: number;
}

export class OrderRepo extends Context.Service<
	OrderRepo,
	{
		readonly byIds: (ids: readonly string[]) => Effect.Effect<readonly Order[], unknown>;
		readonly search: (userId: string, minTotal: number | undefined) => Effect.Effect<readonly Order[], unknown>;
		readonly insert: (order: Order) => Effect.Effect<readonly Order[], unknown>;
		readonly rename: (id: string, userId: string) => Effect.Effect<readonly Order[], unknown>;
		readonly sorted: (column: 'id' | 'total') => Effect.Effect<readonly Order[], unknown>;
	}
>()('app/OrderRepo') {
	static readonly layer = Layer.effect(
		OrderRepo,
		Effect.gen(function* () {
			const sql = yield* SqlClient.SqlClient;

			const byIds = Effect.fn('OrderRepo.byIds')(function* (ids: readonly string[]) {
				return yield* sql<Order>`SELECT * FROM ${sql('orders')} WHERE ${sql.in('id', ids)}`;
			});

			const search = Effect.fn('OrderRepo.search')(function* (userId: string, minTotal: number | undefined) {
				const clauses = [sql`user_id = ${userId}`];
				if (minTotal !== undefined) clauses.push(sql`total >= ${minTotal}`);
				return yield* sql<Order>`SELECT ${sql.csv(['id', 'total'])} FROM orders WHERE ${sql.and(clauses)} OR ${sql.or([sql`total = 0`])}`;
			});

			const insert = Effect.fn('OrderRepo.insert')(function* (order: Order) {
				return yield* sql<Order>`INSERT INTO orders ${sql.insert({ ...order })} RETURNING *`;
			});

			const rename = Effect.fn('OrderRepo.rename')(function* (id: string, userId: string) {
				return yield* sql<Order>`UPDATE orders SET ${sql.update({ userId })} WHERE id = ${id} RETURNING *`;
			});

			const sorted = Effect.fn('OrderRepo.sorted')(function* (column: 'id' | 'total') {
				yield* sql.unsafe('SET LOCAL statement_timeout = 0');
				return yield* sql<Order>`SELECT * FROM orders ORDER BY ${sql(column)} ${sql.literal('DESC')}`;
			});

			return OrderRepo.of({ byIds, search, insert, rename, sorted });
		}),
	);
}
