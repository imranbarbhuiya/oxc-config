import { defineConfig } from 'oxlint';

import { localPlugin, nativePlugins } from './config.js';

const config = defineConfig({
	plugins: nativePlugins,
	jsPlugins: [localPlugin('mahir-central-icons', './plugins/central-icons.js')],
	rules: {
		'mahir-central-icons/no-central-icons-barrel-import': 2,
	},
});

export default config;
