#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';

import * as p from '@clack/prompts';
import { addDevDependency, detectPackageManager } from 'nypm';

import { BUN_FMT, BUN_LINT, checkBunSupport, compareWithOxc, hasBunLint, rewriteScripts } from './bun.js';

interface PresetConfig {
	configs: string[];
	description: string;
}

interface ExtraConfigs {
	apiError: boolean;
	centralIcons: boolean;
	effectTypesOnly: boolean;
	i18n: boolean;
	nativeTailwind: boolean;
	query: boolean;
	unistyles: boolean;
}

const PACKAGE_NAME = '@imranbarbhuiya/oxc-config';
// The newest tsrs that `effect-tsgo patch --tsrs` supports, so Effect projects can patch it.
const TSRS_VERSION = '7.1.0-beta.tsrs3';

const PRESETS: Record<string, PresetConfig> = {
	nextjs: {
		configs: ['common', 'node', 'typescript', 'module', 'react', 'next', 'edge'],
		description: 'Next.js application with React, TypeScript, and edge runtime support',
	},
	react: {
		configs: ['common', 'node', 'typescript', 'module', 'react'],
		description: 'React application with TypeScript',
	},
	node: {
		configs: ['common', 'node', 'typescript', 'module'],
		description: 'Node.js application with TypeScript',
	},
	native: {
		configs: ['common', 'node', 'typescript', 'module', 'react', 'native'],
		description: 'React Native application with TypeScript',
	},
	library: {
		configs: ['common', 'node', 'typescript', 'module', 'tsdoc'],
		description: 'TypeScript library with TSDoc support',
	},
	nest: {
		configs: ['common', 'node', 'typescript', 'module', 'nest'],
		description: 'NestJS application with TypeScript',
	},
	'effect-node': {
		configs: ['common', 'node', 'typescript', 'module', 'effect'],
		description: 'Effect v4 Node.js backend with TypeScript',
	},
};

const DEFAULT_IGNORES: Record<string, string[]> = {
	nextjs: ['.github/**', '.yarn/**', '.next/**', 'node_modules/**', 'next-env.d.ts'],
	react: ['.github/**', '.yarn/**', 'node_modules/**', 'dist/**', 'build/**'],
	node: ['.github/**', '.yarn/**', 'node_modules/**', 'dist/**'],
	native: ['.github/**', '.yarn/**', 'node_modules/**', '.expo/**', 'android/**', 'ios/**'],
	library: ['.github/**', '.yarn/**', 'node_modules/**', 'dist/**'],
	nest: ['.github/**', '.yarn/**', 'node_modules/**', 'dist/**'],
	'effect-node': ['.github/**', '.yarn/**', 'node_modules/**', 'dist/**'],
};

const PACKAGE_PRESET_MAP: Record<string, string> = {
	next: 'nextjs',
	'react-native': 'native',
	react: 'react',
	'@nestjs/core': 'nest',
	effect: 'effect-node',
};

const DETECTION_PRIORITY = ['next', 'react-native', 'react', '@nestjs/core', 'effect'];

const RUNNERS = ['oxc', 'bun'] as const;
type Runner = (typeof RUNNERS)[number];

// bun lint has no jsdoc/* rules, and tsdoc extends jsdoc.
const PRESETS_WITHOUT_BUN = new Set(['library']);

const { values: options } = parseArgs({
	options: {
		preset: { type: 'string', short: 'p' },
		tailwind: { type: 'boolean', short: 't', default: false },
		'no-tailwind': { type: 'boolean', default: false },
		i18n: { type: 'boolean', default: false },
		'no-i18n': { type: 'boolean', default: false },
		'native-tailwind': { type: 'boolean', default: false },
		'no-native-tailwind': { type: 'boolean', default: false },
		'central-icons': { type: 'boolean', default: false },
		'no-central-icons': { type: 'boolean', default: false },
		'api-error': { type: 'boolean', default: false },
		'no-api-error': { type: 'boolean', default: false },
		query: { type: 'boolean', default: false },
		'no-query': { type: 'boolean', default: false },
		unistyles: { type: 'boolean', default: false },
		'no-unistyles': { type: 'boolean', default: false },
		'effect-types-only': { type: 'boolean', default: false },
		runner: { type: 'string', short: 'r' },
		'migrate-to-bun': { type: 'boolean', default: false },
		yes: { type: 'boolean', short: 'y', default: false },
		cwd: { type: 'string' },
		help: { type: 'boolean', short: 'h', default: false },
	},
	strict: true,
	allowPositionals: false,
});

