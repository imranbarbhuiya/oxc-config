import { defineConfig } from 'oxlint';

import { nativePlugins, packagePlugin } from './config.js';

import type { OxlintConfig } from 'oxlint';

const rules: NonNullable<OxlintConfig['rules']> = {
	'react/exhaustive-deps': 2,
	'react/rules-of-hooks': 2,
	'react/immutability': 2,
	'react/purity': 2,
	'react/refs': 2,
	'react/set-state-in-render': 2,
	'react/button-has-type': 2,
	'react/hook-use-state': 2,
	'react/iframe-missing-sandbox': 2,
	'react/jsx-boolean-value': [2, 'never'],
	'react/jsx-curly-brace-presence': [
		2,
		{
			children: 'never',
			props: 'never',
		},
	],
	'react/jsx-fragments': [2, 'syntax'],
	'react/jsx-key': [
		2,
		{
			checkFragmentShorthand: true,
			checkKeyMustBeforeSpread: true,
			warnOnDuplicates: false,
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
	'react/no-children-prop': 2,
	'react/no-danger': 2,
	'react/no-danger-with-children': 2,
	'react/no-find-dom-node': 2,
	'react/no-namespace': 2,
	'react/no-render-return-value': 2,
	'react/no-unknown-property': 2,
	'react/no-unstable-nested-components': 2,
	'react/void-dom-elements-no-children': 2,
	'react-js/boolean-prop-naming': 2,
	'react-js/jsx-closing-bracket-location': [2, 'line-aligned'],
	'react-js/jsx-closing-tag-location': 2,
	'react-js/jsx-equals-spacing': [2, 'never'],
	'react-js/jsx-first-prop-new-line': [2, 'multiline-multiprop'],
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
	'react-js/jsx-sort-props': 2,
	'react-js/jsx-tag-spacing': [
		2,
		{
			afterOpening: 'never',
			beforeSelfClosing: 'always',
			closingSlash: 'never',
		},
	],
	'react-js/no-deprecated': 2,
	'react-js/no-invalid-html-attribute': 2,
	'react-js/prefer-read-only-props': 2,
	'unicorn/consistent-function-scoping': 0,
};

const config = defineConfig({
	plugins: nativePlugins,
	jsPlugins: [packagePlugin('react-js', 'eslint-plugin-react')],
	env: {
		browser: true,
		serviceworker: true,
	},
	settings: {
		react: {
			version: '19.0.0',
		},
	},
	rules,
});

export default config;
