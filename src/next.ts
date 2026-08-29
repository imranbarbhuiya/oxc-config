import { defineConfig } from 'oxlint';

import { nativePlugins } from './config.js';

import type { OxlintConfig } from 'oxlint';

const rules: NonNullable<OxlintConfig['rules']> = {
	'nextjs/google-font-display': 1,
	'nextjs/google-font-preconnect': 1,
	'nextjs/inline-script-id': 2,
	'nextjs/next-script-for-ga': 1,
	'nextjs/no-assign-module-variable': 2,
	'nextjs/no-before-interactive-script-outside-document': 2,
	'nextjs/no-css-tags': 1,
	'nextjs/no-document-import-in-page': 2,
	'nextjs/no-duplicate-head': 2,
	'nextjs/no-head-element': 1,
	'nextjs/no-head-import-in-document': 2,
	'nextjs/no-html-link-for-pages': 1,
	'nextjs/no-img-element': 1,
	'nextjs/no-page-custom-font': 1,
	'nextjs/no-script-component-in-head': 2,
	'nextjs/no-styled-jsx-in-document': 2,
	'nextjs/no-sync-scripts': 2,
	'nextjs/no-title-in-document-head': 2,
	'nextjs/no-typos': 2,
	'nextjs/no-unwanted-polyfillio': 2,
};

const config = defineConfig({
	plugins: nativePlugins,
	rules,
});

export default config;
