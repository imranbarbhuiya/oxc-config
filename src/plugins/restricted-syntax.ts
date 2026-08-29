import type { TSESLint, TSESTree } from '@typescript-eslint/utils';

type Restriction =
	| string
	| {
			message?: string;
			selector: string;
	  };

type Options = Restriction[];

function restrictionSelector(restriction: Restriction) {
	return typeof restriction === 'string' ? restriction : restriction.selector;
}

function restrictionMessage(restriction: Restriction) {
	if (typeof restriction === 'string') return `Using '${restriction}' is not allowed.`;
	return restriction.message ?? `Using '${restriction.selector}' is not allowed.`;
}

const noRestrictedSyntax: TSESLint.RuleModule<'restricted', Options> = {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow specified syntax via ESLint selectors',
		},
		schema: {
			type: 'array',
			items: {
				oneOf: [
					{ type: 'string', minLength: 1 },
					{
						type: 'object',
						additionalProperties: false,
						required: ['selector'],
						properties: {
							selector: { type: 'string', minLength: 1 },
							message: { type: 'string', minLength: 1 },
						},
					},
				],
			},
		},
		messages: {
			restricted: '{{message}}',
		},
	},
	defaultOptions: [],
	create(context) {
		const visitors: TSESLint.RuleListener = {};
		for (const restriction of context.options) {
			const selector = restrictionSelector(restriction);
			const message = restrictionMessage(restriction);
			visitors[selector] = (node: TSESTree.Node) => {
				context.report({
					node,
					messageId: 'restricted',
					data: { message },
				});
			};
		}
		return visitors;
	},
};

const plugin: TSESLint.FlatConfig.Plugin = {
	meta: {
		name: 'eslint-plugin-mahir-restricted-syntax',
		version: '1.0.0',
	},
	rules: {
		'no-restricted-syntax': noRestrictedSyntax,
	},
};

export default plugin;
