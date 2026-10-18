import { definePlugin, defineRule } from '@oxlint/plugins';

import { matchesFileGlob } from '../config.js';

import type { ESTree } from '@oxlint/plugins';

const DEFAULT_EDGE_FILES = ['**/main.ts', '**/*.test.ts', '**/scripts/**'];
const RUN_METHODS = new Set(['runCallback', 'runFork', 'runPromise', 'runPromiseExit', 'runSync', 'runSyncExit']);
const FAIL_METHODS = new Set(['die', 'dieMessage', 'dieSync', 'fail', 'failCause', 'failCauseSync', 'failSync']);
const FN_METHODS = new Set(['fn', 'fnUntraced']);
const FN_NAMED = new Set(['fn']);
const GEN = new Set(['gen']);
const GEN_OR_FN = new Set(['gen', ...FN_METHODS]);

function isEffectMember(node: ESTree.Node, methods: Set<string>): node is ESTree.MemberExpression {
	return (
		node.type === 'MemberExpression' &&
		!node.computed &&
		node.object.type === 'Identifier' &&
		node.object.name === 'Effect' &&
		node.property.type === 'Identifier' &&
		methods.has(node.property.name)
	);
}

function isEffectCall(node: ESTree.Node | null | undefined, methods: Set<string>): node is ESTree.CallExpression {
	return node?.type === 'CallExpression' && isEffectMember(node.callee, methods);
}

function staticString(node: ESTree.Node | undefined) {
	if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
	if (node?.type !== 'TemplateLiteral' || node.expressions.length > 0) return undefined;
	return node.quasis[0]?.value.cooked ?? undefined;
}

function isNamedFnFactory(node: ESTree.Node): node is ESTree.CallExpression {
	return isEffectCall(node, FN_NAMED) && staticString(node.arguments[0]) !== undefined;
}

function isEffectGeneratorBody(fn: ESTree.Node) {
	if (fn.type !== 'FunctionExpression' || !fn.generator) return false;
	const call = fn.parent;
	if (call.type !== 'CallExpression' || !call.arguments.includes(fn)) return false;
	if (isEffectMember(call.callee, GEN_OR_FN)) return true;
	return isNamedFnFactory(call.callee);
}

function isEffectFnCall(node: ESTree.Node) {
	if (node.type !== 'CallExpression') return false;
	if (isNamedFnFactory(node.callee)) return true;
	return isEffectCall(node, FN_METHODS) && node.arguments[0]?.type === 'FunctionExpression';
}

function isGenOrPipedGen(node: ESTree.Node | null | undefined) {
	if (node?.type !== 'CallExpression') return false;
	const { callee } = node;
	if (
		callee.type === 'MemberExpression' &&
		!callee.computed &&
		callee.property.type === 'Identifier' &&
		callee.property.name === 'pipe'
	) {
		return isEffectCall(callee.object, GEN);
	}
	return isEffectMember(callee, GEN);
}

function returnedExpression(fn: ESTree.Function | ESTree.ArrowFunctionExpression) {
	const { body } = fn;
	if (!body) return undefined;
	if (body.type !== 'BlockStatement') return body;
	if (body.body.length !== 1) return undefined;
	const [statement] = body.body;
	return statement.type === 'ReturnStatement' ? statement.argument : undefined;
}

function isReusableFunction(fn: ESTree.Function | ESTree.ArrowFunctionExpression) {
	if (fn.type === 'FunctionDeclaration') return true;
	const { parent } = fn;
	if (parent.type === 'VariableDeclarator') return parent.init === fn;
	if (parent.type === 'Property' || parent.type === 'PropertyDefinition') return parent.value === fn;
	return parent.type === 'MethodDefinition' || parent.type === 'ExportDefaultDeclaration';
}

