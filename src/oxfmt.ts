import { defineConfig } from 'oxfmt';

export default defineConfig({
	printWidth: 120,
	useTabs: true,
	singleQuote: true,
	quoteProps: 'as-needed',
	trailingComma: 'all',
	endOfLine: 'lf',
	ignorePatterns: ['tests/fixtures/**'],
});
