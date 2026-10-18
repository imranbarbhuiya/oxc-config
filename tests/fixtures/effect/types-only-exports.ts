export { Effect } from 'effect';
export * from 'effect/Schema';
export type { Layer } from 'effect';
export { type Context } from 'effect';
export * as Http from '@effect/platform-node';
export type * from 'effect/Option';

export const load = () => import('effect');
