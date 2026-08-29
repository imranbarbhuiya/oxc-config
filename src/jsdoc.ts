import eslintPluginJsdoc from 'eslint-plugin-jsdoc';

import type { TSESLint } from '@typescript-eslint/utils';

const rules: TSESLint.FlatConfig.Rules = {
	'jsdoc/check-access': 2,
	'jsdoc/check-alignment': 2,
	'jsdoc/check-param-names': 2,
	'jsdoc/check-property-names': 2,
	'jsdoc/check-syntax': 2,
	'jsdoc/check-tag-names': 2,
	'jsdoc/check-types': 2,
	'jsdoc/check-values': 2,
	'jsdoc/empty-tags': 2,
	'jsdoc/implements-on-classes': 2,
	'jsdoc/multiline-blocks': [
		2,
		{
			noMultilineBlocks: false,
			noSingleLineBlocks: true,
		},
	],
	'jsdoc/no-bad-blocks': 2,
	'jsdoc/no-defaults': 2,
	'jsdoc/no-multi-asterisks': 2,
	'jsdoc/no-undefined-types': 2,
	'jsdoc/require-asterisk-prefix': 2,
	'jsdoc/require-param-name': 2,
	'jsdoc/require-property': 2,
	'jsdoc/require-property-description': 2,
	'jsdoc/require-property-name': 2,
	'jsdoc/require-property-type': 2,
	'jsdoc/tag-lines': [2, 'never', { startLines: 1 }],
	'jsdoc/valid-types': 2,
};

const config: TSESLint.FlatConfig.ConfigArray = [
	{
		name: 'mahir/jsdoc',
		plugins: {
			jsdoc: eslintPluginJsdoc,
		},
		rules,
	},
];

export default config;
