import { defineConfig } from 'oxlint';

import { localPlugin, nativePlugins } from './config.js';

const config = defineConfig({
	plugins: nativePlugins,
	jsPlugins: [localPlugin('mahir-effect', './plugins/effect.js')],
	rules: {
		'mahir-effect/types-only-imports': 2,
		// UIs spread decoded `Schema.Class` values into plain objects on purpose.
		'typescript/no-misused-spread': 0,
	},
});

export default config;
