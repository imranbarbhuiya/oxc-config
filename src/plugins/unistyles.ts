import { definePlugin, defineRule } from '@oxlint/plugins';

import { matchesFileGlob } from '../config.js';

import type { ESTree } from '@oxlint/plugins';

const UNISTYLES = 'react-native-unistyles';
const DEFAULT_THEME_FILES = ['**/theme/**', '**/tokens/**'];
const COLOR_FUNCTION = /^\s*(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/i;
const HEX_COLOR = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;
const COLOR_KEY = /colou?r$/i;
const THEME_SOURCE = /(?:^|[/@-])(?:theme|themes|tokens)(?:[/.-]|$)/i;
const NAMED_COLORS = new Set(
	'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen'.split(
		' ',
	),
);

function isStyleSheetCreate(node: ESTree.Node): node is ESTree.CallExpression {
	return (
		node.type === 'CallExpression' &&
		node.callee.type === 'MemberExpression' &&
		!node.callee.computed &&
		node.callee.object.type === 'Identifier' &&
		node.callee.object.name === 'StyleSheet' &&
		node.callee.property.type === 'Identifier' &&
		node.callee.property.name === 'create'
	);
}

function isStyleAttribute(node: ESTree.Node): node is ESTree.JSXAttribute {
	if (node.type !== 'JSXAttribute' || node.name.type !== 'JSXIdentifier') return false;
	return node.name.name === 'style' || node.name.name.endsWith('Style');
}

function stringValue(node: ESTree.Node) {
	if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
	if (node.type !== 'TemplateLiteral' || node.expressions.length > 0) return undefined;
	return node.quasis[0]?.value.cooked ?? undefined;
}

function propertyKey(node: ESTree.Node) {
	const { parent } = node;
	if (parent?.type !== 'Property' || parent.value !== node || parent.computed) return undefined;
	if (parent.key.type === 'Identifier') return parent.key.name;
	return parent.key.type === 'Literal' && typeof parent.key.value === 'string' ? parent.key.value : undefined;
}

function isRawColor(node: ESTree.Node) {
	const value = stringValue(node)?.trim();
	if (!value) return false;
	if (HEX_COLOR.test(value) || COLOR_FUNCTION.test(value)) return true;
	const key = propertyKey(node);
	return key !== undefined && COLOR_KEY.test(key) && NAMED_COLORS.has(value.toLowerCase());
}

function isInsideStyle(node: ESTree.Node) {
	let current: ESTree.Node | null = node.parent;
	while (current && current.type !== 'Program') {
		if (isStyleSheetCreate(current) || isStyleAttribute(current)) return true;
		current = current.parent;
	}
	return false;
}

function isVariableOrThemeAccess(node: ESTree.Node): boolean {
	if (node.type === 'Identifier') return true;
	if (node.type === 'MemberExpression') return isVariableOrThemeAccess(node.object);
	return node.type === 'ChainExpression' && isVariableOrThemeAccess(node.expression);
}

function inlineObjects(node: ESTree.Node): ESTree.ObjectExpression[] {
	if (node.type === 'ObjectExpression') return [node];
	if (node.type === 'ArrayExpression') {
		return node.elements.flatMap((element) =>
			element && element.type !== 'SpreadElement' ? inlineObjects(element) : [],
		);
	}
	if (node.type === 'ConditionalExpression') {
		return [...inlineObjects(node.consequent), ...inlineObjects(node.alternate)];
	}
	if (node.type === 'LogicalExpression') return inlineObjects(node.right);
	return [];
}

function unistylesImport(program: ESTree.Program) {
	return program.body.find(
		(statement): statement is ESTree.ImportDeclaration =>
			statement.type === 'ImportDeclaration' &&
			statement.source.value === UNISTYLES &&
			statement.importKind !== 'type' &&
			statement.specifiers.some((specifier) => specifier.type === 'ImportSpecifier'),
	);
}

const stylesheetImport = defineRule({
	meta: {
		type: 'problem',
		docs: {
			description: 'Require `StyleSheet` to be imported from `react-native-unistyles`',
		},
		fixable: 'code',
		messages: {
			useUnistyles:
				'Import `StyleSheet` from `react-native-unistyles`; the `react-native` one has no theme or runtime-aware styles.',
		},
	},
	createOnce(context) {
		return {
			ImportDeclaration(node) {
				if (node.source.value !== 'react-native' || node.importKind === 'type') return;
				const specifier = node.specifiers.find(
					(item): item is ESTree.ImportSpecifier =>
						item.type === 'ImportSpecifier' &&
						item.importKind !== 'type' &&
						item.imported.type === 'Identifier' &&
						item.imported.name === 'StyleSheet',
				);
				if (!specifier) return;
				context.report({
					node: specifier,
					messageId: 'useUnistyles',
					fix(fixer) {
						const { sourceCode } = context;
						const quote = node.source.raw?.at(0) ?? "'";
						const moved = sourceCode.getText(specifier);
						const others = node.specifiers.filter((item) => item !== specifier);
						const program = sourceCode.ast;
						const existing = unistylesImport(program);
						const fixes = [];

						if (others.length === 0) {
							if (existing) {
								const end = sourceCode.text[node.range[1]] === '\n' ? node.range[1] + 1 : node.range[1];
								fixes.push(fixer.removeRange([node.range[0], end]));
							} else fixes.push(fixer.replaceText(node.source, `${quote}${UNISTYLES}${quote}`));
						} else {
							const defaults = others
								.filter((item) => item.type !== 'ImportSpecifier')
								.map((item) => sourceCode.getText(item));
							const named = others
								.filter((item) => item.type === 'ImportSpecifier')
								.map((item) => sourceCode.getText(item));
							const clause = [...defaults, ...(named.length > 0 ? [`{ ${named.join(', ')} }`] : [])].join(', ');
							const replacement = `import ${clause} from ${node.source.raw ?? `'react-native'`};`;
							fixes.push(
								fixer.replaceText(
									node,
									existing ? replacement : `${replacement}\nimport { ${moved} } from ${quote}${UNISTYLES}${quote};`,
								),
							);
						}

						if (existing) {
							const last = existing.specifiers.findLast((item) => item.type === 'ImportSpecifier');
							if (last) fixes.push(fixer.insertTextAfter(last, `, ${moved}`));
						}
						return fixes;
					},
				});
			},
		};
	},
});

const noRawColors = defineRule({
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow raw colour literals in `StyleSheet.create` and `style` props outside theme files',
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
			rawColor: 'Raw colour `{{value}}`. Read colours from the theme instead.',
		},
		defaultOptions: [{ allow: [...DEFAULT_THEME_FILES] }],
	},
	createOnce(context) {
		function check(node: ESTree.Node) {
			if (!isRawColor(node) || !isInsideStyle(node)) return;
			context.report({ node, messageId: 'rawColor', data: { value: stringValue(node) ?? '' } });
		}
		return {
			before() {
				const options = context.options[0] as { allow?: string[] } | undefined;
				return !matchesFileGlob(context, options?.allow ?? DEFAULT_THEME_FILES);
			},
			Literal: check,
			TemplateLiteral: check,
		};
	},
});

