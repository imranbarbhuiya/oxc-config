import type { TSESLint, TSESTree } from '@typescript-eslint/utils';

const DEFAULT_ALLOWED_ERRORS = ['ApiError', 'FormValidationError'];

function getStaticFactoryCallee(arg: TSESTree.ThrowStatement['argument']) {
	if (arg.type !== 'CallExpression') return undefined;
	const { callee } = arg;
	if (callee.type !== 'MemberExpression' || callee.computed) return undefined;
	const { object, property } = callee;
	if (object.type !== 'Identifier' || property.type !== 'Identifier') return undefined;
	return { callee, name: object.name };
}

function isAstNode(value: unknown): value is TSESTree.Node {
	return typeof value === 'object' && value !== null && 'type' in value && typeof value.type === 'string';
}

type Options = [
	{
		allowedErrors?: string[];
	},
];

const requireApiError: TSESLint.RuleModule<'useApiError' | 'useApiErrorCall' | 'useApiErrorMember', Options> = {
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
	},
	defaultOptions: [{ allowedErrors: [...DEFAULT_ALLOWED_ERRORS] }],
	create(context) {
		const sourceCode = context.sourceCode;
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		const allowedList = context.options[0]?.allowedErrors ?? DEFAULT_ALLOWED_ERRORS;
		const allowedErrors = new Set(allowedList);
		const allowedExample = allowedList[0] ?? DEFAULT_ALLOWED_ERRORS[0];
		const fnStack: string[] = [];
		const extractedRefs: { name: string; fnType: string }[] = [];
		const moduleFns = new Map<string, TSESTree.Node>();

		function recordModuleFn(name: string | undefined, body: TSESTree.Node | null | undefined) {
			if (!name || !body) return;
			if (!moduleFns.has(name)) moduleFns.set(name, body);
		}

		function isAllowedThrow(arg: TSESTree.ThrowStatement['argument']) {
			if (arg.type === 'NewExpression' && arg.callee.type === 'Identifier') return allowedErrors.has(arg.callee.name);

			const factory = getStaticFactoryCallee(arg);
			return factory !== undefined && allowedErrors.has(factory.name);
		}

		function checkThrowNode(node: TSESTree.ThrowStatement, fnType: string) {
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
					data: { thrown: sourceCode.getText(factory.callee), fnType, allowed: allowedExample },
				});
				return;
			}

			if (arg.type === 'MemberExpression') {
				context.report({
					node: arg,
					messageId: 'useApiErrorMember',
					data: { thrown: sourceCode.getText(arg), fnType, allowed: allowedExample },
				});
			}
		}

		function walkThrows(node: TSESTree.Node | null | undefined, fnType: string, visited = new Set<TSESTree.Node>()) {
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
					for (const c of child) if (isAstNode(c)) walkThrows(c, fnType, visited);
				} else if (isAstNode(child)) walkThrows(child, fnType, visited);
			}
		}

		function enterQueryOrMutationFn(node: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression) {
			const parent = node.parent;
			if (parent.type !== 'Property' || parent.key.type !== 'Identifier') return;
			const name = parent.key.name;
			if (name === 'queryFn' || name === 'mutationFn') fnStack.push(name);
		}

		function exitQueryOrMutationFn(node: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression) {
			const parent = node.parent;
			if (parent.type !== 'Property' || parent.key.type !== 'Identifier') return;
			const name = parent.key.name;
			if (name === 'queryFn' || name === 'mutationFn') fnStack.pop();
		}

		function checkThrowStatement(node: TSESTree.ThrowStatement) {
			if (fnStack.length === 0) return;
			checkThrowNode(node, fnStack[fnStack.length - 1]);
		}

		function recordExtractedRef(prop: TSESTree.Property) {
			if (
				prop.key.type !== 'Identifier' ||
				(prop.key.name !== 'queryFn' && prop.key.name !== 'mutationFn') ||
				prop.value.type !== 'Identifier'
			)
				return;
			extractedRefs.push({ name: prop.value.name, fnType: prop.key.name });
		}

		return {
			'Program > FunctionDeclaration'(node: TSESTree.FunctionDeclaration) {
				recordModuleFn(node.id?.name, node.body);
			},
			'Program > VariableDeclaration > VariableDeclarator'(node: TSESTree.VariableDeclarator) {
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
};

const plugin: TSESLint.FlatConfig.Plugin = {
	meta: {
		name: 'eslint-plugin-mahir-api-error',
		version: '1.0.0',
	},
	rules: {
		'require-api-error': requireApiError,
	},
};

export default plugin;
