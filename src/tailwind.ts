import { defineConfig } from 'oxlint';

import { nativePlugins, packagePlugin } from './config.js';

const config = defineConfig({
	plugins: nativePlugins,
	jsPlugins: [packagePlugin('better-tailwindcss-js', 'eslint-plugin-better-tailwindcss')],
	settings: {
		'better-tailwindcss': {
			entryPoint: 'app/globals.css',
		},
	},
	rules: {
		'better-tailwindcss-js/enforce-consistent-class-order': 'warn',
		'better-tailwindcss-js/no-unnecessary-whitespace': 'warn',
		'better-tailwindcss-js/enforce-canonical-classes': 'warn',
		'better-tailwindcss-js/no-unknown-classes': 'error',
	},
});

export default config;
