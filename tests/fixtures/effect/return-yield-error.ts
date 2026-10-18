import { Data, Effect } from 'effect';

export class NotFound extends Data.TaggedError('NotFound')<{ readonly id: string }> {}

export const find = Effect.fn('find')(function* (id: string) {
	if (id.length === 0) {
		yield* new NotFound({ id });
	}
	if (id === 'gone') {
		yield* Effect.fail(new NotFound({ id }));
	}
	yield* Effect.log(id);
	return id;
});
