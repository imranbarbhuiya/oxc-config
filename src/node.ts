import { defineConfig } from 'oxlint';

import { nativePlugins, packagePlugin } from './config.js';

import type { OxlintConfig } from 'oxlint';

const rules: NonNullable<OxlintConfig['rules']> = {
	'node/callback-return': 2,
	'node/handle-callback-err': 2,
	'node-js/no-callback-literal': 2,
	'node-js/no-deprecated-api': 2,
	'node/no-exports-assign': 2,
	'node/no-new-require': 2,
	'node/no-path-concat': 2,
	'node/no-sync': [
		2,
		{
			allowAtRootLevel: true,
			ignores: ['existsSync'],
		},
	],
	'node-js/no-unpublished-bin': 2,
	'node-js/prefer-global/buffer': [2, 'never'],
	'node-js/prefer-global/console': [2, 'always'],
	'node-js/prefer-global/process': [2, 'never'],
	'node-js/prefer-global/text-decoder': [2, 'never'],
	'node-js/prefer-global/text-encoder': [2, 'never'],
	'node-js/prefer-global/url': [2, 'never'],
	'node-js/prefer-global/url-search-params': [2, 'never'],
	'node-js/process-exit-as-throw': 2,
	'node-js/hashbang': [
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

const config = defineConfig({
	plugins: nativePlugins,
	jsPlugins: [packagePlugin('node-js', 'eslint-plugin-n')],
	env: {
		node: true,
	},
	rules,
});

export default config;
