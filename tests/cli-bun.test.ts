import { describe, expect, test } from 'bun:test';

import { rewriteScripts } from '../src/cli/bun.js';

describe('rewriteScripts', () => {
	test('switches direct oxlint and oxfmt commands to bun lint and bun fmt', () => {
		const result = rewriteScripts({
			check: 'tsc --noEmit && oxlint . && oxfmt --check',
			format: 'oxfmt',
			lint: 'oxlint --fix .',
			'lint:check': 'oxlint --deny-warnings --type-aware .',
		});

		expect(result.scripts).toEqual({
			check: 'tsc --noEmit && bun lint --no-script . && bun fmt --no-script --check',
			format: 'bun fmt --no-script',
			lint: 'bun lint --no-script --fix .',
			'lint:check': 'bun lint --no-script --deny-warnings --type-aware .',
		});
		expect(result.changed.map(({ name }) => name)).toEqual(['check', 'format', 'lint', 'lint:check']);
		expect(result.skipped).toEqual([]);
	});

	test('leaves scripts that do not run oxlint or oxfmt as a command', () => {
		const scripts = {
			build: 'tsdown',
			deps: 'bun add -d oxlint-tsgolint',
			echo: 'echo oxlint',
			test: 'bun test',
		};

		const result = rewriteScripts(scripts);

		expect(result.scripts).toEqual({ ...scripts, echo: 'echo oxlint' });
		expect(result.changed).toEqual([]);
	});

	test('skips launchers and flags that Bun does not support', () => {
		const scripts = {
			editor: 'oxlint --lsp',
			format: 'node ./node_modules/oxfmt/bin/oxfmt --write',
			lint: 'npx oxlint .',
		};

		const result = rewriteScripts(scripts);

		expect(result.scripts).toEqual(scripts);
		expect(result.skipped.map(({ name }) => name)).toEqual(['editor', 'format', 'lint']);
	});
});
