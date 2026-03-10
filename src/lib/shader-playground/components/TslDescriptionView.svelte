<script lang="ts">
/**
 * TslDescriptionView — Displays TSL node chain descriptions.
 *
 * Shows readable text describing what each module does in the chain.
 * Replaces the GLSL syntax-highlighted view.
 */

interface Props {
	code: string;
	compact?: boolean;
}

let { code, compact = false }: Props = $props();
</script>

<pre class="tsl-description" class:tsl-description-compact={compact}><code>{code}</code></pre>

<style>
.tsl-description {
	background: var(--bg-inset, #1a1a2e);
	border-radius: 6px;
	padding: 12px 16px;
	overflow-x: auto;
	font-size: 0.8rem;
	line-height: 1.5;
	color: var(--text-muted, #94a3b8);
	white-space: pre-wrap;
	word-break: break-word;
}
.tsl-description code {
	font-family: "JetBrains Mono", "Fira Code", monospace;
}
.tsl-description-compact {
	padding: 6px 10px;
}
.tsl-description-compact code {
	font-size: 0.72rem;
}
</style>
