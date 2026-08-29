import { defineConfig } from 'oxlint';

import { localPlugin, nativePlugins } from './config.js';

import type { OxlintConfig } from 'oxlint';

const rules: NonNullable<OxlintConfig['rules']> = {
	'mahir-nest/sort-module-metadata-arrays': 2,
};

const config = defineConfig({
	plugins: nativePlugins,
	jsPlugins: [localPlugin('mahir-nest', './plugins/nest.js')],
	rules,
});

export default config;
