import { defineConfig } from 'oxlint';

import { nativePlugins, packagePlugin } from './config.js';

import type { OxlintConfig } from 'oxlint';

const rules: NonNullable<OxlintConfig['rules']> = {
	'typescript/adjacent-overload-signatures': 2,
	'typescript/array-type': [
		2,
		{
			default: 'array',
		},
	],
	'typescript/await-thenable': 2,
	'typescript/ban-ts-comment': [
		2,
		{
			'ts-check': true,
			'ts-expect-error': 'allow-with-description',
			'ts-ignore': false,
			'ts-nocheck': false,
		},
	],
	'typescript/ban-tslint-comment': 2,
	'typescript/class-literal-property-style': [2, 'fields'],
	'typescript/consistent-type-assertions': [
		2,
		{
			assertionStyle: 'as',
			objectLiteralTypeAssertions: 'allow',
		},
	],
	'typescript/consistent-type-definitions': 2,
	'typescript/consistent-type-exports': [
		2,
		{
			fixMixedExportsWithInlineTypeSpecifier: true,
		},
	],
	'typescript-js/default-param-last': 2,
	'typescript/dot-notation': [
		2,
		{
			allowKeywords: true,
			allowPattern: '(^[A-Z])|(^[a-z]+(_[a-z]+)+$)',
			allowPrivateClassPropertyAccess: true,
		},
	],
	'typescript-js/method-signature-style': [2, 'property'],
	'typescript-js/no-array-constructor': 2,
	'typescript/no-array-delete': 0,
	'typescript/no-base-to-string': [
		1,
		{
			ignoredTypeNames: ['RegExp'],
		},
	],
	'typescript/no-confusing-non-null-assertion': 2,
	'typescript-js/no-dupe-class-members': 2,
	'typescript/no-duplicate-enum-values': 2,
	'typescript/no-duplicate-type-constituents': 2,
	'typescript/no-dynamic-delete': 1,
	'typescript/no-empty-object-type': [
		2,
		{
			allowInterfaces: 'with-single-extends',
			allowObjectTypes: 'always',
		},
	],
	'typescript/no-explicit-any': 0,
	'typescript/no-extra-non-null-assertion': 2,
	'typescript/no-floating-promises': [
		2,
		{
			ignoreIIFE: true,
			ignoreVoid: true,
		},
	],
	'typescript/no-for-in-array': 2,
	'typescript/no-implied-eval': 2,
	'typescript/no-inferrable-types': [
		2,
		{
			ignoreParameters: true,
			ignoreProperties: true,
		},
	],
	'typescript-js/no-invalid-this': 2,
	'typescript/no-invalid-void-type': [
		2,
		{
			allowAsThisParameter: true,
			allowInGenericTypeArguments: true,
		},
	],
	'typescript/no-meaningless-void-operator': [
		2,
		{
			checkNever: true,
		},
	],
	'typescript/no-misused-new': 2,
	'typescript/no-misused-promises': [
		2,
		{
			checksConditionals: true,
			checksVoidReturn: false,
		},
	],
	'typescript/no-namespace': 0,
	'typescript/no-non-null-asserted-nullish-coalescing': 2,
	'typescript/no-non-null-asserted-optional-chain': 2,
	'typescript-js/no-redeclare': [
		2,
		{
			builtinGlobals: true,
		},
	],
	'typescript/no-redundant-type-constituents': 0,
	'typescript/no-require-imports': 2,
	'typescript/no-this-alias': [
		2,
		{
			allowDestructuring: true,
			allowedNames: ['self'],
		},
	],
	'typescript/no-unnecessary-boolean-literal-compare': 2,
	'typescript/no-unnecessary-condition': 1,
	'typescript/no-unnecessary-qualifier': 2,
	'typescript/no-unnecessary-type-assertion': 2,
	'typescript/no-unnecessary-type-constraint': 2,
	'typescript/no-unsafe-argument': 0,
	'typescript/no-unsafe-assignment': 0,
	'typescript/no-unsafe-call': 0,
	'typescript/no-unsafe-enum-comparison': 0,
	'typescript/no-unsafe-function-type': 0,
	'typescript/no-unsafe-member-access': 0,
	'typescript/no-unsafe-return': 0,
	'typescript/no-unsafe-unary-minus': 0,
	'typescript-js/no-unused-expressions': 2,
	'typescript/no-unused-vars': 0,
	'typescript-js/no-use-before-define': [
		2,
		{
			classes: true,
			functions: false,
			variables: true,
		},
	],
	'typescript-js/no-useless-constructor': 2,
	'typescript/only-throw-error': 2,
	'typescript/prefer-as-const': 0,
	'typescript-js/prefer-as-const': 0,
	'typescript/prefer-for-of': 2,
	'typescript/prefer-function-type': 2,
	'typescript/prefer-includes': 2,
	'typescript/prefer-literal-enum-member': 2,
	'typescript/prefer-namespace-keyword': 2,
	'typescript/prefer-optional-chain': 2,
	'typescript/prefer-readonly': [
		2,
		{
			onlyInlineLambdas: true,
		},
	],
	'typescript/prefer-reduce-type-parameter': 2,
	'typescript/prefer-regexp-exec': 2,
	'typescript/prefer-return-this-type': 2,
	'typescript/prefer-string-starts-ends-with': 2,
	'typescript/require-array-sort-compare': [
		2,
		{
			ignoreStringArrays: false,
		},
	],
	'typescript/require-await': 0,
	'typescript/restrict-plus-operands': 2,
	'typescript/restrict-template-expressions': 0,
	'typescript/return-await': [2, 'in-try-catch'],
	'typescript/triple-slash-reference': [
		2,
		{
			lib: 'never',
			path: 'never',
			types: 'never',
		},
	],
	'typescript/unbound-method': 0,
	'typescript/unified-signatures': 2,
	'consistent-return': 0,
	'default-case': 0,
	'default-case-last': 0,
	'default-param-last': 0,
	'dot-notation': 0,
	'import/no-dynamic-require': 0,
	'no-shadow': 0,
	'no-use-before-define': 0,
	'no-useless-constructor': 0,
	'sonarjs/no-all-duplicated-branches': 2,
	'sonarjs/no-collapsible-if': 2,
	'sonarjs/no-collection-size-mischeck': 2,
	'sonarjs/no-duplicated-branches': 2,
	'sonarjs/no-element-overwrite': 2,
	'sonarjs/no-empty-collection': 2,
	'sonarjs/no-extra-arguments': 2,
	'sonarjs/no-gratuitous-expressions': 2,
	'sonarjs/no-identical-conditions': 2,
	'sonarjs/no-identical-expressions': 2,
	'sonarjs/no-identical-functions': 2,
	'sonarjs/no-ignored-return': 2,
	'sonarjs/no-inverted-boolean-check': 2,
	'sonarjs/no-nested-switch': 2,
	'sonarjs/no-redundant-boolean': 2,
	'sonarjs/no-redundant-jump': 2,
	'sonarjs/no-same-line-conditional': 2,
	'sonarjs/no-unused-collection': 2,
	'sonarjs/no-use-of-empty-return-value': 2,
	'sonarjs/non-existent-operator': 2,
	'sonarjs/prefer-immediate-return': 2,
	'sonarjs/prefer-object-literal': 2,
	'sonarjs/prefer-single-boolean-return': 2,
	'sonarjs/prefer-while': 2,
};
const config = defineConfig({
	plugins: nativePlugins,
	jsPlugins: [
		packagePlugin('sonarjs', 'eslint-plugin-sonarjs'),
		packagePlugin('typescript-js', '@typescript-eslint/eslint-plugin'),
	],
	rules,
});

export default config;
