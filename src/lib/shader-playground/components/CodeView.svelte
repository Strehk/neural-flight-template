<script lang="ts">
/**
 * CodeView — Read-only GLSL display with copy button.
 */

import { Check, Copy } from "lucide-svelte";

interface Props {
	code: string;
}

let { code }: Props = $props();
let copied = $state(false);

async function copyToClipboard(): Promise<void> {
	await navigator.clipboard.writeText(code);
	copied = true;
	setTimeout(() => { copied = false; }, 2000);
}
</script>

<div class="code-view">
	<div class="code-view-header">
		<span class="code-view-label">Generated GLSL</span>
		<button class="code-view-copy" onclick={copyToClipboard} title="Copy to clipboard">
			{#if copied}<Check size={12} />{:else}<Copy size={12} />{/if}
		</button>
	</div>
	<pre class="code-view-pre"><code>{code}</code></pre>
</div>
