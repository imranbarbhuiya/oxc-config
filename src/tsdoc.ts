import { defineConfig } from 'oxlint';

import { nativePlugins, packagePlugin } from './config.js';
import jsdoc from './jsdoc.js';

import type { OxlintConfig } from 'oxlint';

const rules: NonNullable<OxlintConfig['rules']> = {
	'jsdoc/check-tag-names': 0,
	'jsdoc/require-property-type': 0,
	'jsdoc-js/no-undefined-types': 0,
	'tsdoc-js/syntax': 1,
};

const config = defineConfig({
	extends: [jsdoc],
	plugins: nativePlugins,
	jsPlugins: [packagePlugin('tsdoc-js', 'eslint-plugin-tsdoc')],
	rules,
	settings: {
		jsdoc: {
			mode: 'typescript',
		},
	},
});

export default config;
