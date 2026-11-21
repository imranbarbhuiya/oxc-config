import { recommended } from '@effect/tsgo/oxlint-presets';
import { defineConfig } from 'oxlint';

// The `effecttsgo/*` rules exist only in an Oxlint patched by `effect-tsgo patch --oxlint`
// (or run through `effect-tsgo oxlint`). Stock Oxlint rejects the plugin, so this fragment is opt-in.
const config = defineConfig({
	extends: [recommended],
});

export default config;