function printHelp(): void {
	console.log(`
@imranbarbhuiya/oxc-config - Setup Oxlint and Oxfmt

Usage:
  npx @imranbarbhuiya/oxc-config [options]

Options:
  -p, --preset <name>  Preset to use (nextjs, react, node, native, library, nest, effect-node)
  -t, --tailwind       Include Tailwind CSS support
  --no-tailwind        Exclude Tailwind CSS support
  --i18n               Include next-intl i18n rules (Next.js)
  --no-i18n            Exclude next-intl i18n rules
  --native-tailwind    Include React Native Tailwind className rules
  --no-native-tailwind Exclude React Native Tailwind className rules
  --central-icons      Include central-icons barrel-import rules
  --no-central-icons   Exclude central-icons barrel-import rules
  --api-error          Include ApiError rules for queryFn/mutationFn
  --no-api-error       Exclude ApiError rules
  --query              Include TanStack Query rules
  --no-query           Exclude TanStack Query rules
  --unistyles          Include Unistyles 3 rules (native, not with --native-tailwind)
  --no-unistyles       Exclude Unistyles 3 rules
  --effect-types-only  Allow only type imports from Effect (nextjs, react, native)
  -r, --runner <name>  Tools that run the config: oxc (oxlint, tsrs, oxfmt) or bun (bun lint, bun fmt)
  --migrate-to-bun     Switch an existing setup's scripts from oxlint and oxfmt to bun lint and bun fmt
  -y, --yes            Skip prompts and use defaults
  --cwd <path>         Working directory (defaults to current directory)
  -h, --help           Show this help message

Examples:
  npx @imranbarbhuiya/oxc-config
  npx @imranbarbhuiya/oxc-config --preset nextjs --tailwind
  npx @imranbarbhuiya/oxc-config -p react -y
  npx @imranbarbhuiya/oxc-config -p node --runner bun
  npx @imranbarbhuiya/oxc-config --migrate-to-bun
`);
}

