<script lang="ts">
/**
 * GlslSnippetView — Syntax-highlighted GLSL code display.
 *
 * Uses the custom GLSL tokenizer to render tokens as colored spans.
 * Replaces raw <pre><code> blocks with readable, highlighted GLSL.
 */

import { tokenizeGlsl } from "../glsl-tokenizer";

interface Props {
	code: string;
	/** Optional: compact mode with smaller font + no padding (for inline module view) */
	compact?: boolean;
}

let { code, compact = false }: Props = $props();

const tokens = $derived(tokenizeGlsl(code));
</script>

<pre class="glsl-snippet" class:glsl-snippet-compact={compact}><code
>{#each tokens as token}<span class="glsl-{token.type}">{token.value}</span>{/each}</code
></pre>
