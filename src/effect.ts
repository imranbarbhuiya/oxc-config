import { defineConfig } from 'oxlint';

import { localPlugin, nativePlugins, packagePlugin } from './config.js';

import type { OxlintConfig } from 'oxlint';

const V3_MESSAGE = 'This is an Effect v3 import path that does not exist in Effect v4.';

const rules: NonNullable<OxlintConfig['rules']> = {
	'mahir-effect/fn-name-matches': 2,
	'mahir-effect/no-gen-wrapper': 2,
	'mahir-effect/no-pipe-on-fn': 2,
	'mahir-effect/no-run-outside-edge': 2,
	'mahir-effect/no-throw-in-gen': 2,
	'mahir-effect/no-unsafe-sql': 2,
	'mahir-effect/return-yield-error': 2,
	'no-restricted-imports': [
		2,
		{
			paths: [
				{ name: 'effect/Either', message: 'Effect v4 replaced `effect/Either` with `effect/Result`.' },
				{ name: '@effect/platform', message: `${V3_MESSAGE} Import from \`effect\` or \`effect/<module>\`.` },
				{ name: '@effect/schema', message: `${V3_MESSAGE} Import \`Schema\` from \`effect\`.` },
				{ name: '@effect/rpc', message: `${V3_MESSAGE} Import from \`effect/rpc\`.` },
				{ name: '@effect/cluster', message: `${V3_MESSAGE} Import from \`effect/cluster\`.` },
				{ name: '@effect/sql', message: `${V3_MESSAGE} Import from \`effect/sql\`.` },
			],
			patterns: [
				{
					group: ['effect/unstable/*'],
					message: 'Effect v4 dropped the `unstable` segment. Import from `effect/<module>`.',
				},
				{
					group: ['@effect/platform/*', '@effect/schema/*', '@effect/rpc/*', '@effect/cluster/*', '@effect/sql/*'],
					message: `${V3_MESSAGE} Import from \`effect\` or \`effect/<module>\`.`,
				},
			],
		},
	],
	'node-js/no-process-env': 2,
	'func-names': [2, 'as-needed', { generators: 'never' }],
	'no-use-before-define': [
		2,
		{
			classes: false,
			functions: false,
			variables: true,
		},
	],
	'no-redeclare': 0,
	'promise/prefer-await-to-callbacks': 0,
	'promise/prefer-await-to-then': 0,
	'require-yield': 0,
	'unicorn/prefer-top-level-await': 0,
	'unicorn/throw-new-error': 0,
};

const config = defineConfig({
	plugins: nativePlugins,
	jsPlugins: [localPlugin('mahir-effect', './plugins/effect.js'), packagePlugin('node-js', 'eslint-plugin-n')],
	rules,
	overrides: [
		{
			files: ['**/scripts/**'],
			rules: {
				'node-js/no-process-env': 0,
			},
		},
	],
});

export default config;
