<script lang="ts">
	/**
	 * ShaderButton — bits-ui Button wrapper for shader playground.
	 */
	import { Button } from "bits-ui";

	interface Props {
		variant?: "default" | "primary" | "danger" | "ghost";
		active?: boolean;
		disabled?: boolean;
		title?: string;
		onclick: () => void;
		children: import("svelte").Snippet;
	}

	const {
		variant = "default",
		active = false,
		disabled = false,
		title,
		onclick,
		children,
	}: Props = $props();
</script>

<Button.Root
	class="sp-btn sp-btn-{variant}"
	data-active={active}
	{disabled}
	{title}
	onclick={onclick}
>
	{@render children()}
</Button.Root>

<style>
	:global(.sp-btn) {
		background: var(--surface);
		color: var(--text-muted);
		border: 1px solid var(--border);
		padding: 0.25rem 0.6rem;
		font-size: 0.7rem;
		font-family: var(--font-mono);
		cursor: pointer;
		white-space: nowrap;
		min-height: auto;
		min-width: auto;
		text-transform: none;
		letter-spacing: normal;
		font-weight: 500;
	}

	:global(.sp-btn:hover) {
		border-color: var(--text-subtle);
		color: var(--text);
	}

	:global(.sp-btn[data-active="true"]) {
		background: var(--surface-active);
		color: var(--text);
		border-color: var(--text-subtle);
	}

	:global(.sp-btn:disabled) {
		opacity: 0.3;
		cursor: default;
	}

	:global(.sp-btn-primary) {
		border-color: var(--success-muted);
		color: var(--success);
	}

	:global(.sp-btn-primary:hover) {
		background: var(--surface-hover);
	}

	:global(.sp-btn-danger) {
		color: var(--error);
	}

	:global(.sp-btn-danger:hover) {
		background: var(--error);
		color: var(--bg);
	}

	:global(.sp-btn-ghost) {
		background: transparent;
		border-color: transparent;
	}

	:global(.sp-btn-ghost:hover) {
		color: var(--text);
		background: var(--surface);
	}
</style>
