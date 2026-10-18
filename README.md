# Mahir Oxc Config

Opinionated shared Oxlint and Oxfmt configuration for JavaScript and TypeScript projects.

> [!IMPORTANT]
> This config follows my personal preferences and may change without notice.

## Requirements

- Node.js 24
- The `typescript` fragment loads `eslint-plugin-sonarjs`, which needs the TypeScript 5 or 6 JavaScript API. TypeScript 7 has no JavaScript API, so when you also need TypeScript 7 (for example for `@effect/tsgo`), keep `typescript@6` installed as `typescript` and install TypeScript 7 under an alias such as `"@typescript/native": "npm:typescript@7"`

## Quick setup

Run the interactive CLI:

```bash
npx @imranbarbhuiya/oxc-config
```

It detects the package manager and project type, creates `oxlint.config.ts` and `oxfmt.config.ts`, adds lint and format scripts, and installs:

- `@imranbarbhuiya/oxc-config`
- `oxlint`
- `oxlint-tsgolint`
- `oxfmt`
- Any selected optional JavaScript plugins

Examples:

```bash
npx @imranbarbhuiya/oxc-config --preset nextjs --tailwind
npx @imranbarbhuiya/oxc-config -p react -y
```

Available options:

- `-p, --preset <name>` selects `nextjs`, `react`, `node`, `native`, `library`, `nest`, or `effect-node`
- `-t, --tailwind` / `--no-tailwind`
- `--i18n` / `--no-i18n`
- `--native-tailwind` / `--no-native-tailwind`
- `--central-icons` / `--no-central-icons`
- `--api-error` / `--no-api-error`
- `--query` / `--no-query`
- `--unistyles` / `--no-unistyles` (native only, cannot be combined with `--native-tailwind`)
- `--effect-types-only` (Next.js, React and React Native)
- `-y, --yes` skips prompts and uses detected defaults
- `--cwd <path>` changes the target directory
- `-h, --help` shows help

The CLI offers optional features only where they apply. For example, i18n is available for Next.js, while TanStack Query support is available for React-based presets.

## Manual setup

Install the config and Oxc tools:

```bash
npm install --save-dev @imranbarbhuiya/oxc-config oxlint oxlint-tsgolint oxfmt
```

Create `oxlint.config.ts`:

```ts
import common from '@imranbarbhuiya/oxc-config/common';
import module from '@imranbarbhuiya/oxc-config/module';
import node from '@imranbarbhuiya/oxc-config/node';
import typescript from '@imranbarbhuiya/oxc-config/typescript';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [common, node, typescript, module],
	options: {
		typeAware: true,
	},
});
```

`options.typeAware` belongs at the root of the Oxlint config. It enables type-aware linting through `oxlint-tsgolint`.

Create `oxfmt.config.ts`:

```ts
import config from '@imranbarbhuiya/oxc-config/oxfmt';
import { defineConfig } from 'oxfmt';

export default defineConfig({
	...config,
});
```

Add scripts to `package.json`:

```json
{
	"scripts": {
		"lint": "oxlint --fix .",
		"lint:check": "oxlint .",
		"format": "oxfmt",
		"format:check": "oxfmt --check"
	}
}
```

## Config fragments

- `common` contains rules shared by all projects
- `node` contains Node.js rules
- `module` contains ECMAScript module rules
- `typescript` contains TypeScript and type-aware rules
- `react` contains React and JSX rules
- `native` contains React Native rules and includes React
- `next` contains Next.js rules
- `edge` contains edge-runtime rules
- `jsdoc` contains JSDoc rules
- `tsdoc` contains TSDoc rules and includes JSDoc
- `tailwind` contains Tailwind CSS rules
- `i18n` contains next-intl rules
- `native-tailwind` contains React Native Tailwind class-name rules
- `central-icons` prevents barrel imports from `@central-icons-react*` packages
- `api-error` requires allowed error classes in TanStack Query functions
- `effect` contains Effect v4 rules for backend code
- `effect-types-only` allows only type imports from Effect, for UI packages
- `unistyles` contains Unistyles 3 rules for React Native

Fragments can be combined through `defineConfig({ extends: [...] })`. The Tailwind plugin ships with this package. Install a third-party plugin only when you add it yourself, such as TanStack Query.

