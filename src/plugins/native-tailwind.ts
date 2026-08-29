import { definePlugin, defineRule } from '@oxlint/plugins';

import type { ESTree } from '@oxlint/plugins';

const FORBIDDEN = new Set(['flex-col']);

const classNameRules = defineRule({
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow Tailwind flex-col, and standalone flex',
		},
		fixable: 'code',
		messages: {
			forbidden: "Class '{{cls}}' is the default in react-native, so no need to explicitly set it.",
			flexOnly: "Class 'flex' should be removed or changed to 'flex-row' for explicit direction.",
		},
		hasSuggestions: true,
	},
	createOnce(context) {
		function reportAndFix(node: ESTree.Node, text: string, raw: string | null) {
			const classes = text.trim().split(/\s+/);
			const hasFlex = classes.includes('flex');
			const hasFlexCol = classes.includes('flex-col');
			const hasFlexRow = classes.includes('flex-row');
			const offendingForbidden = classes.filter((cl) => FORBIDDEN.has(cl));

			if (!hasFlex && offendingForbidden.length === 0) return;

			if (hasFlex && hasFlexRow) {
				context.report({
					node,
					messageId: 'forbidden',
					data: { cls: 'flex, flex-row' },
					fix(fixer) {
						const kept = classes.filter((cl) => cl !== 'flex' && !FORBIDDEN.has(cl));
						const finalClasses = kept.join(' ');
						const quote = (raw ?? '"').startsWith("'") ? "'" : '"';
						return fixer.replaceText(node, `${quote}${finalClasses}${quote}`);
					},
				});
				return;
			}

			if (hasFlex && hasFlexCol) {
				context.report({
					node,
					messageId: 'forbidden',
					data: { cls: 'flex, flex-col' },
					fix(fixer) {
						const kept = classes.filter((cl) => cl !== 'flex' && cl !== 'flex-col' && !FORBIDDEN.has(cl));
						const finalClasses = kept.join(' ');
						const quote = (raw ?? '"').startsWith("'") ? "'" : '"';
						return fixer.replaceText(node, `${quote}${finalClasses}${quote}`);
					},
				});
				return;
			}

			if (hasFlexCol && !hasFlex) {
				context.report({
					node,
					messageId: 'forbidden',
					data: { cls: 'flex-col' },
					fix(fixer) {
						const kept = classes.filter((cl) => cl !== 'flex-col' && !FORBIDDEN.has(cl));
						const finalClasses = kept.join(' ');
						const quote = (raw ?? '"').startsWith("'") ? "'" : '"';
						return fixer.replaceText(node, `${quote}${finalClasses}${quote}`);
					},
				});
				return;
			}

			if (hasFlex && !hasFlexCol) {
				context.report({
					node,
					messageId: 'flexOnly',
					data: { cls: 'flex' },
					suggest: [
						{
							messageId: 'flexOnly',
							data: { cls: 'flex' },
							fix(fixer) {
								const replacedClasses = classes.map((cl) => (cl === 'flex' ? 'flex-row' : cl));
								const finalClasses = replacedClasses.join(' ');
								const quote = (raw ?? '"').startsWith("'") ? "'" : '"';
								return fixer.replaceText(node, `${quote}${finalClasses}${quote}`);
							},
						},
					],
				});
				return;
			}

			if (offendingForbidden.length > 0) {
				context.report({
					node,
					messageId: 'forbidden',
					data: { cls: offendingForbidden.join(', ') },
					fix(fixer) {
						const kept = classes.filter((cl) => !FORBIDDEN.has(cl));
						const finalClasses = kept.join(' ');
						const quote = (raw ?? '"').startsWith("'") ? "'" : '"';
						return fixer.replaceText(node, `${quote}${finalClasses}${quote}`);
					},
				});
			}
		}

		return {
			JSXAttribute(attr) {
				if (attr.name.type !== 'JSXIdentifier' || attr.name.name !== 'className') return;

				if (attr.value?.type === 'Literal' && typeof attr.value.value === 'string') {
					reportAndFix(attr.value, attr.value.value, attr.value.raw);
					return;
				}

				if (
					attr.value?.type === 'JSXExpressionContainer' &&
					attr.value.expression.type === 'Literal' &&
					typeof attr.value.expression.value === 'string'
				)
					reportAndFix(attr.value.expression, attr.value.expression.value, attr.value.expression.raw);
			},
		};
	},
});

export default definePlugin({
	meta: {
		name: 'eslint-plugin-mahir-native-tailwind',
	},
	rules: {
		'class-name-rules': classNameRules,
	},
});
