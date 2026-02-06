<script lang="ts">
	/**
	 * ModuleRenderer — Generic renderer for all module types
	 *
	 * Single nodeType: nodeTypes = { module: ModuleRenderer }.
	 * Reads ModuleDef from registry, renders NodeShell + Handles + content component.
	 */

	import { Handle, Position, useNodeConnections } from "@xyflow/svelte";
	import NodeShell from "./NodeShell.svelte";
	import { getModule } from "../components/registry";

	interface Props {
		id: string;
		data: Record<string, unknown>;
	}

	const { id, data }: Props = $props();

	const moduleDef = $derived(getModule(data.moduleType as string));

	const connections = useNodeConnections({ handleType: "target" });
	const isConnected = $derived(connections.current.length > 0);
	const isActive = $derived(
		moduleDef?.variant === "trigger" ? (data.open as boolean) === true : false,
	);
</script>

{#if moduleDef}
	<NodeShell
		{id}
		icon={moduleDef.icon}
		label={(data.label as string) ?? moduleDef.label}
		variant={moduleDef.variant}
		active={isActive}
		connected={isConnected}
	>
		{#each moduleDef.inputs as input}
			<Handle
				type="target"
				position={Position.Left}
				id={input.id}
				class={input.handleClass}
				style={input.position ? `top: ${input.position}` : ""}
			/>
		{/each}

		{@const Content = moduleDef.component}
		<Content {id} {data} />

		{#each moduleDef.outputs as output}
			<Handle
				type="source"
				position={Position.Right}
				id={output.id}
				class={output.handleClass}
				style={output.position ? `top: ${output.position}` : ""}
			/>
		{/each}
	</NodeShell>
{/if}
