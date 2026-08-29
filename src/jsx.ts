import { defineConfig } from 'oxlint';

import { nativePlugins, packagePlugin } from './config.js';

import type { OxlintConfig } from 'oxlint';

const rules: NonNullable<OxlintConfig['rules']> = {
	'react/jsx-boolean-value': 0,
	'react-js/jsx-boolean-value': [2, 'never'],
	'react-js/jsx-closing-bracket-location': [2, 'line-aligned'],
	'react-js/jsx-closing-tag-location': 2,
	'react/jsx-curly-brace-presence': 0,
	'react-js/jsx-curly-brace-presence': [
		2,
		{
			children: 'never',
			props: 'never',
		},
	],
	'react-js/jsx-equals-spacing': [2, 'never'],
	'react-js/jsx-first-prop-new-line': [2, 'multiline-multiprop'],
	'react/jsx-fragments': [2, 'syntax'],
	'react/jsx-key': [
		2,
		{
			checkFragmentShorthand: true,
			checkKeyMustBeforeSpread: true,
			warnOnDuplicates: false,
		},
	],
	'react-js/jsx-max-props-per-line': [
		2,
		{
			maximum: 3,
			when: 'multiline',
		},
	],
	'react-js/jsx-newline': [
		2,
		{
			prevent: true,
		},
	],
	'react-js/jsx-no-bind': [
		2,
		{
			allowArrowFunctions: true,
			allowBind: false,
			ignoreRefs: true,
		},
	],
	'react/jsx-no-comment-textnodes': 2,
	'react/jsx-no-constructed-context-values': 2,
	'react/jsx-no-duplicate-props': 2,
	'react/jsx-no-script-url': 2,
	'react/jsx-no-undef': 2,
	'react/jsx-no-useless-fragment': [
		2,
		{
			allowExpressions: true,
		},
	],
	'react/jsx-pascal-case': [
		2,
		{
			ignore: ['h{}', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'ul', 'ol', 'li', 'img', 'div', 'span', 'dl', 'dt', 'dd'],
		},
	],
	'react-js/jsx-sort-props': 2,
	'react-js/jsx-tag-spacing': [
		2,
		{
			afterOpening: 'never',
			beforeSelfClosing: 'always',
			closingSlash: 'never',
		},
	],
	'react-js/jsx-uses-react': 2,
	'react-js/jsx-uses-vars': 2,
	'react-js/sort-default-props': 2,
	'unicorn/consistent-function-scoping': 0,
};

const config = defineConfig({
	plugins: nativePlugins,
	jsPlugins: [packagePlugin('react-js', 'eslint-plugin-react')],
	rules,
});

export default config;
