import { cp, mkdir, mkdtemp, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const repositoryDirectory = resolve(import.meta.dir, '../..');
const oxlintBin = join(repositoryDirectory, 'node_modules/oxlint/bin/oxlint');
const oxfmtBin = join(repositoryDirectory, 'node_modules/oxfmt/bin/oxfmt');
const oxlintModule = pathToFileURL(join(repositoryDirectory, 'node_modules/oxlint/dist/index.js')).href;

interface Project {
	directory: string;
	file: string;
}

interface RunResult {
	exitCode: number;
	stderr: string;
	stdout: string;
}

async function run(command: string[], cwd: string): Promise<RunResult> {
	const process = Bun.spawn(command, {
		cwd,
		stderr: 'pipe',
		stdout: 'pipe',
	});
	const [exitCode, stderr, stdout] = await Promise.all([
		process.exited,
		new Response(process.stderr).text(),
		new Response(process.stdout).text(),
	]);

	return { exitCode, stderr, stdout };
}

function distModule(name: string) {
	return pathToFileURL(join(repositoryDirectory, 'dist', `${name}.js`)).href;
}

async function createProject(source: string, relativeFile: string): Promise<Project> {
	const directory = await mkdtemp(join(tmpdir(), 'oxc-config-test-'));
	const file = join(directory, relativeFile);
	await mkdir(dirname(file), { recursive: true });
	await cp(source, file);
	await cp(join(repositoryDirectory, 'tests/fixtures/input/tsconfig.json'), join(directory, 'tsconfig.json'));
	await Bun.write(join(directory, 'package.json'), '{"name":"oxc-config-test","private":true,"type":"module"}\n');
	await symlink(join(repositoryDirectory, 'node_modules'), join(directory, 'node_modules'));

	return { directory, file };
}

async function writeOxlintConfig(directory: string, configs: string[]) {
	const imports = configs
		.map((name, index) => `import config${index} from ${JSON.stringify(distModule(name))};`)
		.join('\n');
	const extendedConfigs = configs.map((_, index) => `config${index}`).join(', ');
	await Bun.write(
		join(directory, 'oxlint.config.mjs'),
		`import { defineConfig } from ${JSON.stringify(oxlintModule)};\n${imports}\nexport default defineConfig({ extends: [${extendedConfigs}], categories: { correctness: 'off' } });\n`,
	);
}

async function writeOxfmtConfig(directory: string) {
	await Bun.write(
		join(directory, 'oxfmt.config.mjs'),
		`import config from ${JSON.stringify(distModule('oxfmt'))};\nexport default config;\n`,
	);
}

export async function withOxlintProject<T>(
	source: string,
	relativeFile: string,
	configs: string[],
	callback: (project: Project) => Promise<T>,
): Promise<T> {
	const project = await createProject(source, relativeFile);
	try {
		await writeOxlintConfig(project.directory, configs);
		return await callback(project);
	} finally {
		await rm(project.directory, { force: true, recursive: true });
	}
}

export async function withOxfmtProject<T>(
	source: string,
	relativeFile: string,
	callback: (project: Project) => Promise<T>,
): Promise<T> {
	const project = await createProject(source, relativeFile);
	try {
		await writeOxfmtConfig(project.directory);
		return await callback(project);
	} finally {
		await rm(project.directory, { force: true, recursive: true });
	}
}

export async function runOxlint(project: Project, typeAware = false) {
	const command = [
		'node',
		oxlintBin,
		'--config',
		join(project.directory, 'oxlint.config.mjs'),
		'--fix',
		'--format',
		'json',
		...(typeAware ? ['--type-aware'] : []),
		project.file,
	];
	let result = await run(command, project.directory);
	for (let attempt = 0; attempt < 4 && result.exitCode !== 0; attempt++) {
		const before = await Bun.file(project.file).text();
		result = await run(command, project.directory);
		const after = await Bun.file(project.file).text();
		if (before === after) break;
	}

	return result;
}

export function runOxfmt(project: Project) {
	return run(
		['node', oxfmtBin, '--config', join(project.directory, 'oxfmt.config.mjs'), '--write', project.file],
		project.directory,
	);
}
