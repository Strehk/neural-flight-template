<script lang="ts">
	/**
	 * NodeShell — Shared wrapper for all module nodes
	 *
	 * Provides: variant border, header (icon + label + delete), content slot.
	 * Imports canvas.css for global handle + node styles.
	 */

	import { useSvelteFlow } from "@xyflow/svelte";
	import type { Snippet } from "svelte";
	import type { AnyComponent } from "../components/types";
	import "./canvas.css";

	type Variant = "input" | "process" | "trigger" | "logic" | "output";

	interface Props {
		id: string;
		icon: AnyComponent;
		label: string;
		variant: Variant;
		active?: boolean;
		connected?: boolean;
		children: Snippet;
	}

	const { id, icon: Icon, label, variant, active = false, connected = false, children }: Props = $props();
	const { deleteElements } = useSvelteFlow();

	function deleteNode() {
		deleteElements({ nodes: [{ id }] });
	}
</script>

<div class="node node--{variant}" class:active class:connected>
	<header>
		<Icon size={14} />
		<span class="node-title">{label}</span>
		<button class="node-delete" onclick={deleteNode} type="button">×</button>
	</header>

	<div class="content">
		{@render children()}
	</div>
</div>
