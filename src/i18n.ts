import { defineConfig } from 'oxlint';

import { localPlugin, nativePlugins } from './config.js';

const config = defineConfig({
	plugins: nativePlugins,
	jsPlugins: [localPlugin('mahir-i18n', './plugins/i18n.js')],
	rules: {
		'mahir-i18n/static-t-arguments': 2,
		'mahir-i18n/no-t-as-parameter': 2,
	},
});

export default config;
