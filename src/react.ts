import { defineConfig } from 'oxlint';

import { nativePlugins, packagePlugin } from './config.js';
import jsx from './jsx.js';

import type { OxlintConfig } from 'oxlint';

const rules: NonNullable<OxlintConfig['rules']> = {
	'react/exhaustive-deps': 2,
	'react/rules-of-hooks': 2,
	'react/immutability': 2,
	'react/purity': 2,
	'react/refs': 2,
	'react/set-state-in-render': 2,
	'react-js/boolean-prop-naming': 2,
	'react/button-has-type': 2,
	'react/hook-use-state': 2,
	'react/iframe-missing-sandbox': 2,
	'react-js/no-access-state-in-setstate': 2,
	'react-js/no-arrow-function-lifecycle': 2,
	'react/no-children-prop': 2,
	'react/no-danger': 2,
	'react/no-danger-with-children': 2,
	'react-js/no-deprecated': 2,
	'react/no-did-mount-set-state': 2,
	'react/no-did-update-set-state': 2,
	'react/no-direct-mutation-state': 2,
	'react/no-find-dom-node': 2,
	'react-js/no-invalid-html-attribute': 2,
	'react/no-is-mounted': 2,
	'react/no-namespace': 2,
	'react/no-redundant-should-component-update': 2,
	'react/no-render-return-value': 2,
	'react/no-set-state': 2,
	'react/no-string-refs': 2,
	'react/no-this-in-sfc': 2,
	'react-js/no-typos': 2,
	'react/no-unknown-property': 2,
	'react/no-unsafe': 2,
	'react/no-unstable-nested-components': 2,
	'react-js/no-unused-class-component-methods': 2,
	'react-js/no-unused-state': 2,
	'react/no-will-update-set-state': 2,
	'react/prefer-es6-class': 2,
	'react-js/prefer-read-only-props': 2,
	'react-js/prefer-stateless-function': [
		2,
		{
			ignorePureComponents: true,
		},
	],
	'react/require-render-return': 2,
	'react-js/sort-comp': 2,
	'react/state-in-constructor': [2, 'always'],
	'react-js/static-property-placement': 2,
	'react/void-dom-elements-no-children': 2,
};

const config = defineConfig({
	extends: [jsx],
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
