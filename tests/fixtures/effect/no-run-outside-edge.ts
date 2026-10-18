import { Effect } from 'effect';

const program = Effect.log('run');

export const promise = Effect.runPromise(program);
export const sync = Effect.runSync(program);
export const fiber = Effect.runFork(program);
