import { defineConfig } from 'oxlint';

import common from './dist/common.js';
import module from './dist/module.js';
import node from './dist/node.js';
import typescript from './dist/typescript.js';

export default defineConfig({
	extends: [common, node, module, typescript],
	ignorePatterns: ['dist/**', 'node_modules/**', 'tests/fixtures/**'],
	env: {
		node: true,
	},
	globals: {
		Bun: 'readonly',
		Response: 'readonly',
	},
	categories: {
		correctness: 'off',
	},
	options: {
		typeAware: true,
	},
	overrides: [
		{
			files: ['src/cli/index.ts'],
			rules: {
				'node-js/hashbang': 'off',
			},
		},
	],
});
