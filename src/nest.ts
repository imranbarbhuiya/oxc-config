import { defineConfig } from 'oxlint';

import { localPlugin, nativePlugins } from './config.js';

import type { OxlintConfig } from 'oxlint';

const rules: NonNullable<OxlintConfig['rules']> = {
	'nestjs-typed/sort-module-metadata-arrays': 2,
};

const config = defineConfig({
	plugins: nativePlugins,
	jsPlugins: [localPlugin('nestjs-typed', './plugins/nest.js')],
	rules,
});

export default config;
