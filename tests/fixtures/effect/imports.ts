import { Sharding } from '@effect/cluster';
import { FileSystem } from '@effect/platform';
import { NodeRuntime } from '@effect/platform-node';
import { Path } from '@effect/platform/Path';
import { Rpc } from '@effect/rpc';
import { Schema } from '@effect/schema';
import { SqlClient } from '@effect/sql';
import { Effect } from 'effect';
import { Either } from 'effect/Either';
import { HttpServer } from 'effect/http';
import { HttpClient } from 'effect/unstable/http';

export const used = [
	Either,
	HttpClient,
	FileSystem,
	Path,
	Schema,
	Rpc,
	Sharding,
	SqlClient,
	Effect,
	HttpServer,
	NodeRuntime,
];
