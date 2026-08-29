import { definePlugin, defineRule } from '@oxlint/plugins';

import type { ESTree } from '@oxlint/plugins';

type Restriction =
	| string
	| {
			message?: string;
			selector: string;
	  };

function restrictionSelector(restriction: Restriction) {
	return typeof restriction === 'string' ? restriction : restriction.selector;
}

function restrictionMessage(restriction: Restriction) {
	if (typeof restriction === 'string') return `Using '${restriction}' is not allowed.`;
	return restriction.message ?? `Using '${restriction.selector}' is not allowed.`;
}

function isAstNode(value: unknown): value is ESTree.Node {
	return typeof value === 'object' && value !== null && 'type' in value && typeof value.type === 'string';
}

function pathValue(node: ESTree.Node, path: string) {
	let current: unknown = node;
	for (const part of path.split('.')) {
		if (current === null || current === undefined || typeof current !== 'object') return undefined;
		current = (current as Record<string, unknown>)[part];
	}
	return current;
}

function matchAttributes(node: ESTree.Node, attributes: string) {
	for (const attribute of attributes.matchAll(/\[([^\]]+)\]/g)) {
		const expression = attribute[1];
		const equal = /^(.+?)=(?:'([^']*)'|"([^"]*)")$/.exec(expression);
		if (!equal) return false;
		if (String(pathValue(node, equal[1].trim())) !== (equal.at(2) ?? equal.at(3))) return false;
	}
	return true;
}

function matchSimple(node: ESTree.Node, simple: string) {
	const type = /^(?<type>[A-Za-z]+)/.exec(simple)?.groups?.type;
	if (!type || node.type !== type) return false;
	const not = /:not\((?<inner>[^)]*)\)/.exec(simple);
	if (not?.groups?.inner && matchAttributes(node, not.groups.inner)) return false;
	return matchAttributes(node, simple.replaceAll(/:not\([^)]*\)/g, ''));
}

function matchSelector(node: ESTree.Node, selector: string) {
	const parts = selector.split(/\s*>\s*/);
	let current: ESTree.Node | null | undefined = node;
	for (let index = parts.length - 1; index >= 0; index--) {
		if (!current || !matchSimple(current, parts[index] ?? '')) return false;
		current = index > 0 ? current.parent : current;
	}
	return true;
}

function walk(node: ESTree.Node, visit: (current: ESTree.Node) => void, seen = new Set<ESTree.Node>()) {
	if (seen.has(node)) return;
	seen.add(node);
	visit(node);
	for (const key of Object.keys(node)) {
		if (key === 'parent' || key === 'loc' || key === 'range') continue;
		const child = (node as unknown as Record<string, unknown>)[key];
		if (Array.isArray(child)) {
			for (const item of child) if (isAstNode(item)) walk(item, visit, seen);
		} else if (isAstNode(child)) walk(child, visit, seen);
	}
}

const noRestrictedSyntax = defineRule({
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
	createOnce(context) {
		let restrictions: Restriction[] = [];
		return {
			before() {
				restrictions = Array.isArray(context.options) ? [...(context.options as Restriction[])] : [];
				return restrictions.length > 0;
			},
			Program(program) {
				walk(program, (node) => {
					for (const restriction of restrictions) {
						if (!matchSelector(node, restrictionSelector(restriction))) continue;
						context.report({
							node,
							messageId: 'restricted',
							data: { message: restrictionMessage(restriction) },
						});
					}
				});
			},
		};
	},
});

export default definePlugin({
	meta: {
		name: 'eslint-plugin-mahir-restricted-syntax',
	},
	rules: {
		'no-restricted-syntax': noRestrictedSyntax,
	},
});
