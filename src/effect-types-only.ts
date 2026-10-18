import { defineConfig } from 'oxlint';

import { localPlugin, nativePlugins } from './config.js';

const config = defineConfig({
	plugins: nativePlugins,
	jsPlugins: [localPlugin('mahir-effect', './plugins/effect.js')],
	rules: {
		'mahir-effect/types-only-imports': 2,
	},
});

export default config;
