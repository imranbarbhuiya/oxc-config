import type { TSESLint, TSESTree } from '@typescript-eslint/utils';

const DEFAULT_LOCALE = 'en-US';

type Options = [
	{
		locale?: string;
	},
];

function isSortable(
	node: TSESTree.Expression | TSESTree.SpreadElement | null,
): node is TSESTree.CallExpression | TSESTree.Identifier {
	return node?.type === 'Identifier' || node?.type === 'CallExpression';
}

function nodeName(node: TSESTree.Node) {
	if (node.type === 'Identifier') return node.name;
	if (
		node.type === 'CallExpression' &&
		node.callee.type === 'MemberExpression' &&
		node.callee.object.type === 'Identifier'
	)
		return node.callee.object.name;
	return '';
}

function isFactoryProviderInjectArray(node: TSESTree.ArrayExpression) {
	if (node.parent.type !== 'Property') return false;
	const property = node.parent;
	if (property.key.type !== 'Identifier' || property.key.name !== 'inject') return false;
	if (property.parent.type !== 'ObjectExpression') return false;
	return property.parent.properties.some(
		(item) => item.type === 'Property' && item.key.type === 'Identifier' && item.key.name === 'useFactory',
	);
}

const sortModuleMetadataArrays: TSESLint.RuleModule<'moduleMetadataArraysAreSorted', Options> = {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Ensure Module metadata arrays are sorted alphabetically',
		},
		fixable: 'code',
		schema: [
			{
				type: 'object',
				additionalProperties: false,
				properties: {
					locale: { type: 'string' },
				},
			},
		],
		messages: {
			moduleMetadataArraysAreSorted: '`Module` metadata arrays should be sorted in ASC alphabetical order',
		},
	},
	defaultOptions: [{ locale: DEFAULT_LOCALE }],
	create(context) {
		const locale = context.options.at(0)?.locale ?? DEFAULT_LOCALE;
		const sourceCode = context.sourceCode;
		return {
			'ClassDeclaration > Decorator[expression.callee.name="Module"] Property > ArrayExpression'(
				node: TSESTree.ArrayExpression,
			) {
				if (isFactoryProviderInjectArray(node)) return;
				const sortable = node.elements.filter(isSortable);
				const sorted = sortable.toSorted((left, right) => nodeName(left).localeCompare(nodeName(right), locale));
				if (sortable.every((element, index) => element === sorted[index])) return;
				const texts = sorted.map((element) => sourceCode.getText(element));
				context.report({
					node,
					messageId: 'moduleMetadataArraysAreSorted',
					fix: (fixer) => sortable.map((element, index) => fixer.replaceText(element, texts[index] ?? '')),
				});
			},
		};
	},
};

const plugin: TSESLint.FlatConfig.Plugin = {
	meta: {
		name: 'eslint-plugin-mahir-nest',
		version: '1.0.0',
	},
	rules: {
		'sort-module-metadata-arrays': sortModuleMetadataArrays,
	},
};

export default plugin;
