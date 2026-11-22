import { spawn } from 'node:child_process';
import path from 'node:path';

interface CommandResult {
	output: string;
	status: number | null;
	stdout: string;
}

export interface ScriptChange {
	after: string;
	before: string;
	name: string;
}

export interface ScriptRewrite {
	changed: ScriptChange[];
	skipped: { name: string; reason: string; script: string }[];
	scripts: Record<string, string>;
}

// `--no-script`: `bun lint` in a script other than `lint` would otherwise run the `lint` script.
export const BUN_LINT = 'bun lint --no-script';
export const BUN_FMT = 'bun fmt --no-script';
const BUN_TOOLS: Record<string, string> = { oxfmt: BUN_FMT, oxlint: BUN_LINT };
// oxlint and oxfmt flags that bun lint and bun fmt do not have.
const UNSUPPORTED_FLAGS = /(?:^|\s)--(?:lsp|migrate|init)(?:[\s=]|$)/;
// A tool name in command position: at the start, or after &&, ||, ; or |.
const COMMAND = /(^|&&|\|\||;|\|)(\s*)(oxlint|oxfmt)(?=\s|$)/g;
const INDIRECT = /(?:npx|bunx|pnpm\s+(?:exec|dlx)|yarn(?:\s+dlx)?|node)\s+\S*\b(?:oxlint|oxfmt)\b/;
// Bun, Oxfmt and Oxlint colour their output when the environment asks for it, as CI runners do.
const ANSI_ESCAPE = new RegExp(`${String.fromCodePoint(27)}\\[[0-9;]*m`, 'g');

export function run(command: string, args: string[], cwd: string): Promise<CommandResult> {
	return new Promise((resolve) => {
		const child = spawn(command, args, { cwd });
		let stdout = '';
		let stderr = '';
		child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
			stdout += chunk;
		});
		child.stderr.setEncoding('utf8').on('data', (chunk: string) => {
			stderr += chunk;
		});
		child.on('error', () => resolve({ output: `${stdout}${stderr}`, status: null, stdout }));
		child.on('close', (status) => resolve({ output: `${stdout}${stderr}`, status, stdout }));
	});
}

export async function hasBunLint(cwd: string): Promise<boolean> {
	const result = await run('bun', ['lint', '--no-script', '--help'], cwd);
	return result.status === 0 && result.stdout.replaceAll(ANSI_ESCAPE, '').includes('Usage: bun lint');
}

export function rewriteScripts(scripts: Record<string, string>): ScriptRewrite {
	const rewritten: Record<string, string> = { ...scripts };
	const changed: ScriptChange[] = [];
	const skipped: ScriptRewrite['skipped'] = [];

	for (const [name, script] of Object.entries(scripts)) {
		if (UNSUPPORTED_FLAGS.test(script) && /\b(?:oxlint|oxfmt)\b/.test(script)) {
			skipped.push({ name, reason: 'uses a flag that Bun does not support', script });
			continue;
		}
		if (INDIRECT.test(script)) {
			skipped.push({ name, reason: 'runs oxlint or oxfmt through another launcher', script });
			continue;
		}
		const after = script.replaceAll(
			COMMAND,
			(_match, separator: string, space: string, tool: string) => `${separator}${space}${BUN_TOOLS[tool]}`,
		);
		if (after !== script) {
			rewritten[name] = after;
			changed.push({ after, before: script, name });
		}
	}

	return { changed, scripts: rewritten, skipped };
}

export async function checkBunSupport(cwd: string): Promise<string[]> {
	const problems: string[] = [];
	const lint = await run('bun', ['lint', '--no-script', '--doctor'], cwd);
	if (lint.status === 0) {
		const unsupported = /^\s*\d+ (?:is|are) not supported: .*$/m.exec(lint.output);
		if (unsupported) problems.push(`bun lint does not support every rule: ${unsupported[0].trim()}`);
	} else {
		problems.push(`bun lint cannot use the Oxlint config:\n${lint.output.trim()}`);
	}
	const format = await run('bun', ['fmt', '--no-script', '--doctor'], cwd);
	if (format.status !== 0) problems.push(`bun fmt cannot use the Oxfmt config:\n${format.output.trim()}`);
	return problems;
}

function lines(output: string): string[] {
	return output.replaceAll(ANSI_ESCAPE, '').split('\n');
}

function lintFindings(output: string): string[] {
	const findings = lines(output)
		.map((line) => /^(.+?:\d+:\d+):.*\[(?:Error|Warning)\/([^\]]+)\]\s*$/.exec(line))
		.filter((match) => match !== null)
		.map((match) => `${match[1]} ${match[2]}`);
	return findings.toSorted((left, right) => left.localeCompare(right));
}

function formatFindings(output: string): string[] {
	const files = lines(output)
		.map((line) => line.replace(/\s+\(\d+ms\)$/, '').trim())
		.filter((line) => line !== '' && !/^(?:Checking|Format issues|Finished|All matched)/.test(line));
	return files.toSorted((left, right) => left.localeCompare(right));
}

function difference(left: string[], right: string[]): string[] {
	const rightSet = new Set(right);
	return left.filter((item) => !rightSet.has(item));
}

function describe(tool: string, only: string[]): string {
	const sample = only.slice(0, 10).map((item) => `  ${item}`);
	const more = only.length > 10 ? [`  and ${only.length - 10} more`] : [];
	return [`Only ${tool} reports:`, ...sample, ...more].join('\n');
}

/**
 * Runs Oxlint and bun lint, then Oxfmt and bun fmt, in check mode and returns how their reports differ.
 * Neither writes files.
 */
export async function compareWithOxc(cwd: string): Promise<string[]> {
	const bin = (name: string) => path.join(cwd, 'node_modules', '.bin', name);
	const problems: string[] = [];

	const oxlint = await run(bin('oxlint'), ['--format', 'unix'], cwd);
	if (oxlint.status !== 0 && oxlint.status !== 1) {
		problems.push(`Could not run oxlint to compare:\n${oxlint.output.trim()}`);
	} else {
		const bun = await run('bun', ['lint', '--no-script', '--format', 'unix'], cwd);
		if (bun.status !== 0 && bun.status !== 1) problems.push(`bun lint failed:\n${bun.output.trim()}`);
		else {
			const fromOxlint = lintFindings(oxlint.output);
			const fromBun = lintFindings(bun.output);
			const onlyOxlint = difference(fromOxlint, fromBun);
			const onlyBun = difference(fromBun, fromOxlint);
			if (onlyOxlint.length > 0) problems.push(describe('oxlint', onlyOxlint));
			if (onlyBun.length > 0) problems.push(describe('bun lint', onlyBun));
		}
	}

	const oxfmt = await run(bin('oxfmt'), ['--check'], cwd);
	if (oxfmt.status !== 0 && oxfmt.status !== 1) {
		problems.push(`Could not run oxfmt to compare:\n${oxfmt.output.trim()}`);
	} else {
		const bun = await run('bun', ['fmt', '--no-script', '--check'], cwd);
		if (bun.status !== 0 && bun.status !== 1) problems.push(`bun fmt failed:\n${bun.output.trim()}`);
		else {
			const onlyOxfmt = difference(formatFindings(oxfmt.output), formatFindings(bun.output));
			const onlyBun = difference(formatFindings(bun.output), formatFindings(oxfmt.output));
			if (onlyOxfmt.length > 0) problems.push(describe('oxfmt', onlyOxfmt));
			if (onlyBun.length > 0) problems.push(describe('bun fmt', onlyBun));
		}
	}

	return problems;
}
