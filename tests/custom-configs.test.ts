import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, test } from 'bun:test';

import { runOxlint, withOxlintProject } from './test-support/cli.js';

const fixturesDirectory = join(import.meta.dir, 'fixtures/focused');

interface Diagnostic {
	code: string;
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
			expect(await readFile(project.file, 'utf8')).toContain('imports: [AlphaModule, ZuluModule]');
			expect(await readFile(project.file, 'utf8')).toContain('providers: [AlphaService, ZuluService]');
		});
	});

	test('tsdoc reports invalid parameter syntax', async () => {
		await withOxlintProject(join(fixturesDirectory, 'tsdoc.ts'), 'tsdoc.ts', ['tsdoc'], async (project) => {
			const result = await runOxlint(project);
			expect(result.exitCode).toBe(0);
			expectRule(result.stdout, 'syntax');
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