function generateOxlintConfig(preset: string, includeTailwind: boolean, extras: ExtraConfigs): string {
	const configs = [...PRESETS[preset].configs];

	if (includeTailwind) configs.push('tailwind');
	if (extras.i18n) configs.push('i18n');
	if (extras.nativeTailwind) configs.push('nativeTailwind');
	if (extras.centralIcons) configs.push('centralIcons');
	if (extras.apiError) configs.push('apiError');
	if (extras.unistyles) configs.push('unistyles');
	if (extras.effectTypesOnly) configs.push('effectTypesOnly');

	const imports = configs.map((name) => {
		const fragment = name.replaceAll(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
		return `import ${name} from '${PACKAGE_NAME}/${fragment}';`;
	});

	const ignores = DEFAULT_IGNORES[preset].map((ignore) => `'${ignore}'`).join(', ');
	const queryBlock = extras.query
		? `
	jsPlugins: [{ name: 'query', specifier: '@tanstack/eslint-plugin-query' }],
	rules: {
		'query/exhaustive-deps': 'error',
		'query/no-rest-destructuring': 'error',
		'query/stable-query-client': 'error',
	},`
		: '';

	const env =
		preset === 'nextjs' || preset === 'react' || preset === 'native'
			? `{
		node: true,
		browser: true,
		serviceworker: true,
	}`
			: `{
		node: true,
	}`;

	return `import { defineConfig } from 'oxlint';

${imports.join('\n')}

export default defineConfig({
	extends: [${configs.join(', ')}],
	ignorePatterns: [${ignores}],
	env: ${env},
	options: {
		typeAware: true,
	},${queryBlock}
});
`;
}

function generateOxfmtConfig(): string {
	return `import { defineConfig } from 'oxfmt';

import config from '${PACKAGE_NAME}/oxfmt';

export default defineConfig({
	...config,
});
`;
}

async function fileExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function getDependencies(cwd: string): Promise<Record<string, string>> {
	const packageJsonPath = path.join(cwd, 'package.json');
	if (!(await fileExists(packageJsonPath))) return {};

	const content = await fs.readFile(packageJsonPath, 'utf8');
	const packageJson = JSON.parse(content) as Record<string, unknown>;

	return {
		...(packageJson.dependencies as Record<string, string> | undefined),
		...(packageJson.devDependencies as Record<string, string> | undefined),
	};
}

function detectPresetFromDependencies(dependencies: Record<string, string>): string | undefined {
	for (const name of DETECTION_PRIORITY) if (dependencies[name]) return PACKAGE_PRESET_MAP[name];
	return undefined;
}

function hasNextIntl(dependencies: Record<string, string>): boolean {
	return Boolean(dependencies['next-intl']);
}

function hasCentralIcons(dependencies: Record<string, string>): boolean {
	return Object.keys(dependencies).some(
		(name) => name.startsWith('@central-icons-react/') || name.startsWith('@central-icons-react-native/'),
	);
}

function hasTanstackQuery(dependencies: Record<string, string>): boolean {
	return Boolean(dependencies['@tanstack/react-query']);
}

function hasUnistyles(dependencies: Record<string, string>): boolean {
	return Boolean(dependencies['react-native-unistyles']);
}

function hasTailwind(dependencies: Record<string, string>): boolean {
	return Boolean(dependencies.tailwindcss || dependencies.nativewind);
}

async function readPackageJson(packageJsonPath: string): Promise<Record<string, unknown>> {
	if (!(await fileExists(packageJsonPath))) {
		p.log.error('No package.json found. Run this command in a project with package.json.');
		process.exit(1);
	}
	return JSON.parse(await fs.readFile(packageJsonPath, 'utf8')) as Record<string, unknown>;
}

async function updateScripts(packageJsonPath: string, runner: Runner): Promise<void> {
	const packageJson = await readPackageJson(packageJsonPath);
	const scripts = (packageJson.scripts as Record<string, string> | undefined) ?? {};
	const [linter, formatter] = runner === 'bun' ? [BUN_LINT, BUN_FMT] : ['oxlint', 'oxfmt'];

	scripts.lint = `${linter} --fix .`;
	scripts['lint:check'] = `${linter} .`;
	scripts.format = formatter;
	scripts['format:check'] = `${formatter} --check`;
	packageJson.scripts = scripts;

	await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, '\t') + '\n');
}

async function installDependencies(cwd: string, includeQuery: boolean, runner: Runner): Promise<string> {
	const pm = await detectPackageManager(cwd);
	const pmName = pm?.name ?? 'npm';
	// With Bun, oxlint and oxfmt stay for `defineConfig` and the editor extension. bun lint brings its own
	// type checker, so tsrs is not needed.
	const dependencies =
		runner === 'bun' ? [PACKAGE_NAME, 'oxlint', 'oxfmt'] : [PACKAGE_NAME, 'oxlint', `tsrs@${TSRS_VERSION}`, 'oxfmt'];

	if (includeQuery) dependencies.push('@tanstack/eslint-plugin-query');

	p.log.info(`Detected package manager: ${pmName}`);
	const spinner = p.spinner();
	spinner.start('Installing dependencies');

	for (const dependency of dependencies) {
		spinner.message(`Installing ${dependency}`);
		await addDevDependency(dependency, { cwd, silent: true });
	}

	spinner.stop('Dependencies installed');
	return pmName;
}

async function confirmOverwrite(filePath: string, skipPrompts: boolean): Promise<void> {
	if (!(await fileExists(filePath)) || skipPrompts) return;

	const result = await p.confirm({
		message: `${path.basename(filePath)} already exists. Overwrite?`,
		initialValue: false,
	});

	if (p.isCancel(result)) {
		p.cancel('Operation cancelled.');
		process.exit(0);
	}

	if (!result) {
		p.cancel('Aborted.');
		process.exit(0);
	}
}

