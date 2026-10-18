import { Config, Context, Effect, Layer, Match, Redacted, Schema, Stream } from 'effect';
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from 'effect/http-api';

export const UserId = Schema.String.pipe(Schema.brand('UserId'));
export type UserId = typeof UserId.Type;

export const OrderId = Schema.Number.pipe(Schema.brand('OrderId'));
export type OrderId = typeof OrderId.Type;

export const Order = Schema.Struct({
	id: OrderId,
	owner: UserId,
	total: Schema.Number,
});
export type Order = typeof Order.Type;

export class NotFound extends Schema.TaggedError<NotFound>()('NotFound', {
	id: Schema.String,
}) {}

export class ParseError extends Schema.TaggedError<ParseError>()('ParseError', {
	input: Schema.String,
}) {}

export class Money extends Schema.Class<Money>('Money')({
	amount: Schema.Number,
	currency: Schema.String,
}) {
	get label() {
		return `${this.amount} ${this.currency}`;
	}

	add(other: Money) {
		return new Money({ amount: this.amount + other.amount, currency: this.currency });
	}
}

export class ApiConfig extends Context.Service<
	ApiConfig,
	{
		readonly apiKey: Redacted.Redacted;
		readonly port: number;
	}
>()('app/ApiConfig') {
	static readonly layer = Layer.effect(
		ApiConfig,
		Effect.gen(function* () {
			const apiKey = yield* Config.Redacted('API_KEY');
			const port = yield* Config.Port('PORT').pipe(Config.withDefault(3_000));
			return ApiConfig.of({ apiKey, port });
		}),
	);
}

export class UserRepo extends Context.Service<
	UserRepo,
	{
		readonly find: (id: UserId) => Effect.Effect<Order, NotFound>;
	}
>()('app/UserRepo') {
	static readonly layer = Layer.effect(
		UserRepo,
		Effect.gen(function* () {
			const config = yield* ApiConfig;
			yield* Effect.log('Starting repo', config.port);

			const find = Effect.fn('UserRepo.find')(
				function* (id: UserId) {
					if (id.length === 0) return yield* new NotFound({ id });
					return Order.make({ id: OrderId.make(1), owner: id, total: 10 });
				},
				Effect.withSpan('UserRepo.find.outer'),
				Effect.catchTag('NotFound', (error) => Effect.fail(error)),
			);

			return UserRepo.of({ find });
		}),
	).pipe(Layer.provide(ApiConfig.layer));
}

export const parse = Effect.fn('parse')(function* (input: string) {
	const value = Number(input);
	if (Number.isNaN(value)) return yield* new ParseError({ input });
	return value;
});

export const safeParse = (input: string) =>
	parse(input).pipe(
		Effect.catchTag('ParseError', (error) => Effect.as(Effect.logWarning(error.input), 0)),
		Effect.tapError((error) => Effect.logError(error)),
	);

export const recovered = parse('1').pipe(Effect.catch((error) => Effect.succeed(error.input.length)));

export const mapped = parse('1').pipe(Effect.mapError((error) => new NotFound({ id: error.input })));

export const totals = Stream.fromIterable([1, 2, 3]).pipe(
	Stream.mapEffect((item) => parse(String(item))),
	Stream.filter((item) => item > 1),
	Stream.catch((error) => Stream.make(error.input.length)),
	Stream.runCollect,
);

type Shape = { readonly _tag: 'Circle'; readonly radius: number } | { readonly _tag: 'Square'; readonly side: number };

export const area = Match.type<Shape>().pipe(
	Match.tag('Circle', ({ radius }) => Math.PI * radius ** 2),
	Match.tag('Square', ({ side }) => side ** 2),
	Match.exhaustive,
);

export const describe = (value: number) =>
	Match.value(value).pipe(
		Match.when(0, () => 'zero'),
		Match.orElse(() => 'many'),
	);

export const UsersGroup = HttpApiGroup.make('users')
	.add(
		HttpApiEndpoint.get('findUser', '/users/:id', {
			params: { id: UserId },
			success: Order,
			error: NotFound,
		}),
	)
	.add(
		HttpApiEndpoint.post('createOrder', '/orders', {
			payload: Order,
			success: Order,
		}),
	);

export const Api = HttpApi.make('api').add(UsersGroup);

export const AppLayer = Layer.mergeAll(UserRepo.layer, ApiConfig.layer);

export const program = Effect.gen(function* () {
	const repo = yield* UserRepo;
	const order = yield* repo.find(UserId.make('1'));
	const money = new Money({ amount: order.total, currency: 'USD' }).add(new Money({ amount: 1, currency: 'USD' }));
	yield* Effect.log(money.label, area({ _tag: 'Circle', radius: 1 }), describe(0));
	return order;
}).pipe(Effect.provide(AppLayer));
