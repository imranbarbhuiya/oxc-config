import { definePlugin, defineRule } from '@oxlint/plugins';

import type { ESTree } from '@oxlint/plugins';

const REL_TAGS = new Set(['a', 'area', 'form', 'link']);

const REL_VALUES = new Map<string, Set<string>>([
	['alternate', new Set(['link', 'area', 'a'])],
	['apple-touch-icon', new Set(['link'])],
	['apple-touch-startup-image', new Set(['link'])],
	['author', new Set(['link', 'area', 'a'])],
	['bookmark', new Set(['area', 'a'])],
	['canonical', new Set(['link'])],
	['dns-prefetch', new Set(['link'])],
	['external', new Set(['area', 'a', 'form'])],
	['help', new Set(['link', 'area', 'a', 'form'])],
	['icon', new Set(['link'])],
	['license', new Set(['link', 'area', 'a', 'form'])],
	['manifest', new Set(['link'])],
	['mask-icon', new Set(['link'])],
	['modulepreload', new Set(['link'])],
	['next', new Set(['link', 'area', 'a', 'form'])],
	['nofollow', new Set(['area', 'a', 'form'])],
	['noopener', new Set(['area', 'a', 'form'])],
	['noreferrer', new Set(['area', 'a', 'form'])],
	['opener', new Set(['area', 'a', 'form'])],
	['pingback', new Set(['link'])],
	['preconnect', new Set(['link'])],
	['prefetch', new Set(['link'])],
	['preload', new Set(['link'])],
	['prerender', new Set(['link'])],
	['prev', new Set(['link', 'area', 'a', 'form'])],
	['search', new Set(['link', 'area', 'a', 'form'])],
	['shortcut', new Set(['link'])],
	['shortcut icon', new Set(['link'])],
	['stylesheet', new Set(['link'])],
	['tag', new Set(['area', 'a'])],
]);

function isJsxSibling(node: ESTree.JSXChild) {
	return node.type === 'JSXElement' || node.type === 'JSXExpressionContainer';
}

function isFunction(node: ESTree.Node): node is ESTree.Function | ESTree.ArrowFunctionExpression {
	return (
		node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression'
	);
}

function attrName(attribute: ESTree.JSXAttribute) {
	if (attribute.name.type === 'JSXIdentifier') return attribute.name.name;
	return `${attribute.name.namespace.name}:${attribute.name.name.name}`;
}

function memberName(member: ESTree.TSPropertySignature) {
	if (member.key.type === 'Identifier') return member.key.name;
	if (member.key.type === 'Literal' && typeof member.key.value === 'string') return member.key.value;
	return 'unknown';
}

function patternType(pattern: ESTree.Node): ESTree.TSType | undefined {
	if (!('typeAnnotation' in pattern) || pattern.typeAnnotation == null || typeof pattern.typeAnnotation !== 'object') {
		return undefined;
	}
	const annotation = pattern.typeAnnotation as ESTree.TSTypeAnnotation;
	if (annotation.type !== 'TSTypeAnnotation') return undefined;
	return annotation.typeAnnotation;
}

function paramType(fn: ESTree.Function | ESTree.ArrowFunctionExpression) {
	const [param] = fn.params;
	if (param == null) return undefined;
	if (param.type === 'TSParameterProperty') return patternType(param.parameter);
	if (param.type === 'RestElement') return undefined;
	if (param.type === 'AssignmentPattern') return patternType(param.left);
	return patternType(param);
}

function unwrapType(type: ESTree.TSType): ESTree.TSType {
	let current = type;
	while (current.type === 'TSParenthesizedType') current = current.typeAnnotation;
	return current;
}

function isReadonlyWrapper(type: ESTree.TSType) {
	return type.type === 'TSTypeReference' && type.typeName.type === 'Identifier' && type.typeName.name === 'Readonly';
}

function enclosingFunction(node: ESTree.Node) {
	let current: ESTree.Node | null | undefined = node.parent;
	while (current) {
		if (isFunction(current)) return current;
		current = current.parent;
	}
	return undefined;
}

const jsxNewline = defineRule({
	meta: {
		type: 'layout',
		docs: {
			description: 'Prevent blank lines between adjacent JSX siblings',
		},
		fixable: 'code',
		messages: {
			prevent: 'JSX element should not start in a new line',
		},
	},
	createOnce(context) {
		function check(children: ESTree.JSXChild[]) {
			for (let index = 0; index < children.length - 2; index++) {
				const current = children[index];
				const between = children[index + 1];
				const next = children[index + 2];
				if (!isJsxSibling(current) || !isJsxSibling(next) || between.type !== 'JSXText') continue;
				if (!/\n\s*\n/.test(between.value)) continue;
				context.report({
					node: next,
					messageId: 'prevent',
					fix(fixer) {
						return fixer.replaceText(between, context.sourceCode.getText(between).replace(/\n\s*\n/, '\n'));
					},
				});
			}
		}
		return {
			JSXElement(node) {
				check(node.children);
			},
			JSXFragment(node) {
				check(node.children);
			},
		};
	},
});

