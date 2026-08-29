import { readFile, readdir } from 'node:fs/promises';
import { basename, join } from 'node:path';

import { describe, expect, test } from 'bun:test';

import { runOxfmt, runOxlint, withOxfmtProject, withOxlintProject } from './test-support/cli.js';

const fixturesDirectory = join(import.meta.dir, 'fixtures');
const cases = [
	{ category: 'common', file: 'common.js', configs: ['common'] },
	{ category: 'ts', file: 'typescript.ts', configs: ['common', 'node', 'typescript'] },
	{ category: 'lib', file: 'library.ts', configs: ['common', 'node', 'typescript', 'module', 'tsdoc'] },
	{ category: 'all', file: 'base-module-first.ts', configs: ['common', 'node', 'module', 'typescript'] },
	{ category: 'all', file: 'base-typescript-first.ts', configs: ['common', 'node', 'typescript', 'module'] },
	{
		category: 'all',
		file: 'next.tsx',
		configs: ['common', 'node', 'typescript', 'module', 'react', 'next', 'edge'],
	},
	{
		category: 'all',
		file: 'next-full.tsx',
		configs: ['common', 'node', 'typescript', 'module', 'react', 'next', 'edge', 'tailwind', 'i18n', 'api-error'],
	},
	{
		category: 'all',
		file: 'native.tsx',
		configs: [
			'common',
			'node',
			'typescript',
			'react',
			'native',
			'edge',
			'tailwind',
			'native-tailwind',
			'central-icons',
			'api-error',
		],
	},
	{ category: 'all', file: 'nest.ts', configs: ['common', 'node', 'typescript', 'module', 'nest'] },
] as const;
const formatCases = [{ category: 'all', file: 'document.mdx' }] as const;

function assertSucceeded(result: { exitCode: number; stderr: string; stdout: string }) {
	if (result.exitCode !== 0) throw new Error(result.stderr || result.stdout);
}

for (const category of ['common', 'ts', 'lib', 'all']) {
	describe(category, () => {
		const inputDirectory = join(fixturesDirectory, 'input', category);
		const outputDirectory = join(fixturesDirectory, 'output', category);
		const categoryCases = cases.filter((testCase) => testCase.category === category);
		const categoryFormatCases = formatCases.filter((testCase) => testCase.category === category);

		for (const testCase of categoryCases) {
			test(testCase.file, async () => {
				const inputPath = join(inputDirectory, testCase.file);
				const outputPath = join(outputDirectory, testCase.file);
				await withOxlintProject(inputPath, testCase.file, [...testCase.configs], async (project) => {
					const result = await runOxlint(project, category !== 'common');
					assertSucceeded(result);
					expect(await readFile(project.file, 'utf8')).toBe(await readFile(outputPath, 'utf8'));
				});
			});
		}

		for (const testCase of categoryFormatCases) {
			test(`${testCase.file} formatting`, async () => {
				const inputPath = join(inputDirectory, testCase.file);
				const outputPath = join(outputDirectory, testCase.file);
				await withOxfmtProject(inputPath, testCase.file, async (project) => {
					const result = await runOxfmt(project);
					assertSucceeded(result);
					expect(await readFile(project.file, 'utf8')).toBe(await readFile(outputPath, 'utf8'));
				});
			});
		}

		test('has no stale outputs', async () => {
			const inputFiles = (await readdir(inputDirectory)).sort((first, second) => first.localeCompare(second));
			const outputFiles = (await readdir(outputDirectory)).sort((first, second) => first.localeCompare(second));
			const fixtureFiles = [...categoryCases, ...categoryFormatCases]
				.map(({ file }) => file)
				.sort((first, second) => first.localeCompare(second));

			expect(inputFiles.map((file) => basename(file))).toEqual(fixtureFiles);
			expect(outputFiles).toEqual(fixtureFiles);
		});
	});
}
