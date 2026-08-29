import { readdir } from 'node:fs/promises';
import { basename, join } from 'node:path';
import process from 'node:process';

import { describe, expect, test } from 'bun:test';
import { ESLint } from 'eslint-v9';

import apiError from '../dist/api-error.js';
import centralIcons from '../dist/central-icons.js';
import common from '../dist/common.js';
import edge from '../dist/edge.js';
import i18n from '../dist/i18n.js';
import mdx from '../dist/mdx.js';
import module from '../dist/module.js';
import nativeTailwind from '../dist/native-tailwind.js';
import native from '../dist/native.js';
import nest from '../dist/nest.js';
import next from '../dist/next.js';
import node from '../dist/node.js';
import react from '../dist/react.js';
import tailwind from '../dist/tailwind.js';
import tsdoc from '../dist/tsdoc.js';
import typescript from '../dist/typescript.js';

import type { Linter } from 'eslint-v9';

const fixturesDirectory = join(import.meta.dir, 'fixtures');
const cases = [
	{ category: 'common', file: 'common.js', config: common },
	{ category: 'ts', file: 'typescript.ts', config: [...common, ...node, ...typescript] },
	{ category: 'lib', file: 'library.ts', config: [...common, ...node, ...typescript, ...module, ...tsdoc] },
	{ category: 'all', file: 'base-module-first.ts', config: [...common, ...node, ...module, ...typescript] },
	{ category: 'all', file: 'base-typescript-first.ts', config: [...common, ...node, ...typescript, ...module] },
	{
		category: 'all',
		file: 'next.tsx',
		config: [...common, ...node, ...typescript, ...module, ...react, ...next, ...edge],
	},
	{
		category: 'all',
		file: 'next-full.tsx',
		config: [
			...common,
			...node,
			...typescript,
			...module,
			...react,
			...next,
			...edge,
			...tailwind,
			...i18n,
			...apiError,
		],
	},
	{
		category: 'all',
		file: 'native.tsx',
		config: [
			...common,
			...node,
			...typescript,
			...react,
			...native,
			...edge,
			...tailwind,
			...nativeTailwind,
			...centralIcons,
			...apiError,
		],
	},
	{ category: 'all', file: 'nest.ts', config: [...common, ...node, ...typescript, ...module, ...nest] },
	{
		category: 'all',
		file: 'document.mdx',
		config: [
			...common,
			...node,
			...module,
			...react,
			...next,
			...edge,
			...mdx.map((config) => ({ files: ['**/*.mdx'], ...config })),
			...typescript.map((config) => ({ files: ['**/*.{tsx,ts,cjs,jsx,js}'], ...config })),
		],
		expectedMessages: [
			{
				message: 'Empty files are not allowed.',
				ruleId: 'unicorn/no-empty-file',
				severity: 2,
			},
		],
	},
] as const;
const updateFixtures = process.env.UPDATE_FIXTURES === '1';

for (const category of ['common', 'ts', 'lib', 'all']) {
	describe(category, () => {
		const inputDirectory = join(fixturesDirectory, 'input', category);
		const outputDirectory = join(fixturesDirectory, 'output', category);
		const categoryCases = cases.filter((testCase) => testCase.category === category);

		for (const testCase of categoryCases) {
			test(testCase.file, async () => {
				const inputPath = join(inputDirectory, testCase.file);
				const outputPath = join(outputDirectory, testCase.file);
				const input = await Bun.file(inputPath).text();
				const eslint = new ESLint({
					fix: true,
					overrideConfig: testCase.config as unknown as Linter.Config[],
					overrideConfigFile: true,
				});
				const [result] = await eslint.lintText(input, {
					filePath: inputPath,
				});
				const actual = result.output ?? input;

				if (updateFixtures) await Bun.write(outputPath, actual);
				else expect(actual).toBe(await Bun.file(outputPath).text());

				expect(
					result.messages.map(({ message, ruleId, severity }) => ({
						message,
						ruleId,
						severity,
					})),
				).toEqual('expectedMessages' in testCase ? [...testCase.expectedMessages] : []);
			});
		}

		test('has no stale outputs', async () => {
			const inputFiles = (await readdir(inputDirectory)).sort((first, second) => first.localeCompare(second));
			const outputFiles = (await readdir(outputDirectory)).sort((first, second) => first.localeCompare(second));
			const fixtureFiles = categoryCases
				.map((testCase) => testCase.file)
				.sort((first, second) => first.localeCompare(second));

			expect(inputFiles.map((file) => basename(file))).toEqual(fixtureFiles);
			expect(outputFiles).toEqual(fixtureFiles);
		});
	});
}
