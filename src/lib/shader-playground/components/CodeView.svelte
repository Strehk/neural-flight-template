<script lang="ts">
/**
 * CodeView — Syntax-highlighted GLSL display with copy + stage tabs.
 */

import { Check, Copy } from "lucide-svelte";
import GlslSnippetView from "./GlslSnippetView.svelte";

interface Props {
	code: string;
	vertexCode?: string | null;
}

let { code, vertexCode = null }: Props = $props();
let copied = $state(false);
let activeTab = $state<"fragment" | "vertex">("fragment");

const displayCode = $derived(
	activeTab === "vertex" && vertexCode ? vertexCode : code,
);

async function copyToClipboard(): Promise<void> {
	await navigator.clipboard.writeText(displayCode);
	copied = true;
	setTimeout(() => { copied = false; }, 2000);
}
</script>

<div class="code-view">
	<div class="code-view-header">
		<div class="code-view-tabs">
			<button
				class="code-view-tab"
				class:active={activeTab === "fragment"}
				onclick={() => (activeTab = "fragment")}
			>
				Fragment
			</button>
			{#if vertexCode}
				<button
					class="code-view-tab"
					class:active={activeTab === "vertex"}
					onclick={() => (activeTab = "vertex")}
				>
					Vertex
				</button>
			{/if}
		</div>
		<button class="code-view-copy" onclick={copyToClipboard} title="Copy to clipboard">
			{#if copied}<Check size={12} />{:else}<Copy size={12} />{/if}
		</button>
	</div>
	<div class="code-view-pre">
		<GlslSnippetView code={displayCode} />
	</div>
</div>
