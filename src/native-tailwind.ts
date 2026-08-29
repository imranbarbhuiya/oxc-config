import { defineConfig } from 'oxlint';

import { localPlugin, nativePlugins } from './config.js';

const config = defineConfig({
	plugins: nativePlugins,
	jsPlugins: [localPlugin('mahir-native-tailwind', './plugins/native-tailwind.js')],
	rules: {
		'mahir-native-tailwind/class-name-rules': 2,
	},
});

export default config;
