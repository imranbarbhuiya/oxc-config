import { defineConfig } from 'oxlint';

import { localPlugin, nativePlugins } from './config.js';

const config = defineConfig({
	plugins: nativePlugins,
	jsPlugins: [localPlugin('mahir-api-error', './plugins/api-error.js')],
	rules: {
		'mahir-api-error/require-api-error': 2,
	},
});

export default config;
