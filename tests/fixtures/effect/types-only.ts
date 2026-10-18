import { NodeRuntime } from '@effect/platform-node';
import { Effect } from 'effect';
import { type Layer } from 'effect';
import { Schema } from 'effect/Schema';

import type { Context } from 'effect';
import type { Result } from 'effect/Result';

export const used = [Effect, Schema, NodeRuntime];
export type Used = [Context.Context<never>, Result<string, never>, Layer.Layer<never>];
