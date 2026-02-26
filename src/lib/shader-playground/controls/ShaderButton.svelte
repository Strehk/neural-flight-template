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

