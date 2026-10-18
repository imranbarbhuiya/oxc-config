import { defineConfig } from 'oxlint';

import { nativePlugins } from './config.js';

const message = 'UI uses generated OpenAPI types and openapi-fetch; import Effect types only.';

const config = defineConfig({
	plugins: nativePlugins,
	rules: {
		'no-restricted-imports': [
			2,
			{
				paths: [{ name: 'effect', message, allowTypeImports: true }],
				patterns: [{ group: ['effect/*', '@effect/*'], message, allowTypeImports: true }],
			},
		],
	},
});

export default config;
