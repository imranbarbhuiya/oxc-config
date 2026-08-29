# Mahir Oxc Config

Opinionated shared Oxlint and Oxfmt configuration for JavaScript and TypeScript projects.

> [!IMPORTANT]
> This config follows my personal preferences and may change without notice.

## Requirements

- Node.js 24

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

- `-p, --preset <name>` selects `nextjs`, `react`, `node`, `native`, `library`, or `nest`
- `-t, --tailwind` / `--no-tailwind`
- `--i18n` / `--no-i18n`
- `--native-tailwind` / `--no-native-tailwind`
- `--central-icons` / `--no-central-icons`
- `--api-error` / `--no-api-error`
- `--query` / `--no-query`
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
import { defineConfig } from 'oxlint';

import common from '@imranbarbhuiya/oxc-config/common';
import module from '@imranbarbhuiya/oxc-config/module';
import node from '@imranbarbhuiya/oxc-config/node';
import typescript from '@imranbarbhuiya/oxc-config/typescript';

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
import { defineConfig } from 'oxfmt';

import config from '@imranbarbhuiya/oxc-config/oxfmt';

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
- `jsx` contains JSX rules
- `react` contains React rules and includes JSX
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

Fragments can be combined through `defineConfig({ extends: [...] })`. The Tailwind plugin ships with this package. Install a third-party plugin only when you add it yourself, such as TanStack Query.

TanStack Query can be added directly:

```ts
import { defineConfig } from 'oxlint';

import common from '@imranbarbhuiya/oxc-config/common';
import react from '@imranbarbhuiya/oxc-config/react';

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

## MDX

Oxfmt formats MDX files with the shared formatter config. Oxlint does not lint MDX, so this package does not provide an MDX lint fragment.

## Contributors

Thanks to all contributors.

<a href="https://github.com/imranbarbhuiya/oxc-config/graphs/contributors">
	<img src="https://contrib.rocks/image?repo=imranbarbhuiya/oxc-config" alt="Contributors" />
</a>