if (options.help) {
	printHelp();
	process.exit(0);
}

p.intro('@imranbarbhuiya/oxc-config setup');

const cwd = options.cwd ? path.resolve(options.cwd) : process.cwd();
const skipPrompts = options.yes;

async function requireBunLint(): Promise<void> {
	if (await hasBunLint(cwd)) return;
	p.log.error('bun lint is not available. It needs a Bun build that has it: run `bun upgrade --canary`.');
	process.exit(1);
}

if (options['migrate-to-bun']) {
	const packageJsonPath = path.join(cwd, 'package.json');
	const packageJson = await readPackageJson(packageJsonPath);
	await requireBunLint();

	const spinner = p.spinner();
	spinner.start('Checking that Bun supports this config');
	const unsupported = await checkBunSupport(cwd);
	spinner.stop(unsupported.length > 0 ? 'Bun does not support this config' : 'Bun supports this config');
	if (unsupported.length > 0) {
		for (const problem of unsupported) p.log.error(problem);
		p.cancel('Nothing was changed. Keep oxlint and oxfmt, or remove what Bun does not support first.');
		process.exit(1);
	}

	spinner.start('Comparing oxlint and oxfmt with bun lint and bun fmt');
	const differences = await compareWithOxc(cwd);
	spinner.stop(differences.length > 0 ? 'The reports differ' : 'Both report the same problems');
	if (differences.length > 0) {
		for (const difference of differences) p.log.error(difference);
		p.cancel('Nothing was changed, because Bun would report different problems.');
		process.exit(1);
	}

	const rewrite = rewriteScripts((packageJson.scripts as Record<string, string> | undefined) ?? {});
	for (const { name, reason, script } of rewrite.skipped) p.log.warn(`Left "${name}" as it is (${reason}): ${script}`);
	if (rewrite.changed.length === 0) {
		p.outro('No script runs oxlint or oxfmt directly, so nothing was changed.');
		process.exit(0);
	}
	for (const { after, before, name } of rewrite.changed) p.log.info(`${name}: ${before} → ${after}`);
	packageJson.scripts = rewrite.scripts;
	await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, '\t') + '\n');
	p.outro(
		'Scripts now use bun lint and bun fmt. Keep oxlint and oxfmt for the editor extension and defineConfig; `bun lint --doctor` lists packages you can remove, such as tsrs or oxlint-tsgolint.',
	);
	process.exit(0);
}

if (options.runner !== undefined && !RUNNERS.includes(options.runner as Runner)) {
	p.log.error(`Unknown runner: ${options.runner}. Use oxc or bun.`);
	process.exit(1);
}
let runner = options.runner as Runner | undefined;
const dependencies = await getDependencies(cwd);

let preset = options.preset;
let includeTailwind = options['no-tailwind'] ? false : options.tailwind ? true : undefined;
let includeI18n = options['no-i18n'] ? false : options.i18n ? true : undefined;
let includeNativeTailwind = options['no-native-tailwind'] ? false : options['native-tailwind'] ? true : undefined;
let includeCentralIcons = options['no-central-icons'] ? false : options['central-icons'] ? true : undefined;
let includeApiError = options['no-api-error'] ? false : options['api-error'] ? true : undefined;
let includeQuery = options['no-query'] ? false : options.query ? true : undefined;
let includeUnistyles = options['no-unistyles'] ? false : options.unistyles ? true : undefined;
let includeEffectTypesOnly = options['effect-types-only'] ? true : undefined;

if (includeUnistyles && includeNativeTailwind) {
	p.log.error('--unistyles and --native-tailwind cannot be used together.');
	process.exit(1);
}

