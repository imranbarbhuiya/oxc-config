import { defineConfig } from 'oxlint';

import { nativePlugins } from './config.js';
import react from './react.js';

const config = defineConfig({
	extends: [react],
	plugins: nativePlugins,
	globals: {
		console: 'readonly',
		exports: 'readonly',
		global: 'readonly',
		module: 'readonly',
		require: 'readonly',
		__DEV__: 'readonly',
		Atomics: 'readonly',
		ErrorUtils: 'readonly',
		FormData: 'readonly',
		SharedArrayBuffer: 'readonly',
		XMLHttpRequest: 'readonly',
		alert: 'readonly',
		cancelAnimationFrame: 'readonly',
		cancelIdleCallback: 'readonly',
		clearImmediate: 'readonly',
		clearInterval: 'readonly',
		clearTimeout: 'readonly',
		fetch: 'readonly',
		navigator: 'readonly',
		process: 'readonly',
		requestAnimationFrame: 'readonly',
		requestIdleCallback: 'readonly',
		setImmediate: 'readonly',
		setInterval: 'readonly',
		setTimeout: 'readonly',
		window: 'readonly',
	},
	overrides: [
		{
			files: ['**/*.web.*'],
			env: {
				browser: true,
			},
		},
	],
});

export default config;
