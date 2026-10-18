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

	test('react local plugin sorts props, drops jsx blank lines, and flags rel / mutable props', async () => {
		await withOxlintProject(join(fixturesDirectory, 'react.ts'), 'react.tsx', ['react'], async (project) => {
			const result = await runOxlint(project);
			expect(result.exitCode).toBe(1);
			expectRule(result.stdout, 'no-invalid-html-attribute');
			const source = await readFile(project.file, 'utf8');
			expect(source).toContain('readonly title: string');
			expect(source).toContain('<input name="q" value="x" />');
			expect(source).not.toContain('<input value="x" name="q" />');
			expect(source).not.toMatch(/<input[\s\S]*\n\n[\s\S]*<a /);
		});
	});

	test('react prefer-read-only-props does not leak components into later files', async () => {
		await withOxlintProject(join(fixturesDirectory, 'react.ts'), 'react.tsx', ['react'], async (project) => {
			const plain = join(project.directory, 'plain.ts');
			await Bun.write(plain, 'export const value = 1;\n');
			const result = await runOxlint(project, false, [project.file, plain], ['--threads', '1']);
			const leaked = (JSON.parse(result.stdout) as { diagnostics: { filename: string }[] }).diagnostics.filter(
				({ filename }) => filename.endsWith('plain.ts'),
			);
			expect(leaked).toEqual([]);
		});
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

const effectFixtures = join(import.meta.dir, 'fixtures/effect');
const unistylesFixtures = join(import.meta.dir, 'fixtures/unistyles');

function ruleLines(stdout: string, rule: string) {
	return (JSON.parse(stdout) as { diagnostics: (Diagnostic & { labels: { span: { line: number } }[] })[] }).diagnostics
		.filter(({ code }) => code.includes(rule))
		.map(({ labels }) => labels[0]?.span.line);
}

describe('effect', () => {
	test.each(['valid.ts', 'idioms.ts', 'idioms-resources.ts', 'idioms-sql.ts'])(
		'idiomatic Effect v4 code in %s has no diagnostics under common, typescript, node, module and effect',
		async (fixture) => {
			await withOxlintProject(
				join(effectFixtures, fixture),
				`src/${fixture}`,
				['common', 'typescript', 'node', 'module', 'effect'],
				async (project) => {
					const result = await runOxlint(project, true, [project.file], []);
					expect(diagnostics(result.stdout)).toEqual([]);
					expect(result.exitCode).toBe(0);
				},
			);
		},
	);

	test('value redeclarations are still reported with no-redeclare off', async () => {
		await withOxlintProject(
			join(effectFixtures, 'redeclare.ts'),
			'src/redeclare.ts',
			['common', 'typescript', 'node', 'module', 'effect'],
			async (project) => {
				const result = await runOxlint(project, true, [project.file], []);
				expect(result.exitCode).toBe(1);
				expect(
					diagnostics(result.stdout).some(({ message }) =>
						message.includes('Identifier `total` has already been declared'),
					),
				).toBeTrue();
			},
		);
	});

	test('no-gen-wrapper flags reusable functions that only return Effect.gen', async () => {
		await withOxlintProject(
			join(effectFixtures, 'no-gen-wrapper.ts'),
			'src/wrapper.ts',
			['effect'],
			async (project) => {
				const result = await runOxlint(project);
				expect(ruleLines(result.stdout, 'no-gen-wrapper')).toEqual([3, 8, 15]);
			},
		);
	});

	test('fn-name-matches fixes span names that do not match the binding', async () => {
		await withOxlintProject(join(effectFixtures, 'fn-name-matches.ts'), 'src/names.ts', ['effect'], async (project) => {
			const result = await runOxlint(project);
			expect(result.exitCode).toBe(0);
			const source = await readFile(project.file, 'utf8');
			expect(source).toContain("export const findUser = Effect.fn('findUser')");
			expect(source).toContain("query: Effect.fn('Database.query')");
			expect(source).toContain("Effect.fn('matching')");
			expect(source).toContain("Effect.fn('Service.qualified')");
		});
	});

	test('return-yield-error adds return before yielded errors', async () => {
		await withOxlintProject(
			join(effectFixtures, 'return-yield-error.ts'),
			'src/errors.ts',
			['effect'],
			async (project) => {
				const result = await runOxlint(project);
				expect(result.exitCode).toBe(0);
				const source = await readFile(project.file, 'utf8');
				expect(source).toContain('return yield* new NotFound({ id });');
				expect(source).toContain('return yield* Effect.fail(new NotFound({ id }));');
				expect(source).toContain('\tyield* Effect.log(id);');
			},
		);
	});

	test('no-pipe-on-fn flags .pipe on Effect.fn and Effect.fnUntraced', async () => {
		await withOxlintProject(join(effectFixtures, 'no-pipe-on-fn.ts'), 'src/pipe.ts', ['effect'], async (project) => {
			const result = await runOxlint(project);
			expect(ruleLines(result.stdout, 'no-pipe-on-fn')).toEqual([5, 9]);
		});
	});

	test('no-throw-in-gen flags throw directly inside Effect generators only', async () => {
		await withOxlintProject(join(effectFixtures, 'no-throw-in-gen.ts'), 'src/throw.ts', ['effect'], async (project) => {
			const result = await runOxlint(project);
			expect(ruleLines(result.stdout, 'no-throw-in-gen')).toEqual([5, 9]);
		});
	});

	test('no-run-outside-edge flags Effect.run* outside entrypoints, tests and scripts', async () => {
		const source = join(effectFixtures, 'no-run-outside-edge.ts');
		await withOxlintProject(source, 'src/service.ts', ['effect'], async (project) => {
			const result = await runOxlint(project);
			expect(ruleLines(result.stdout, 'no-run-outside-edge')).toEqual([5, 6, 7]);
		});
		for (const file of ['src/main.ts', 'src/service.test.ts', 'scripts/seed.ts']) {
			await withOxlintProject(source, file, ['effect'], async (project) => {
				const result = await runOxlint(project);
				expect(ruleLines(result.stdout, 'no-run-outside-edge')).toEqual([]);
			});
		}
		await withOxlintProject(
			source,
			'src/main.ts',
			['effect'],
			async (project) => {
				const result = await runOxlint(project);
				expect(ruleLines(result.stdout, 'no-run-outside-edge')).toEqual([5, 6, 7]);
			},
			{ rules: { 'mahir-effect/no-run-outside-edge': [2, { allow: ['**/bin/**'] }] } },
		);
	});

	test('no-unsafe-sql flags non-constant text in sql.unsafe and sql.literal', async () => {
		const source = join(effectFixtures, 'no-unsafe-sql.ts');
		await withOxlintProject(source, 'src/repo.ts', ['effect'], async (project) => {
			const result = await runOxlint(project);
			expect(result.exitCode).toBe(1);
			expect(ruleLines(result.stdout, 'no-unsafe-sql')).toEqual([6, 7, 8, 9, 11, 22]);
		});
		await withOxlintProject(
			source,
			'src/repo.ts',
			['effect'],
			async (project) => {
				const result = await runOxlint(project);
				expect(ruleLines(result.stdout, 'no-unsafe-sql')).toEqual([31]);
			},
			{ rules: { 'mahir-effect/no-unsafe-sql': [2, { clientNames: ['db'] }] } },
		);
	});

	test('effect restricts v3-era import paths and keeps v4 paths', async () => {
		await withOxlintProject(join(effectFixtures, 'imports.ts'), 'src/imports.ts', ['effect'], async (project) => {
			const result = await runOxlint(project);
			expect(ruleLines(result.stdout, 'no-restricted-imports').toSorted((left, right) => left - right)).toEqual([
				1, 2, 4, 5, 6, 7, 9, 11,
			]);
		});
	});

	test('effect bans process.env except in scripts', async () => {
		const source = join(effectFixtures, 'process-env.ts');
		await withOxlintProject(source, 'src/env.ts', ['node', 'effect'], async (project) => {
			const result = await runOxlint(project);
			expect(ruleLines(result.stdout, 'no-process-env')).toEqual([3]);
		});
		await withOxlintProject(source, 'scripts/env.ts', ['node', 'effect'], async (project) => {
			const result = await runOxlint(project);
			expect(ruleLines(result.stdout, 'no-process-env')).toEqual([]);
		});
	});

	test('effect-types-only allows type imports and bans value imports', async () => {
		await withOxlintProject(
			join(effectFixtures, 'types-only.ts'),
			'src/ui.ts',
			['effect-types-only'],
			async (project) => {
				const result = await runOxlint(project);
				expect(ruleLines(result.stdout, 'types-only-imports')).toEqual([1, 2, 4]);
				expect(diagnostics(result.stdout).every(({ message }) => !message.includes('effect/Result'))).toBeTrue();
			},
		);
	});

	test('effect-types-only bans value re-exports and dynamic imports', async () => {
		await withOxlintProject(
			join(effectFixtures, 'types-only-exports.ts'),
			'src/ui.ts',
			['effect-types-only'],
			async (project) => {
				const result = await runOxlint(project);
				expect(ruleLines(result.stdout, 'types-only-imports')).toEqual([1, 2, 5, 8]);
			},
		);
	});

	test('effect-types-only composes with a consumer no-restricted-imports config', async () => {
		await withOxlintProject(
			join(effectFixtures, 'types-only-composed.ts'),
			'src/ui.ts',
			['common', 'effect-types-only'],
			async (project) => {
				const result = await runOxlint(project);
				expect(ruleLines(result.stdout, 'types-only-imports')).toEqual([2]);
				expect(ruleLines(result.stdout, 'no-restricted-imports')).toEqual([1]);
			},
			{
				rules: {
					'no-restricted-imports': [
						2,
						{ paths: [{ name: 'react-native', importNames: ['Image'], message: 'Use the shared Image component.' }] },
					],
				},
			},
		);
	});
});

describe('unistyles', () => {
	test('idiomatic Unistyles code has no diagnostics under the native stack', async () => {
		await withOxlintProject(
			join(unistylesFixtures, 'valid.tsx'),
			'src/Card.tsx',
			['common', 'node', 'typescript', 'module', 'react', 'native', 'unistyles'],
			async (project) => {
				const result = await runOxlint(project, false, [project.file], []);
				expect(diagnostics(result.stdout)).toEqual([]);
			},
		);
	});

	test('stylesheet-import moves StyleSheet to react-native-unistyles', async () => {
		await withOxlintProject(
			join(unistylesFixtures, 'stylesheet-import.tsx'),
			'src/Styles.tsx',
			['unistyles'],
			async (project) => {
				const result = await runOxlint(project);
				expect(result.exitCode).toBe(0);
				const source = await readFile(project.file, 'utf8');
				expect(source).toStartWith(
					"import { Text } from 'react-native';\nimport { useUnistyles, StyleSheet } from 'react-native-unistyles';\n",
				);
			},
		);
	});

	test('no-raw-colors flags colour literals in styles outside theme files', async () => {
		const source = join(unistylesFixtures, 'no-raw-colors.tsx');
		await withOxlintProject(source, 'src/Label.tsx', ['unistyles'], async (project) => {
			const result = await runOxlint(project);
			expect(ruleLines(result.stdout, 'no-raw-colors')).toEqual([6, 7, 8, 15]);
		});
		await withOxlintProject(source, 'src/theme/Label.tsx', ['unistyles'], async (project) => {
			const result = await runOxlint(project);
			expect(ruleLines(result.stdout, 'no-raw-colors')).toEqual([]);
		});
	});

	test('no-inline-style-objects flags inline objects with literal values', async () => {
		await withOxlintProject(
			join(unistylesFixtures, 'no-inline-style-objects.tsx'),
			'src/Box.tsx',
			['unistyles'],
			async (project) => {
				const result = await runOxlint(project);
				expect(ruleLines(result.stdout, 'no-inline-style-objects')).toEqual([16, 17, 18]);
			},
		);
	});

	test('create-uses-theme warns on static StyleSheet.create in files that import the theme', async () => {
		await withOxlintProject(
			join(unistylesFixtures, 'create-uses-theme.tsx'),
			'src/Title.tsx',
			['unistyles'],
			async (project) => {
				const result = await runOxlint(project);
				expect(result.exitCode).toBe(0);
				expect(ruleLines(result.stdout, 'create-uses-theme')).toEqual([6]);
			},
		);
	});
});
