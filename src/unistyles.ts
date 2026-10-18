import { defineConfig } from 'oxlint';

import { localPlugin, nativePlugins } from './config.js';

import type { OxlintConfig } from 'oxlint';

const rules: NonNullable<OxlintConfig['rules']> = {
	'mahir-unistyles/create-uses-theme': 1,
	'mahir-unistyles/no-inline-style-objects': 2,
	'mahir-unistyles/no-raw-colors': 2,
	'mahir-unistyles/stylesheet-import': 2,
};

const config = defineConfig({
	plugins: nativePlugins,
	jsPlugins: [localPlugin('mahir-unistyles', './plugins/unistyles.js')],
	rules,
});

export default config;
