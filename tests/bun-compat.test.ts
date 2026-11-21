import { describe, expect, test } from 'bun:test';
import { mkdtemp, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { checkBunSupport, compareWithOxc, hasBunLint } from '../src/cli/bun.js';

const repositoryDirectory = resolve(import.meta.dir, '..');
// Every fragment bun lint can run. jsdoc and tsdoc use native jsdoc rules, which bun lint does not have,
// and effect-tsgo needs an Oxlint patched by @effect/tsgo.
const fragments = [
	'common',
	'node',
	'module',
	'typescript',
	'react',
	'native',
	'next',
	'edge',
	'tailwind',
	'i18n',
	'native-tailwind',
	'central-icons',
	'api-error',
	'effect',
	'effect-types-only',
	'unistyles',
	'nest',
];
const bunLintAvailable = await hasBunLint(repositoryDirectory);

async function withProject(
	files: Record<string, string>,
	configs: string[],
	run: (directory: string) => Promise<void>,
) {
	const directory = await mkdtemp(join(tmpdir(), 'oxc-config-bun-'));
	try {
		await symlink(join(repositoryDirectory, 'node_modules'), join(directory, 'node_modules'));
		await Bun.write(join(directory, '.gitignore'), 'node_modules\n');
		// Only src: the symlinked node_modules would otherwise be part of the program.
		await Bun.write(
			join(directory, 'tsconfig.json'),
			'{"compilerOptions":{"jsx":"preserve","noEmit":true,"strict":true,"target":"esnext"},"include":["src"]}\n',
		);
		const imports = configs.map(
			(name, index) =>
				`import config${index} from ${JSON.stringify(pathToFileURL(join(repositoryDirectory, 'dist', `${name}.js`)).href)};`,
		);
		const extended = configs.map((_, index) => `config${index}`).join(', ');
		await Bun.write(
			join(directory, 'oxlint.config.ts'),
			`${imports.join('\n')}\nexport default { extends: [${extended}], options: { typeAware: true } };\n`,
		);
		await Bun.write(
			join(directory, 'oxfmt.config.ts'),
			`export { default } from ${JSON.stringify(pathToFileURL(join(repositoryDirectory, 'dist/oxfmt.js')).href)};\n`,
		);
		await Bun.write(
			join(directory, 'package.json'),
			'{"name":"oxc-config-bun-test","private":true,"type":"module","dependencies":{"react":"*","next":"*","react-native":"*"}}\n',
		);
		for (const [name, content] of Object.entries(files)) await Bun.write(join(directory, name), content);
		await run(directory);
	} finally {
		await rm(directory, { force: true, recursive: true });
	}
}

describe.skipIf(!bunLintAvailable)('bun lint and bun fmt', () => {
	test(
		'support every rule and option of the fragments',
		async () => {
			await withProject({ 'src/index.ts': 'export const value = 1;\n' }, fragments, async (directory) => {
				expect(await checkBunSupport(directory)).toEqual([]);
			});
		},
		{ timeout: 60_000 },
	);

	test(
		'report what oxlint and oxfmt report',
		async () => {
			const source = await Bun.file(join(repositoryDirectory, 'tests/fixtures/input/ts/typescript.ts')).text();
			await withProject({ 'src/index.ts': source }, ['common', 'node', 'module', 'typescript'], async (directory) => {
				expect(await compareWithOxc(directory)).toEqual([]);
			});
		},
		{ timeout: 60_000 },
	);
});