if (!preset) {
	const detectedPreset = detectPresetFromDependencies(dependencies);
	if (skipPrompts) preset = detectedPreset ?? 'node';
	else {
		const presetOptions = Object.entries(PRESETS).map(([value, config]) => ({
			value,
			label: value,
			hint: config.description,
		}));

		if (detectedPreset) {
			const detected = presetOptions.find((option) => option.value === detectedPreset);
			if (detected) {
				detected.hint = `Detected: ${detected.hint}`;
				presetOptions.splice(
					0,
					presetOptions.length,
					detected,
					...presetOptions.filter(({ value }) => value !== detectedPreset),
				);
			}
		}

		const selected = await p.select({
			message: 'Select a preset',
			options: presetOptions,
		});

		if (p.isCancel(selected)) {
			p.cancel('Operation cancelled.');
			process.exit(0);
		}

		preset = selected;
	}
}

if (!(preset in PRESETS)) {
	p.log.error(`Unknown preset: ${preset}`);
	p.log.info(`Available presets: ${Object.keys(PRESETS).join(', ')}`);
	process.exit(1);
}

if (includeTailwind === undefined) {
	if (preset === 'node' || preset === 'library' || preset === 'nest') includeTailwind = false;
	else if (skipPrompts) includeTailwind = hasTailwind(dependencies);
	else {
		const result = await p.confirm({
			message: 'Include Tailwind CSS support?',
			initialValue: hasTailwind(dependencies),
		});
		if (p.isCancel(result)) {
			p.cancel('Operation cancelled.');
			process.exit(0);
		}
		includeTailwind = result;
	}
}

if (includeI18n === undefined) {
	if (preset !== 'nextjs') includeI18n = false;
	else if (skipPrompts) includeI18n = hasNextIntl(dependencies);
	else {
		const result = await p.confirm({
			message: 'Include next-intl i18n rules?',
			initialValue: hasNextIntl(dependencies),
		});
		if (p.isCancel(result)) {
			p.cancel('Operation cancelled.');
			process.exit(0);
		}
		includeI18n = result;
	}
}

if (includeUnistyles === undefined) {
	if (preset !== 'native' || includeNativeTailwind) includeUnistyles = false;
	else if (skipPrompts) includeUnistyles = hasUnistyles(dependencies);
	else {
		const result = await p.confirm({
			message: 'Include Unistyles 3 rules?',
			initialValue: hasUnistyles(dependencies),
		});
		if (p.isCancel(result)) {
			p.cancel('Operation cancelled.');
			process.exit(0);
		}
		includeUnistyles = result;
	}
}

if (includeNativeTailwind === undefined) {
	if (preset !== 'native' || !includeTailwind || includeUnistyles) includeNativeTailwind = false;
	else if (skipPrompts) includeNativeTailwind = true;
	else {
		const result = await p.confirm({
			message: 'Include React Native Tailwind className rules?',
			initialValue: true,
		});
		if (p.isCancel(result)) {
			p.cancel('Operation cancelled.');
			process.exit(0);
		}
		includeNativeTailwind = result;
	}
}

if (includeCentralIcons === undefined) {
	if (preset !== 'native' && preset !== 'react' && preset !== 'nextjs') includeCentralIcons = false;
	else if (skipPrompts) includeCentralIcons = hasCentralIcons(dependencies);
	else {
		const result = await p.confirm({
			message: 'Include central-icons barrel-import rules?',
			initialValue: hasCentralIcons(dependencies),
		});
		if (p.isCancel(result)) {
			p.cancel('Operation cancelled.');
			process.exit(0);
		}
		includeCentralIcons = result;
	}
}

if (includeQuery === undefined) {
	if (preset !== 'native' && preset !== 'react' && preset !== 'nextjs') includeQuery = false;
	else if (skipPrompts) includeQuery = hasTanstackQuery(dependencies);
	else {
		const result = await p.confirm({
			message: 'Include TanStack Query rules?',
			initialValue: hasTanstackQuery(dependencies),
		});
		if (p.isCancel(result)) {
			p.cancel('Operation cancelled.');
			process.exit(0);
		}
		includeQuery = result;
	}
}

