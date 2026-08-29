import { definePlugin, defineRule } from '@oxlint/plugins';

import type { ESTree } from '@oxlint/plugins';

const DEFAULT_LOCALE = 'en-US';

function isSortable(node: ESTree.ArrayExpressionElement): node is ESTree.CallExpression | ESTree.IdentifierName | ESTree.IdentifierReference {
	return node?.type === 'Identifier' || node?.type === 'CallExpression';
}

function nodeName(node: ESTree.CallExpression | ESTree.IdentifierName | ESTree.IdentifierReference) {
	if (node.type === 'Identifier') return node.name;
	if (node.callee.type === 'MemberExpression' && node.callee.object.type === 'Identifier') return node.callee.object.name;
	return '';
}

function isFactoryProviderInjectArray(node: ESTree.ArrayExpression) {
	if (node.parent.type !== 'Property') return false;
	const property = node.parent;
	if (property.key.type !== 'Identifier' || property.key.name !== 'inject') return false;
	if (property.parent.type !== 'ObjectExpression') return false;
	return property.parent.properties.some(
		(item) => item.type === 'Property' && item.key.type === 'Identifier' && item.key.name === 'useFactory',
	);
}

const sortModuleMetadataArrays = defineRule({
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
		defaultOptions: [{ locale: DEFAULT_LOCALE }],
	},
	createOnce(context) {
		let locale = DEFAULT_LOCALE;
		return {
			before() {
				const options = context.options[0] as { locale?: string } | undefined;
				locale = options?.locale ?? DEFAULT_LOCALE;
			},
			'ClassDeclaration > Decorator[expression.callee.name="Module"] Property > ArrayExpression'(node) {
				if (node.type !== 'ArrayExpression') return;
				if (isFactoryProviderInjectArray(node)) return;
				const sortable = node.elements.filter(isSortable);
				const sorted = sortable.toSorted((left, right) => nodeName(left).localeCompare(nodeName(right), locale));
				if (sortable.every((element, index) => element === sorted[index])) return;
				const texts = sorted.map((element) => context.sourceCode.getText(element));
				context.report({
					node,
					messageId: 'moduleMetadataArraysAreSorted',
					fix: (fixer) => sortable.map((element, index) => fixer.replaceText(element, texts[index] ?? '')),
				});
			},
		};
	},
});

export default definePlugin({
	meta: {
		name: 'eslint-plugin-mahir-nest',
	},
	rules: {
		'sort-module-metadata-arrays': sortModuleMetadataArrays,
	},
});