TanStack Query can be added directly:

```ts
import common from '@imranbarbhuiya/oxc-config/common';
import react from '@imranbarbhuiya/oxc-config/react';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [common, react],
	jsPlugins: [{ name: 'query', specifier: '@tanstack/eslint-plugin-query' }],
	rules: {
		'query/exhaustive-deps': 'error',
		'query/no-rest-destructuring': 'error',
		'query/stable-query-client': 'error',
	},
});
```

## Effect

The `effect-node` CLI preset extends `common`, `node`, `typescript`, `module` and `effect`. Type diagnostics such as floating Effects and missing services come from `@effect/tsgo`; the `effect` fragment covers what it does not:

- `mahir-effect/no-gen-wrapper` flags functions that only wrap and return `Effect.gen`. Use `Effect.fn("name")` or `Effect.fnUntraced`. Callbacks passed to combinators are not flagged
- `mahir-effect/fn-name-matches` requires the `Effect.fn` name to match the binding, either `name` or `Service.name`, and fixes it
- `mahir-effect/return-yield-error` requires `return yield*` before `yield* new SomeError(...)` and `yield* Effect.fail(...)`, and fixes it
- `mahir-effect/no-pipe-on-fn` flags `.pipe` on `Effect.fn(...)(...)`; pass combinators as extra arguments instead
- `mahir-effect/no-throw-in-gen` flags `throw` directly inside `Effect.gen` / `Effect.fn` / `Effect.fnUntraced` generators
- `mahir-effect/no-run-outside-edge` flags `Effect.runPromise`, `runSync`, `runFork` and the other `run*` functions outside `**/main.ts`, `**/*.test.ts` and `**/scripts/**`
- `no-restricted-imports` rejects v3-era paths: `effect/Either`, `effect/unstable/*`, `@effect/platform`, `@effect/schema`, `@effect/rpc`, `@effect/cluster`, `@effect/sql` and their subpaths
- `node-js/no-process-env` rejects `process.env`; use `Config`. It is off under `**/scripts/**`

The fragment also relaxes rules that fire on idiomatic Effect code: `func-names` ignores generators, `require-yield` and `unicorn/throw-new-error` are off, and `no-use-before-define` allows classes referenced from inner scopes, so errors can be declared after the services that use them.

Change the allowed run files:

```ts
export default defineConfig({
	extends: [common, node, typescript, module, effect],
	rules: {
		'mahir-effect/no-run-outside-edge': [2, { allow: ['**/main.ts', '**/bin/**'] }],
	},
});
```

`effect-types-only` is for UI packages that share types with an Effect backend but should not ship the Effect runtime. It sets `no-restricted-imports` for `effect`, `effect/*` and `@effect/*` with `allowTypeImports: true`. Do not combine it with `effect`, because both configure `no-restricted-imports` and the last one wins.

## Unistyles

The `unistyles` fragment replaces `tailwind` and `native-tailwind` in Unistyles 3 apps:

- `mahir-unistyles/stylesheet-import` requires `StyleSheet` from `react-native-unistyles` instead of `react-native`, and fixes the import
- `mahir-unistyles/no-raw-colors` flags hex, `rgb()`, `hsl()` and similar colour strings, plus named colours on colour properties, inside `StyleSheet.create(...)` and `style` props. Files under `**/theme/**` and `**/tokens/**` are skipped; change this with `{ allow: [...] }`
- `mahir-unistyles/no-inline-style-objects` flags inline object literals in `style` and `*Style` props unless every value is a variable or member access such as `theme.colors.text`
- `mahir-unistyles/create-uses-theme` warns when a file that imports the theme (an import from a `theme` or `tokens` path, an import whose name contains `theme`, or `useUnistyles`) calls `StyleSheet.create` with a plain object instead of `StyleSheet.create((theme, rt) => ({ ... }))`

## MDX

Oxfmt formats MDX files with the shared formatter config. Oxlint does not lint MDX, so this package does not provide an MDX lint fragment.

## Contributors

Thanks to all contributors.

<a href="https://github.com/imranbarbhuiya/oxc-config/graphs/contributors">
	<img src="https://contrib.rocks/image?repo=imranbarbhuiya/oxc-config" alt="Contributors" />
</a>