function bindingName(node: ESTree.Node) {
	const { parent } = node;
	if (!parent) return undefined;
	if (parent.type === 'VariableDeclarator' && parent.init === node && parent.id.type === 'Identifier') {
		return parent.id.name;
	}
	if (
		(parent.type === 'Property' || parent.type === 'PropertyDefinition') &&
		parent.value === node &&
		!parent.computed
	) {
		if (parent.key.type === 'Identifier') return parent.key.name;
		return staticString(parent.key);
	}
	return undefined;
}

const noGenWrapper = defineRule({
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow functions that only wrap and return `Effect.gen`',
		},
		messages: {
			noGenWrapper:
				'Avoid functions that only wrap and return `Effect.gen`. Use `Effect.fn("name")(function* (...) {...})` or `Effect.fnUntraced` instead.',
		},
	},
	createOnce(context) {
		function check(fn: ESTree.Function | ESTree.ArrowFunctionExpression) {
			if (fn.generator || !isReusableFunction(fn)) return;
			if (isGenOrPipedGen(returnedExpression(fn))) context.report({ node: fn, messageId: 'noGenWrapper' });
		}
		return {
			ArrowFunctionExpression: check,
			FunctionDeclaration: check,
			FunctionExpression: check,
		};
	},
});

const fnNameMatches = defineRule({
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Require the `Effect.fn` span name to match the binding it is assigned to',
		},
		fixable: 'code',
		messages: {
			mismatch: '`Effect.fn("{{name}}")` is assigned to `{{binding}}`. Use "{{binding}}" or "<Service>.{{binding}}".',
		},
	},
	createOnce(context) {
		return {
			CallExpression(node) {
				if (!isNamedFnFactory(node.callee)) return;
				const binding = bindingName(node);
				const nameNode = node.callee.arguments[0];
				const name = staticString(nameNode);
				if (!binding || name === undefined) return;
				if (name === binding || name.endsWith(`.${binding}`)) return;
				context.report({
					node: nameNode,
					messageId: 'mismatch',
					data: { name, binding },
					fix(fixer) {
						const quote = context.sourceCode.getText(nameNode).at(0) ?? "'";
						const prefix = name.includes('.') ? name.slice(0, name.lastIndexOf('.') + 1) : '';
						return fixer.replaceText(nameNode, `${quote}${prefix}${binding}${quote}`);
					},
				});
			},
		};
	},
});

const returnYieldError = defineRule({
	meta: {
		type: 'problem',
		docs: {
			description: 'Require `return yield*` when yielding an error so TypeScript knows execution stops',
		},
		fixable: 'code',
		messages: {
			missingReturn: 'Use `return yield* ...` when raising an error so TypeScript knows the generator stops here.',
		},
	},
	createOnce(context) {
		return {
			YieldExpression(node) {
				if (!node.delegate || !node.argument || node.parent.type !== 'ExpressionStatement') return;
				if (node.argument.type !== 'NewExpression' && !isEffectCall(node.argument, FAIL_METHODS)) return;
				context.report({
					node,
					messageId: 'missingReturn',
					fix: (fixer) => fixer.insertTextBefore(node, 'return '),
				});
			},
		};
	},
});

const noPipeOnFn = defineRule({
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow `.pipe` on `Effect.fn` / `Effect.fnUntraced`; pass combinators as extra arguments',
		},
		messages: {
			noPipe:
				'Do not use `.pipe` with `Effect.fn`. Pass the combinators as extra arguments: `Effect.fn("name")(function* () {...}, Effect.withSpan(...))`.',
		},
	},
	createOnce(context) {
		return {
			MemberExpression(node) {
				if (node.computed || node.property.type !== 'Identifier' || node.property.name !== 'pipe') return;
				if (!isEffectFnCall(node.object)) return;
				context.report({ node: node.property, messageId: 'noPipe' });
			},
		};
	},
});