const jsxSortProps = defineRule({
	meta: {
		type: 'layout',
		docs: {
			description: 'Sort JSX props alphabetically',
		},
		fixable: 'code',
		messages: {
			sortPropsByAlpha: 'Props should be sorted alphabetically',
		},
	},
	createOnce(context) {
		return {
			JSXOpeningElement(node) {
				let group: ESTree.JSXAttribute[] = [];
				function flush() {
					if (group.length < 2) {
						group = [];
						return;
					}
					const sorted = group.toSorted((left, right) => {
						const leftName = attrName(left);
						const rightName = attrName(right);
						if (leftName === rightName) return 0;
						return leftName < rightName ? -1 : 1;
					});
					if (group.every((attribute, index) => attribute === sorted[index])) {
						group = [];
						return;
					}
					const texts = sorted.map((attribute) => context.sourceCode.getText(attribute));
					context.report({
						node: group[0],
						messageId: 'sortPropsByAlpha',
						fix(fixer) {
							return group.map((attribute, index) => fixer.replaceText(attribute, texts[index] ?? ''));
						},
					});
					group = [];
				}
				for (const attribute of node.attributes) {
					if (attribute.type === 'JSXSpreadAttribute') {
						flush();
						continue;
					}
					group.push(attribute);
				}
				flush();
			},
		};
	},
});

const noInvalidHtmlAttribute = defineRule({
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow invalid HTML rel attribute values',
		},
		messages: {
			emptyIsMeaningless: 'An empty “rel” attribute is meaningless.',
			neverValid: '“{{value}}” is never a valid “rel” attribute value.',
			notAlone: '“shortcut” must be directly followed by “icon”.',
			notValidFor: '“{{value}}” is not a valid “rel” attribute value for <{{tag}}>.',
			onlyMeaningfulFor: 'The “rel” attribute only has meaning on the tags: "<link>", "<a>", "<area>", "<form>"',
		},
	},
	createOnce(context) {
		return {
			JSXAttribute(node) {
				if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'rel') return;
				if (node.parent.type !== 'JSXOpeningElement' || node.parent.name.type !== 'JSXIdentifier') return;
				const tag = node.parent.name.name;
				if (tag !== tag.toLowerCase()) return;
				if (!REL_TAGS.has(tag)) {
					context.report({ node: node.name, messageId: 'onlyMeaningfulFor' });
					return;
				}
				if (node.value == null) {
					context.report({ node: node.name, messageId: 'emptyIsMeaningless' });
					return;
				}
				let literal: ESTree.StringLiteral | undefined;
				if (node.value.type === 'Literal' && typeof node.value.value === 'string') literal = node.value;
				if (
					node.value.type === 'JSXExpressionContainer' &&
					node.value.expression.type === 'Literal' &&
					typeof node.value.expression.value === 'string'
				) {
					literal = node.value.expression;
				}
				if (literal == null) return;
				if (!literal.value.trim()) {
					context.report({ node: literal, messageId: 'emptyIsMeaningless' });
					return;
				}
				const values = literal.value.trim().split(/\s+/);
				for (const value of values) {
					const allowed = REL_VALUES.get(value);
					if (allowed == null) {
						context.report({ node: literal, messageId: 'neverValid', data: { value } });
						continue;
					}
					if (!allowed.has(tag)) {
						context.report({ node: literal, messageId: 'notValidFor', data: { value, tag } });
					}
				}
				if (values.includes('shortcut') && !values.includes('icon')) {
					context.report({ node: literal, messageId: 'notAlone' });
				}
			},
		};
	},
});

const preferReadOnlyProps = defineRule({
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Require component props type members to be readonly',
		},
		fixable: 'code',
		messages: {
			readOnlyProp: "Prop '{{name}}' should be read-only.",
		},
	},
	createOnce(context) {
		const types = new Map<string, ESTree.TSType | ESTree.TSInterfaceBody>();
		const jsxFns = new Set<ESTree.Function | ESTree.ArrowFunctionExpression>();
		function checkMembers(members: ESTree.TSSignature[]) {
			for (const member of members) {
				if (member.type !== 'TSPropertySignature' || member.readonly) continue;
				context.report({
					node: member,
					messageId: 'readOnlyProp',
					data: { name: memberName(member) },
					fix(fixer) {
						return fixer.insertTextBefore(member, 'readonly ');
					},
				});
			}
		}
		function checkType(type: ESTree.TSType, seen = new Set<string>()) {
			const current = unwrapType(type);
			if (isReadonlyWrapper(current)) return;
			if (current.type === 'TSTypeLiteral') {
				checkMembers(current.members);
				return;
			}
			if (current.type === 'TSIntersectionType') {
				for (const item of current.types) checkType(item, seen);
				return;
			}
			if (current.type !== 'TSTypeReference' || current.typeName.type !== 'Identifier') return;
			const name = current.typeName.name;
			if (seen.has(name)) return;
			seen.add(name);
			const resolved = types.get(name);
			if (resolved == null) return;
			if (resolved.type === 'TSInterfaceBody') checkMembers(resolved.body);
			else checkType(resolved, seen);
		}
		return {
			TSTypeAliasDeclaration(node) {
				types.set(node.id.name, node.typeAnnotation);
			},
			TSInterfaceDeclaration(node) {
				types.set(node.id.name, node.body);
			},
			JSXElement(node) {
				const fn = enclosingFunction(node);
				if (fn) jsxFns.add(fn);
			},
			JSXFragment(node) {
				const fn = enclosingFunction(node);
				if (fn) jsxFns.add(fn);
			},
			'Program:exit'() {
				for (const fn of jsxFns) {
					const type = paramType(fn);
					if (type) checkType(type);
				}
			},
		};
	},
});

export default definePlugin({
	meta: {
		name: 'eslint-plugin-mahir-react',
	},
	rules: {
		'jsx-newline': jsxNewline,
		'jsx-sort-props': jsxSortProps,
		'no-invalid-html-attribute': noInvalidHtmlAttribute,
		'prefer-read-only-props': preferReadOnlyProps,
	},
});
