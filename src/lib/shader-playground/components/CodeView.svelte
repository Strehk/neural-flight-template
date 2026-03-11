<script lang="ts">
/**
 * CodeView — TSL node chain description display with copy.
 */

import { Check, Copy } from "lucide-svelte";
import TslDescriptionView from "./TslDescriptionView.svelte";

interface Props {
	descriptions: Map<string, string>;
}

let { descriptions }: Props = $props();
let copied = $state(false);

const displayCode = $derived(
	[...descriptions.values()].join("\n") || "// No modules active",
);

async function copyToClipboard(): Promise<void> {
	await navigator.clipboard.writeText(displayCode);
	copied = true;
	setTimeout(() => {
		copied = false;
	}, 2000);
}
</script>

<div class="code-view">
	<div class="code-view-header">
		<div class="code-view-tabs">
			<button class="code-view-tab active">TSL Chain</button>
		</div>
		<button class="code-view-copy" onclick={copyToClipboard} title="Copy to clipboard">
			{#if copied}<Check size={12} />{:else}<Copy size={12} />{/if}
		</button>
	</div>
	<div class="code-view-pre">
		<TslDescriptionView code={displayCode} />
	</div>
</div>