const noInlineStyleObjects = defineRule({
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow inline style object literals in JSX unless every value is a variable or theme access',
		},
		messages: {
			inlineStyle: 'Move this inline style into `StyleSheet.create` so Unistyles can update it natively.',
		},
	},
	createOnce(context) {
		return {
			JSXAttribute(node) {
				if (!isStyleAttribute(node) || node.value?.type !== 'JSXExpressionContainer') return;
				const { expression } = node.value;
				if (expression.type === 'JSXEmptyExpression') return;
				for (const object of inlineObjects(expression)) {
					const dynamicOnly = object.properties.every((property) =>
						property.type === 'SpreadElement'
							? isVariableOrThemeAccess(property.argument)
							: isVariableOrThemeAccess(property.value),
					);
					if (!dynamicOnly) context.report({ node: object, messageId: 'inlineStyle' });
				}
			},
		};
	},
});

const createUsesTheme = defineRule({
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer the theme callback form of `StyleSheet.create` in files that import the theme',
		},
		messages: {
			useThemeCallback:
				'This file imports the theme. Use `StyleSheet.create((theme, rt) => ({ ... }))` so styles follow theme and runtime changes.',
		},
	},
	createOnce(context) {
		let importsTheme = false;
		return {
			before() {
				importsTheme = false;
			},
			ImportDeclaration(node) {
				if (node.importKind === 'type') return;
				const source = String(node.source.value);
				if (THEME_SOURCE.test(source)) importsTheme = true;
				for (const specifier of node.specifiers) {
					if (specifier.type === 'ImportSpecifier' && specifier.importKind === 'type') continue;
					const name = specifier.local.name;
					if (/theme/i.test(name) || (source === UNISTYLES && name === 'useUnistyles')) importsTheme = true;
				}
			},
			'CallExpression:exit'(node) {
				if (!importsTheme || !isStyleSheetCreate(node)) return;
				if (node.arguments[0]?.type === 'ObjectExpression') context.report({ node, messageId: 'useThemeCallback' });
			},
		};
	},
});

export default definePlugin({
	meta: {
		name: 'eslint-plugin-mahir-unistyles',
	},
	rules: {
		'create-uses-theme': createUsesTheme,
		'no-inline-style-objects': noInlineStyleObjects,
		'no-raw-colors': noRawColors,
		'stylesheet-import': stylesheetImport,
	},
});