const noThrowInGen = defineRule({
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow `throw` inside `Effect.gen` / `Effect.fn` generators',
		},
		messages: {
			noThrow:
				'Do not throw inside an Effect generator; a throw becomes a defect. Use `return yield* new SomeError(...)` instead.',
		},
	},
	createOnce(context) {
		return {
			ThrowStatement(node) {
				let current: ESTree.Node = node.parent;
				while (
					current.type !== 'FunctionExpression' &&
					current.type !== 'FunctionDeclaration' &&
					current.type !== 'ArrowFunctionExpression' &&
					current.type !== 'Program'
				) {
					current = current.parent;
				}
				if (isEffectGeneratorBody(current)) context.report({ node, messageId: 'noThrow' });
			},
		};
	},
});

const noRunOutsideEdge = defineRule({
	meta: {
		type: 'problem',
		docs: {
			description: 'Restrict `Effect.run*` to entrypoints, tests and scripts',
		},
		schema: [
			{
				type: 'object',
				additionalProperties: false,
				properties: {
					allow: {
						type: 'array',
						items: { type: 'string', minLength: 1 },
						uniqueItems: true,
					},
				},
			},
		],
		messages: {
			noRun:
				'`Effect.{{method}}` belongs at the edge (`NodeRuntime.runMain`, `ManagedRuntime`). Allowed files: {{allow}}.',
		},
		defaultOptions: [{ allow: [...DEFAULT_EDGE_FILES] }],
	},
	createOnce(context) {
		let allow = DEFAULT_EDGE_FILES;
		return {
			before() {
				const options = context.options[0] as { allow?: string[] } | undefined;
				allow = options?.allow ?? DEFAULT_EDGE_FILES;
				return !matchesFileGlob(context, allow);
			},
			CallExpression(node) {
				if (!isEffectMember(node.callee, RUN_METHODS)) return;
				const method = node.callee.property.type === 'Identifier' ? node.callee.property.name : '';
				context.report({ node, messageId: 'noRun', data: { method, allow: allow.join(', ') } });
			},
		};
	},
});

function isEffectModule(source: string) {
	return source === 'effect' || source.startsWith('effect/') || source.startsWith('@effect/');
}

function isTypeOnly(
	kind: string | undefined,
	specifiers: readonly { type: string; importKind?: string; exportKind?: string }[],
) {
	if (kind === 'type') return true;
	return (
		specifiers.length > 0 &&
		specifiers.every((specifier) => specifier.importKind === 'type' || specifier.exportKind === 'type')
	);
}

const typesOnlyImports = defineRule({
	meta: {
		type: 'problem',
		docs: {
			description: 'Allow only type imports from `effect`, `effect/*` and `@effect/*`',
		},
		messages: {
			valueImport:
				'`{{source}}` is a runtime import. This package must not ship the Effect runtime; use `import type` or inline `type` specifiers.',
		},
	},
	createOnce(context) {
		function check(node: ESTree.Node, source: ESTree.Node | null) {
			const name = staticString(source ?? undefined);
			if (name !== undefined && isEffectModule(name)) {
				context.report({ node, messageId: 'valueImport', data: { source: name } });
			}
		}
		return {
			ImportDeclaration(node) {
				if (!isTypeOnly(node.importKind, node.specifiers)) check(node, node.source);
			},
			ExportNamedDeclaration(node) {
				if (node.source && !isTypeOnly(node.exportKind, node.specifiers)) check(node, node.source);
			},
			ExportAllDeclaration(node) {
				if (node.exportKind !== 'type') check(node, node.source);
			},
			ImportExpression(node) {
				check(node, node.source);
			},
		};
	},
});

export default definePlugin({
	meta: {
		name: 'eslint-plugin-mahir-effect',
	},
	rules: {
		'fn-name-matches': fnNameMatches,
		'no-gen-wrapper': noGenWrapper,
		'no-pipe-on-fn': noPipeOnFn,
		'no-run-outside-edge': noRunOutsideEdge,
		'no-throw-in-gen': noThrowInGen,
		'return-yield-error': returnYieldError,
		'types-only-imports': typesOnlyImports,
	},
});
