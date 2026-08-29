import { defineConfig } from 'oxlint';

import { nativePlugins } from './config.js';

import type { OxlintConfig } from 'oxlint';

const rules: NonNullable<OxlintConfig['rules']> = {
	'unicorn/prefer-module': 2,
	'unicorn/prefer-top-level-await': 2,
};

const config = defineConfig({
	plugins: nativePlugins,
	rules,
});

export default config;
