import { describe, expect, test } from 'bun:test';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { runOxfmt, runOxlint, withOxfmtProject, withOxlintProject } from './test-support/cli.js';

const fixturesDirectory = join(import.meta.dir, 'fixtures/focused');

interface Diagnostic {
	code: string;
	message: string;
}

function diagnostics(stdout: string): Diagnostic[] {
	return (JSON.parse(stdout) as { diagnostics: Diagnostic[] }).diagnostics;
}

function expectRule(stdout: string, rule: string) {
	expect(diagnostics(stdout).some(({ code }) => code.includes(rule))).toBeTrue();
}

describe('custom configs', () => {
	test('central-icons fixes barrel imports', async () => {
		await withOxlintProject(
			join(fixturesDirectory, 'central-icons.ts'),
			'central-icons.ts',
			['central-icons'],
			async (project) => {
				const result = await runOxlint(project);
				expect(result.exitCode).toBe(0);
				expect(await readFile(project.file, 'utf8')).toBe(
					"import AddIcon from '@central-icons-react/round-filled/AddIcon';\nimport RemoveIcon from '@central-icons-react/round-filled/RemoveIcon';\n\nexport { AddIcon, RemoveIcon };\n",
				);
			},
		);
	});

	test('i18n rejects dynamic keys and passed translators', async () => {
		await withOxlintProject(join(fixturesDirectory, 'i18n.ts'), 'i18n.ts', ['i18n'], async (project) => {
			const result = await runOxlint(project);
			expect(result.exitCode).toBe(1);
			expectRule(result.stdout, 'static-t-arguments');
			expectRule(result.stdout, 'no-t-as-parameter');
		});
	});

	test('api-error rejects plain errors in query functions', async () => {
		await withOxlintProject(join(fixturesDirectory, 'api-error.ts'), 'api-error.ts', ['api-error'], async (project) => {
			const result = await runOxlint(project);
			expect(result.exitCode).toBe(1);
			expectRule(result.stdout, 'require-api-error');
		});
	});

	test('native-tailwind removes redundant flex direction', async () => {
		await withOxlintProject(
			join(fixturesDirectory, 'native-tailwind.tsx'),
			'native-tailwind.tsx',
			['native-tailwind'],
			async (project) => {
				const result = await runOxlint(project);
				expect(result.exitCode).toBe(0);
				expect(await readFile(project.file, 'utf8')).toBe(
					'function Stack() {\n\treturn <div className="items-center" />;\n}\n\nexport { Stack };\n',
				);
			},
		);
	});

	test('nest sorts module metadata arrays', async () => {
		await withOxlintProject(join(fixturesDirectory, 'nest.ts'), 'nest.ts', ['nest'], async (project) => {
			const result = await runOxlint(project);
			expect(result.exitCode).toBe(0);
			expect(await readFile(project.file, 'utf8')).toContain('imports: [AlphaModule, MidModule, ZuluModule]');
			expect(await readFile(project.file, 'utf8')).toContain('providers: [AlphaService, MidService, ZuluService]');
		});
	});

	test('typescript does not flag type-provided globals as undef', async () => {
		await withOxlintProject(
			join(fixturesDirectory, 'tsdoc.ts'),
			'typescript-globals.ts',
			['typescript'],
			async (project) => {
				await Bun.write(
					project.file,
					"describe('globals', () => {\n\ttest('jest', () => {\n\t\texpect(1).toBe(1);\n\t});\n});\n",
				);
				const result = await runOxlint(project);
				expect(diagnostics(result.stdout).every(({ code }) => !code.includes('no-undef'))).toBeTrue();
			},
		);
	});

	test('tsdoc reports invalid parameter syntax', async () => {
		await withOxlintProject(join(fixturesDirectory, 'tsdoc.ts'), 'tsdoc.ts', ['tsdoc'], async (project) => {
			const result = await runOxlint(project);
			expect(result.exitCode).toBe(0);
			expectRule(result.stdout, 'syntax');
		});
	});

	test('oxfmt sorts imports with aliases before relatives and types last', async () => {
		const expected = [
			'// @ts-nocheck',
			'',
			"import path from 'node:path';",
			'',
			"import { Platform } from 'react-native';",
			"import { z } from 'zod';",
			'',
			"import { Input } from '@/components/ui/Input';",
			"import { XP_IDS } from '@/utils/xpTaskIds';",
			'',
			"import { Footer } from './CollegeTaskFooter';",
			"import { type FormProps } from './submission';",
			"import { alertErrors } from './submission';",
			"import { TaskIntroCard } from './TaskIntroCard';",
			"import { COLLEGE_META } from './taskMeta';",
			'',
			"import { parentHelper } from '../helpers';",
			'',
			"import type { ParentType } from '../types';",
			"import type { SubmitFields } from './submitTask';",
			"import type { Theme } from '@/utils/theme';",
			'',
			'export function run(props: FormProps, theme: Theme, fields: SubmitFields, extra: ParentType) {',
			'\treturn [',
			'\t\tpath,',
			'\t\tPlatform,',
			'\t\tz,',
			'\t\tInput,',
			'\t\tXP_IDS,',
			'\t\tFooter,',
			'\t\talertErrors,',
			'\t\tTaskIntroCard,',
			'\t\tCOLLEGE_META,',
			'\t\tparentHelper,',
			'\t\tprops,',
			'\t\ttheme,',
			'\t\tfields,',
			'\t\textra,',
			'\t];',
			'}',
			'',
		].join('\n');

		await withOxfmtProject(join(fixturesDirectory, 'import-order.ts'), 'import-order.ts', async (project) => {
			const first = await runOxfmt(project);
			expect(first.exitCode).toBe(0);
			expect(await readFile(project.file, 'utf8')).toBe(expected);
			const second = await runOxfmt(project);
			expect(second.exitCode).toBe(0);
			expect(await readFile(project.file, 'utf8')).toBe(expected);
		});

		await withOxlintProject(
			join(fixturesDirectory, 'import-order.ts'),
			'import-order.ts',
			['common'],
			async (project) => {
				await Bun.write(project.file, expected);
				const result = await runOxlint(project);
				expect(
					diagnostics(result.stdout).every(
						({ code }) => !code.includes('import-js/order') && !code.includes('import/order'),
					),
				).toBeTrue();
				expect(await readFile(project.file, 'utf8')).toBe(expected);
			},
		);
	});

	test('arrow-body-style collapses as-needed returns and keeps other blocks', async () => {
		await withOxlintProject(join(fixturesDirectory, 'arrow-body.ts'), 'arrow-body.ts', ['common'], async (project) => {
			const result = await runOxlint(project);
			expect(result.exitCode).toBe(0);
			expect(diagnostics(result.stdout).every(({ code }) => !code.includes('eslint-js/arrow-body-style'))).toBeTrue();
			const source = await readFile(project.file, 'utf8');
			expect(source).toMatch(/export const add = \(left: number, right: number\) =>\s+left \+ right\s*;/);
			expect(source).toContain('export const run = () => {');
			expect(source).toContain('return 1;');
		});
	});

	test('no-array-for-each reports forEach the same as the old unicorn-js rule', async () => {
		await withOxlintProject(join(fixturesDirectory, 'for-each.ts'), 'for-each.ts', ['common'], async (project) => {
			const result = await runOxlint(project);
			expectRule(result.stdout, 'no-array-for-each');
			expect(diagnostics(result.stdout).every(({ code }) => !code.includes('unicorn-js/no-for-each'))).toBeTrue();
			expect(await readFile(project.file, 'utf8')).toContain('.forEach(');
		});
	});

	test('restricted-syntax flags _id and z.date selectors', async () => {
		await withOxlintProject(
			join(fixturesDirectory, 'restricted-syntax.ts'),
			'restricted-syntax.ts',
			['common'],
			async (project) => {
				const result = await runOxlint(project);
				expect(result.exitCode).toBe(1);
				expectRule(result.stdout, 'no-restricted-syntax');
				const messages = diagnostics(result.stdout).map(({ message }) => message);
				expect(messages.some((message) => message.includes('Do not use _id as a property'))).toBeTrue();
				expect(messages.some((message) => message.includes('Do not access ._id'))).toBeTrue();
				expect(messages.some((message) => message.includes('instead of z.date()'))).toBeTrue();
				expect(messages.some((message) => message.includes('instead of z.coerce.date() alone'))).toBeTrue();
			},
			{
				rules: {
					'mahir-restricted-syntax/no-restricted-syntax': [
						2,
						{ selector: "Property[key.name='_id']", message: 'Do not use _id as a property in objects.' },
						{ selector: "MemberExpression[property.name='_id']", message: 'Do not access ._id' },
						{
							selector: "CallExpression[callee.object.name='z'][callee.property.name='date']",
							message: 'Use z.coerce.date().meta({ type: "string", format: "date-time" }) instead of z.date()',
						},
						{
							selector:
								"CallExpression[callee.object.object.name='z'][callee.object.property.name='coerce'][callee.property.name='date']:not([parent.type='MemberExpression'][parent.property.name='meta'])",
							message:
								'Use z.coerce.date().meta({ type: "string", format: "date-time" }) instead of z.coerce.date() alone',
						},
					],
				},
			},
		);
	});

	test('node no-restricted-globals reports Buffer and process with node: messages', async () => {
		await withOxlintProject(
			join(fixturesDirectory, 'node-globals.ts'),
			'node-globals.ts',
			['node'],
			async (project) => {
				const result = await runOxlint(project);
				expect(result.exitCode).toBe(1);
				expectRule(result.stdout, 'no-restricted-globals');
				const messages = diagnostics(result.stdout).map(({ message }) => message);
				expect(messages.some((message) => message.includes('node:buffer'))).toBeTrue();
				expect(messages.some((message) => message.includes('node:process'))).toBeTrue();
			},
		);
	});

	test('tailwind fixes unnecessary class whitespace', async () => {
		await withOxlintProject(join(fixturesDirectory, 'tailwind.tsx'), 'tailwind.tsx', ['tailwind'], async (project) => {
			await mkdir(join(project.directory, 'app'), { recursive: true });
			await Bun.write(join(project.directory, 'app/globals.css'), '@import "tailwindcss";\n');
			const result = await runOxlint(project);
			expect(result.exitCode).toBe(0);
			expect(await readFile(project.file, 'utf8')).toContain('className="flex items-center"');
		});
	});
});
