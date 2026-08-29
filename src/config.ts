import { fileURLToPath, URL } from 'node:url';

import type { ExternalPluginEntry, OxlintConfig } from 'oxlint';

export const nativePlugins: NonNullable<OxlintConfig['plugins']> = [
	'eslint',
	'typescript',
	'unicorn',
	'oxc',
	'import',
	'jsdoc',
	'react',
	'nextjs',
	'promise',
	'node',
];

export function packagePlugin(name: string, specifier: string): ExternalPluginEntry {
	return { name, specifier: fileURLToPath(import.meta.resolve(specifier)) };
}

export function localPlugin(name: string, path: string): ExternalPluginEntry {
	return { name, specifier: fileURLToPath(new URL(path, import.meta.url)) };
}
