import n from 'eslint-plugin-n';
import globals from 'globals';

import type { TSESLint } from '@typescript-eslint/utils';

const rules: TSESLint.FlatConfig.Rules = {
	'n/callback-return': 2,
	'n/handle-callback-err': 2,
	'n/no-callback-literal': 2,
	'n/no-deprecated-api': 2,
	'n/no-exports-assign': 2,
	'n/no-new-require': 2,
	'n/no-path-concat': 2,
	'n/no-sync': [
		2,
		{
			allowAtRootLevel: true,
			ignores: ['existsSync'],
		},
	],
	'n/no-unpublished-bin': 2,
	'n/prefer-global/buffer': [2, 'never'],
	'n/prefer-global/console': [2, 'always'],
	'n/prefer-global/process': [2, 'never'],
	'n/prefer-global/text-decoder': [2, 'never'],
	'n/prefer-global/text-encoder': [2, 'never'],
	'n/prefer-global/url': [2, 'never'],
	'n/prefer-global/url-search-params': [2, 'never'],
	'n/process-exit-as-throw': 2,
	'n/hashbang': [
		2,
		{
			convertPath: {
				'src/**/*.js': ['^src/(.+?)\\.js$', 'dist/$1.js'],
			},
		},
	],
	'no-restricted-globals': [
		2,
		{ name: 'Buffer', message: 'Import Buffer from `node:buffer` instead' },
		{ name: 'process', message: 'Import process from `node:process` instead' },
		{ name: 'setTimeout', message: 'Import setTimeout from `node:timers` instead' },
		{ name: 'setInterval', message: 'Import setInterval from `node:timers` instead' },
		{ name: 'setImmediate', message: 'Import setImmediate from `node:timers` instead' },
		{ name: 'clearTimeout', message: 'Import clearTimeout from `node:timers` instead' },
		{ name: 'clearInterval', message: 'Import clearInterval from `node:timers` instead' },
		{ name: 'clearImmediate', message: 'Import clearImmediate from `node:timers` instead' },
	],
	'unicorn/prefer-node-protocol': 2,
	'unicorn/require-post-message-target-origin': 0,
};

const config: TSESLint.FlatConfig.ConfigArray = [
	{
		name: 'mahir/node',
		languageOptions: {
			globals: {
				...n.configs['recommended-module'].globals,
				...globals.node,
			},
			parserOptions: {
				ecmaFeatures: {
					globalReturn: true,
				},
			},
		},
		plugins: {
			n,
		},
		rules,
	},
];

export default config;
