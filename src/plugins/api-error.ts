import { definePlugin, defineRule } from '@oxlint/plugins';

import type { ESTree } from '@oxlint/plugins';

const DEFAULT_ALLOWED_ERRORS = ['ApiError', 'FormValidationError'];

function getStaticFactoryCallee(arg: ESTree.Node) {
	if (arg.type !== 'CallExpression') return undefined;
	const { callee } = arg;
	if (callee.type !== 'MemberExpression' || callee.computed) return undefined;
	const { object, property } = callee;
	if (object.type !== 'Identifier' || property.type !== 'Identifier') return undefined;
	return { callee, name: object.name };
}

function isAstNode(value: unknown): value is ESTree.Node {
	return typeof value === 'object' && value !== null && 'type' in value && typeof (value as { type: unknown }).type === 'string';
}

const requireApiError = defineRule({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Require an allowed API error instead of Error inside queryFn/mutationFn so status codes propagate to QueryCache error handling',
		},
		schema: [
			{
				type: 'object',
				additionalProperties: false,
				properties: {
					allowedErrors: {
						type: 'array',
						items: { type: 'string', minLength: 1 },
						minItems: 1,
						uniqueItems: true,
					},
				},
			},
		],
		messages: {
			useApiError:
				'Use `new {{allowed}}(...)` or `{{allowed}}.from(...)` instead of `new {{thrown}}(...)` inside {{fnType}}. This ensures the HTTP status code is available in QueryCache/retry/error reporting.',
			useApiErrorCall:
				'Use `new {{allowed}}(...)` or `{{allowed}}.from(...)` instead of `{{thrown}}(...)` inside {{fnType}}. This ensures the HTTP status code is available in QueryCache/retry/error reporting.',
			useApiErrorMember:
				'Throw `new {{allowed}}(...)` or `{{allowed}}.from(...)` instead of re-throwing `{{thrown}}` directly inside {{fnType}}. The client error object may lose its HTTP status code in QueryCache/retry/error reporting.',
		},
		defaultOptions: [{ allowedErrors: [...DEFAULT_ALLOWED_ERRORS] }],
	},
	createOnce(context) {
		let allowedErrors = new Set(DEFAULT_ALLOWED_ERRORS);
		let allowedExample = DEFAULT_ALLOWED_ERRORS[0];
		const fnStack: string[] = [];
		const extractedRefs: { name: string; fnType: string }[] = [];
		const moduleFns = new Map<string, ESTree.Node>();

		function recordModuleFn(name: string | undefined, body: ESTree.Node | null | undefined) {
			if (!name || !body) return;
			if (!moduleFns.has(name)) moduleFns.set(name, body);
		}

		function isAllowedThrow(arg: ESTree.Node) {
			if (arg.type === 'NewExpression' && arg.callee.type === 'Identifier') return allowedErrors.has(arg.callee.name);
			const factory = getStaticFactoryCallee(arg);
			return factory !== undefined && allowedErrors.has(factory.name);
		}

		function checkThrowNode(node: ESTree.ThrowStatement, fnType: string) {
			const arg = node.argument;
			if (isAllowedThrow(arg)) return;

			if (arg.type === 'NewExpression' && arg.callee.type === 'Identifier') {
				context.report({
					node: arg,
					messageId: 'useApiError',
					data: { thrown: arg.callee.name, fnType, allowed: allowedExample },
				});
				return;
			}

			const factory = getStaticFactoryCallee(arg);
			if (factory) {
				context.report({
					node: arg,
					messageId: 'useApiErrorCall',
					data: { thrown: context.sourceCode.getText(factory.callee), fnType, allowed: allowedExample },
				});
				return;
			}

			if (arg.type === 'MemberExpression') {
				context.report({
					node: arg,
					messageId: 'useApiErrorMember',
					data: { thrown: context.sourceCode.getText(arg), fnType, allowed: allowedExample },
				});
			}
		}

		function walkThrows(node: ESTree.Node | null | undefined, fnType: string, visited = new Set<ESTree.Node>()) {
			if (!node || visited.has(node)) return;
			visited.add(node);

			if (node.type === 'ThrowStatement') {
				checkThrowNode(node, fnType);
				return;
			}

			if (
				node.type === 'FunctionDeclaration' ||
				node.type === 'FunctionExpression' ||
				node.type === 'ArrowFunctionExpression'
			) {
				walkThrows(node.body, fnType, visited);
				return;
			}

			for (const key of Object.keys(node)) {
				if (key === 'parent' || key === 'loc' || key === 'range') continue;
				const child = (node as unknown as Record<string, unknown>)[key];
				if (Array.isArray(child)) {
					for (const item of child) if (isAstNode(item)) walkThrows(item, fnType, visited);
				} else if (isAstNode(child)) walkThrows(child, fnType, visited);
			}
		}

		function enterQueryOrMutationFn(node: ESTree.ArrowFunctionExpression | ESTree.Function) {
			const parent = node.parent;
			if (parent.type !== 'Property' || parent.key.type !== 'Identifier') return;
			const name = parent.key.name;
			if (name === 'queryFn' || name === 'mutationFn') fnStack.push(name);
		}

		function exitQueryOrMutationFn(node: ESTree.ArrowFunctionExpression | ESTree.Function) {
			const parent = node.parent;
			if (parent.type !== 'Property' || parent.key.type !== 'Identifier') return;
			const name = parent.key.name;
			if (name === 'queryFn' || name === 'mutationFn') fnStack.pop();
		}

		function checkThrowStatement(node: ESTree.ThrowStatement) {
			if (fnStack.length === 0) return;
			checkThrowNode(node, fnStack.at(-1) ?? '');
		}

		function recordExtractedRef(prop: ESTree.Node) {
			if (prop.type !== 'Property') return;
			if (
				prop.key.type !== 'Identifier' ||
				(prop.key.name !== 'queryFn' && prop.key.name !== 'mutationFn') ||
				prop.value.type !== 'Identifier'
			)
				return;
			extractedRefs.push({ name: prop.value.name, fnType: prop.key.name });
		}

		return {
			before() {
				const options = context.options[0] as { allowedErrors?: string[] } | undefined;
				const allowedList = options?.allowedErrors ?? DEFAULT_ALLOWED_ERRORS;
				allowedErrors = new Set(allowedList);
				allowedExample = allowedList[0] ?? DEFAULT_ALLOWED_ERRORS[0];
				fnStack.length = 0;
				extractedRefs.length = 0;
				moduleFns.clear();
			},
			'Program > FunctionDeclaration'(node) {
				if (node.type !== 'FunctionDeclaration') return;
				recordModuleFn(node.id?.name, node.body);
			},
			'Program > VariableDeclaration > VariableDeclarator'(node) {
				if (node.type !== 'VariableDeclarator') return;
				if (
					node.id.type === 'Identifier' &&
					(node.init?.type === 'ArrowFunctionExpression' || node.init?.type === 'FunctionExpression')
				)
					recordModuleFn(node.id.name, node.init.body);
			},
			ArrowFunctionExpression: enterQueryOrMutationFn,
			'ArrowFunctionExpression:exit': exitQueryOrMutationFn,
			FunctionExpression: enterQueryOrMutationFn,
			'FunctionExpression:exit': exitQueryOrMutationFn,
			Property: recordExtractedRef,
			ThrowStatement: checkThrowStatement,
			'Program:exit'() {
				for (const { name, fnType } of extractedRefs) {
					const body = moduleFns.get(name);
					if (body) walkThrows(body, fnType);
				}
			},
		};
	},
});

export default definePlugin({
	meta: {
		name: 'eslint-plugin-mahir-api-error',
	},
	rules: {
		'require-api-error': requireApiError,
	},
});
