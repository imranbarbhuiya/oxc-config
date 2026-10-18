import { Effect } from 'effect';
import { SqlClient } from 'effect/sql';

export const unsafeQueries = Effect.fn('unsafeQueries')(function* (id: string, column: string, table: string) {
	const sql = yield* SqlClient.SqlClient;
	yield* sql.unsafe(`SELECT * FROM users WHERE id = '${id}'`);
	yield* sql.unsafe('SELECT * FROM users WHERE id = ' + id);
	yield* sql.unsafe(column);
	const order = sql.literal(`ORDER BY ${column}`);
	yield* sql`SELECT * FROM orders ${order}`;
	yield* sql.unsafe(table.trim(), [id]);
	yield* sql.unsafe('SELECT 1');
	yield* sql.unsafe(`SET LOCAL statement_timeout = 0`);
	yield* sql.unsafe('SELECT * FROM users WHERE id = $1', [id]);
	yield* sql`SELECT * FROM users ${sql.literal('')}`;
});

export class UserRepo {
	constructor(private readonly sql: SqlClient.SqlClient) {}

	byName(name: string) {
		return this.sql.unsafe(`SELECT * FROM users WHERE name = '${name}'`);
	}
}

export function other(foo: { unsafe: (text: string) => string; literal: (text: string) => string }, text: string) {
	return [foo.unsafe(text), foo.literal(text)];
}

export function custom(db: SqlClient.SqlClient, text: string) {
	return db.unsafe(text);
}
