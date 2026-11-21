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
- `tsrs` `7.1.0-beta.tsrs3`, the backend for type-aware rules (the newest version `@effect/tsgo` can patch)
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
- `-r, --runner <name>` picks the tools the scripts run: `oxc` (oxlint, tsrs and oxfmt, the default) or `bun` (`bun lint` and `bun fmt`). See [Bun](#bun)
- `--migrate-to-bun` switches an existing setup's scripts to `bun lint` and `bun fmt`. See [Bun](#bun)
- `-y, --yes` skips prompts and uses detected defaults
- `--cwd <path>` changes the target directory
- `-h, --help` shows help

The CLI offers optional features only where they apply. For example, i18n is available for Next.js, while TanStack Query support is available for React-based presets.

## Manual setup

Install the config and Oxc tools:

```bash
npm install --save-dev @imranbarbhuiya/oxc-config oxlint tsrs oxfmt
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

`options.typeAware` belongs at the root of the Oxlint config. It turns on the type-aware rules in the `typescript` fragment.

## Type-aware linting with tsrs

Install [`tsrs`](https://github.com/oxc-project/tsrs), the Rust port of the TypeScript 7 checker, as the backend for type-aware rules. Oxlint 1.92 and later finds its `tsrs-lint` launcher in `node_modules/.bin` and uses it in place of `oxlint-tsgolint`. It runs the same rules with the same options. Install `oxlint-tsgolint` instead only if you need tsgolint's Go profiling variables. `OXLINT_TSGOLINT_PATH` overrides the discovery.

Oxlint picks `tsrs-lint` whenever `tsrs` is installed, including when it is only there for `tsrs --noEmit`. Upgrading Oxlint to 1.92 or later in a project that already has both `tsrs` and `oxlint-tsgolint` therefore switches the lint engine. Set `TSRS_FAST=1` to run tsrs with its fast preset.

### Type checking in the lint run

The shared presets leave `options.typeCheck` off. To report TypeScript errors from the same lint run, set it in your own config:

```ts
export default defineConfig({
	extends: [common, node, typescript, module],
	options: {
		typeAware: true,
		typeCheck: true,
	},
});
```

Only files Oxlint lints are type-checked. Ignored files, declaration files and program-wide diagnostics without a location are not reported, so keep a separate `tsrs --noEmit` (or `tsc --noEmit`) run in CI. Leave it off in monorepos that already type-check each package with its own tsconfig, so the root lint does not run a second type check.

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
- `effect-tsgo` extends the `@effect/tsgo` recommended Oxlint preset (`effecttsgo/*` rules). Opt-in, needs `@effect/tsgo` and a patched Oxlint
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
- `mahir-effect/no-unsafe-sql` flags `sql.unsafe(...)` and `sql.literal(...)` whose first argument is not a constant string (a string literal or a template literal without `${}`). Interpolate values in the tagged template (`` sql`... ${value}` ``) and use `sql(identifier)` or a whitelist for identifiers and `ORDER BY`. `sql.unsafe('SELECT $1', [value])` is allowed. The `clientNames` option (default `['sql']`) lists the client names it checks, matched against `name.unsafe` and `this.name.unsafe`
- `no-restricted-imports` rejects v3-era paths: `effect/Either`, `effect/unstable/*`, `@effect/platform`, `@effect/schema`, `@effect/rpc`, `@effect/cluster`, `@effect/sql` and their subpaths
- `node-js/no-process-env` rejects `process.env`; use `Config`. It is off under `**/scripts/**`

The fragment also turns off or relaxes rules that fire on idiomatic Effect code. Oxlint has no way to scope a rule to files that use Effect, so these apply to every file the fragment covers:

- `no-redeclare` is off, so a schema and its type can share a name (`const UserId = Schema.String.pipe(Schema.brand('UserId'))` with `type UserId = typeof UserId.Type`). Oxlint has no TypeScript-aware variant that allows value and type pairs. Redeclared `let`, `const` and `class` bindings are still errors from the parser and TypeScript
- `promise/prefer-await-to-callbacks`, `promise/prefer-await-to-then` and `unicorn/prefer-top-level-await` are off, because they flag `Effect.catch`, `Effect.catchTag`, `Effect.tapError` and `Stream.catch` as Promise chains or Node-style callbacks
- `require-yield` and `unicorn/throw-new-error` are off
- `typescript/no-misused-spread` is off, because spreading a `Schema.Class` instance into a plain object (`{ ...current, pages }`) is idiomatic and the rule's `allow` option cannot match every user-defined Schema class. `effect-types-only` turns it off too, for UIs that decode into Schema classes
- `func-names` ignores generators
- `no-use-before-define` allows classes referenced from inner scopes, so errors can be declared after the services that use them

Extend `effect` after `common` and `typescript` so these settings win.

Change the allowed run files:

```ts
export default defineConfig({
	extends: [common, node, typescript, module, effect],
	rules: {
		'mahir-effect/no-run-outside-edge': [2, { allow: ['**/main.ts', '**/bin/**'] }],
	},
});
```

Check SQL clients bound to other names:

```ts
export default defineConfig({
	extends: [common, node, typescript, module, effect],
	rules: {
		'mahir-effect/no-unsafe-sql': [2, { clientNames: ['sql', 'db'] }],
	},
});
```

`effect-types-only` is for UI packages that share types with an Effect backend but should not ship the Effect runtime. `mahir-effect/types-only-imports` flags value imports, value re-exports and dynamic imports of `effect`, `effect/*` and `@effect/*`. `import type`, `export type` and inline `type` specifiers are allowed. It does not use `no-restricted-imports`, so you can add your own entries:

```ts
export default defineConfig({
	extends: [common, typescript, module, native, effectTypesOnly],
	rules: {
		'no-restricted-imports': [2, { paths: [{ name: 'react-native', importNames: ['Image'] }] }],
	},
});
```

### `@effect/tsgo` projects

`effect-tsgo patch --typescript --oxlint --tsrs` (and `effect-tsgo oxlint`) supports only specific versions of each tool. Pin `oxlint`, `oxlint-tsgolint` and `tsrs` to versions in the "Supported Package Versions" table of the `@effect/tsgo` README you have installed. Otherwise the patch fails or leaves the Effect rules off. This package needs Oxlint 1.90 or later, `oxlint-tsgolint` 7.0.2005 or later and `tsrs` `7.1.0-beta.tsrs2` or later. `@effect/tsgo` 0.73.2 supports Oxlint 1.91 to 1.94, `oxlint-tsgolint` 7.0.2005 to 7.0.2007 and `tsrs` `7.1.0-beta.tsrs2` and `tsrs3`.

Because Oxlint switches to `tsrs-lint` whenever `tsrs` is installed, a project that installs `tsrs` for type checking also lints on tsrs. Patch tsrs too (`--tsrs`), or run `effect-tsgo --tsrs-lint oxlint`.

If your type check does not run the `@effect/language-service` plugin, add the opt-in `effect-tsgo` fragment to get the Effect diagnostics from Oxlint. It extends `@effect/tsgo/oxlint-presets` `recommended`, and stock Oxlint rejects its `effecttsgo` plugin, so use it only with a patched Oxlint or `effect-tsgo oxlint`:

```ts
import effect from '@imranbarbhuiya/oxc-config/effect';
import effectTsgo from '@imranbarbhuiya/oxc-config/effect-tsgo';

export default defineConfig({
	extends: [common, node, typescript, module, effect, effectTsgo],
	options: {
		typeAware: true,
	},
});
```

## Unistyles

The `unistyles` fragment replaces `tailwind` and `native-tailwind` in Unistyles 3 apps:

- `mahir-unistyles/stylesheet-import` requires `StyleSheet` from `react-native-unistyles` instead of `react-native`, and fixes the import
- `mahir-unistyles/no-raw-colors` flags hex, `rgb()`, `hsl()` and similar colour strings, plus named colours on colour properties, inside `StyleSheet.create(...)` and `style` props. Files under `**/theme/**` and `**/tokens/**` are skipped; change this with `{ allow: [...] }`
- `mahir-unistyles/no-inline-style-objects` flags inline object literals in `style` and `*Style` props unless every value is a variable or member access such as `theme.colors.text`
- `mahir-unistyles/create-uses-theme` warns when a file that imports the theme (an import from a `theme` or `tokens` path, an import whose name contains `theme`, or `useUnistyles`) calls `StyleSheet.create` with a plain object instead of `StyleSheet.create((theme, rt) => ({ ... }))`

## Bun

[`bun lint`](https://bun.com/docs/lint), [`bun fmt`](https://bun.com/docs/format) and [`bun check`](https://bun.com/docs/runtime/check) read `oxlint.config.ts` and `oxfmt.config.ts`, so these configs run on Bun's built-in tools without changes. `bun lint` runs type-aware rules with its own type checker, so it needs neither tsrs nor `oxlint-tsgolint`.

> [!NOTE]
> `bun lint` ships only in canary builds for now (`bun upgrade --canary`). `bun fmt` and `bun check` are in Bun 1.4.5.

Set up a project with Bun's tools:

```bash
npx @imranbarbhuiya/oxc-config --runner bun
```

The scripts call `bun lint --no-script` and `bun fmt --no-script`. Without `--no-script`, `bun lint` in any script other than `lint` runs the `lint` script, so `lint:check` would apply `--fix`. `oxlint` and `oxfmt` are still installed, for `defineConfig` and the editor extension, because Bun has no language server.

Move an existing project to Bun:

```bash
npx @imranbarbhuiya/oxc-config --migrate-to-bun
```

It changes nothing unless every check passes:

1. `bun lint --doctor` and `bun fmt --doctor` accept the configs and list no unsupported rules
2. `oxlint` and `bun lint` report the same problems, and `oxfmt --check` and `bun fmt --check` flag the same files
3. Then it rewrites scripts that call `oxlint` or `oxfmt` directly. Scripts that run them through `npx`, `bunx`, `node` and similar, or use `--lsp`, `--migrate` or `--init`, are left alone and listed

It does not uninstall anything. `bun lint --doctor` lists packages you can remove, such as tsrs or `oxlint-tsgolint`.

What Bun does not support:

- **jsdoc rules.** `bun lint` has no native `jsdoc/*` rules, so the `jsdoc` and `tsdoc` fragments (and the `library` preset) need oxlint. The CLI refuses `--runner bun` for `library`
- **Effect diagnostics.** `bun check` ignores TypeScript language service plugins such as `@effect/language-service`, and `bun lint` cannot load the `effecttsgo` rules. Keep tsrs or tsgo for Effect projects
- **Newer Oxlint and Oxfmt features.** `bun lint` matches Oxlint 1.87 and `bun fmt` matches Oxfmt 0.72. CI runs a compatibility test on Bun canary to catch options Bun does not accept yet

## MDX

Oxfmt formats MDX files with the shared formatter config. Oxlint does not lint MDX, so this package does not provide an MDX lint fragment.

## Contributors

Thanks to all contributors.

<a href="https://github.com/imranbarbhuiya/oxc-config/graphs/contributors">
	<img src="https://contrib.rocks/image?repo=imranbarbhuiya/oxc-config" alt="Contributors" />
</a>
