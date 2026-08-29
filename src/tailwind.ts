import { defineConfig } from 'oxlint';

import { nativePlugins, packagePlugin } from './config.js';

const config = defineConfig({
	plugins: nativePlugins,
	jsPlugins: [packagePlugin('tailwindcss', 'oxlint-tailwindcss')],
	settings: {
		tailwindcss: {
			entryPoint: 'app/globals.css',
		},
	},
	rules: {
		'tailwindcss/enforce-sort-order': 'warn',
		'tailwindcss/no-unnecessary-whitespace': 'warn',
		'tailwindcss/enforce-canonical': 'warn',
	},
});

export default config;
