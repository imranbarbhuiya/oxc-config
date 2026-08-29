import { defineConfig } from 'oxlint';

import { nativePlugins, packagePlugin } from './config.js';

import type { OxlintConfig } from 'oxlint';

const rules: NonNullable<OxlintConfig['rules']> = {
	'node-js/prefer-global/buffer': [2, 'always'],
	'node-js/prefer-global/console': [2, 'always'],
	'node-js/prefer-global/process': [2, 'always'],
	'node-js/prefer-global/text-decoder': [2, 'always'],
	'node-js/prefer-global/text-encoder': [2, 'always'],
	'node-js/prefer-global/url': [2, 'always'],
	'node-js/prefer-global/url-search-params': [2, 'always'],
	'no-restricted-globals': 0,
};

const config = defineConfig({
	plugins: nativePlugins,
	jsPlugins: [packagePlugin('node-js', 'eslint-plugin-n')],
	rules,
});

export default config;