if (includeApiError === undefined) {
	if (preset !== 'native' && preset !== 'react' && preset !== 'nextjs') includeApiError = false;
	else if (skipPrompts) includeApiError = hasTanstackQuery(dependencies);
	else {
		const result = await p.confirm({
			message: 'Include ApiError rules for queryFn/mutationFn?',
			initialValue: hasTanstackQuery(dependencies),
		});
		if (p.isCancel(result)) {
			p.cancel('Operation cancelled.');
			process.exit(0);
		}
		includeApiError = result;
	}
}

if (includeEffectTypesOnly === undefined) {
	if (preset !== 'native' && preset !== 'react' && preset !== 'nextjs') includeEffectTypesOnly = false;
	else if (skipPrompts) includeEffectTypesOnly = false;
	else {
		const result = await p.confirm({
			message: 'Allow only type imports from Effect (no Effect runtime in the UI)?',
			initialValue: false,
		});
		if (p.isCancel(result)) {
			p.cancel('Operation cancelled.');
			process.exit(0);
		}
		includeEffectTypesOnly = result;
	}
}

if (runner === undefined) {
	if (skipPrompts || PRESETS_WITHOUT_BUN.has(preset) || !(await hasBunLint(cwd))) runner = 'oxc';
	else {
		const result = await p.select({
			message: 'Which tools should run lint and format?',
			options: [
				{ value: 'oxc', label: 'oxc', hint: 'oxlint with tsrs, and oxfmt' },
				{ value: 'bun', label: 'bun', hint: 'bun lint and bun fmt, built into Bun' },
			],
		});
		if (p.isCancel(result)) {
			p.cancel('Operation cancelled.');
			process.exit(0);
		}
		runner = result;
	}
}

if (runner === 'bun') {
	if (PRESETS_WITHOUT_BUN.has(preset)) {
		p.log.error(`bun lint has no jsdoc rules, which the ${preset} preset uses. Use --runner oxc.`);
		process.exit(1);
	}
	await requireBunLint();
	if (preset === 'effect-node') {
		p.log.warn(
			'bun check and bun lint do not load @effect/language-service or the effecttsgo rules. Keep tsrs or tsgo for Effect diagnostics.',
		);
	}
}

p.log.step(`Setting up Oxlint and Oxfmt with preset: ${preset}, run by ${runner}`);
if (includeTailwind) p.log.info('Including Tailwind CSS support');
if (includeI18n) p.log.info('Including next-intl i18n rules');
if (includeNativeTailwind) p.log.info('Including React Native Tailwind className rules');
if (includeCentralIcons) p.log.info('Including central-icons barrel-import rules');
if (includeQuery) p.log.info('Including TanStack Query rules');
if (includeApiError) p.log.info('Including ApiError rules for queryFn/mutationFn');
if (includeUnistyles) p.log.info('Including Unistyles 3 rules');
if (includeEffectTypesOnly) p.log.info('Including Effect type-only import rules');

const oxlintConfigPath = path.join(cwd, 'oxlint.config.ts');
const oxfmtConfigPath = path.join(cwd, 'oxfmt.config.ts');
const packageJsonPath = path.join(cwd, 'package.json');

await confirmOverwrite(oxlintConfigPath, skipPrompts);
await confirmOverwrite(oxfmtConfigPath, skipPrompts);
await fs.writeFile(
	oxlintConfigPath,
	generateOxlintConfig(preset, includeTailwind, {
		i18n: includeI18n,
		nativeTailwind: includeNativeTailwind,
		centralIcons: includeCentralIcons,
		query: includeQuery,
		apiError: includeApiError,
		unistyles: includeUnistyles,
		effectTypesOnly: includeEffectTypesOnly,
	}),
);
await fs.writeFile(oxfmtConfigPath, generateOxfmtConfig());
p.log.success('Created oxlint.config.ts and oxfmt.config.ts');

await updateScripts(packageJsonPath, runner);
p.log.success('Updated package.json scripts');

const pmName = await installDependencies(cwd, includeQuery, runner);
const runPrefix = pmName === 'npm' ? 'npm run' : pmName;
p.outro(`Setup complete! Run \`${runPrefix} lint && ${runPrefix} format\``);

process.exit(0);
