import { defineConfig } from 'oxlint';

import { nativePlugins, packagePlugin } from './config.js';

import type { OxlintConfig } from 'oxlint';

const rules: NonNullable<OxlintConfig['rules']> = {
	'jsdoc/check-access': 2,
	'jsdoc-js/check-alignment': 2,
	'jsdoc-js/check-param-names': 2,
	'jsdoc/check-property-names': 2,
	'jsdoc-js/check-syntax': 2,
	'jsdoc/check-tag-names': 2,
	'jsdoc-js/check-types': 2,
	'jsdoc-js/check-values': 2,
	'jsdoc/empty-tags': 2,
	'jsdoc/implements-on-classes': 2,
	'jsdoc-js/multiline-blocks': [
		2,
		{
			noMultilineBlocks: false,
			noSingleLineBlocks: true,
		},
	],
	'jsdoc-js/no-bad-blocks': 2,
	'jsdoc/no-defaults': 2,
	'jsdoc-js/no-multi-asterisks': 2,
	'jsdoc-js/no-undefined-types': 2,
	'jsdoc-js/require-asterisk-prefix': 2,
	'jsdoc/require-param-name': 2,
	'jsdoc/require-property': 2,
	'jsdoc/require-property-description': 2,
	'jsdoc/require-property-name': 2,
	'jsdoc/require-property-type': 2,
	'jsdoc-js/tag-lines': [2, 'never', { startLines: 1 }],
	'jsdoc-js/valid-types': 2,
};

const config = defineConfig({
	plugins: nativePlugins,
	jsPlugins: [packagePlugin('jsdoc-js', 'eslint-plugin-jsdoc')],
	rules,
});

export default config;
