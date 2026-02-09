<script lang="ts">
/**
 * ModuleRenderer — Generic renderer for all node types
 *
 * Reads NodeDef from registry, renders NodeShell + widgets + handles.
 */

import { Handle, Position } from "@xyflow/svelte";
import type { AnyComponent } from "../components/types";
import { getNodeDef } from "../nodes/registry";
import NodeShell from "./NodeShell.svelte";

interface Props {
	id: string;
	data: Record<string, unknown>;
}

const { id, data }: Props = $props();

const nodeDef = $derived(getNodeDef(data.nodeType as string));
</script>

{#if nodeDef}
	<NodeShell {id} icon={nodeDef.icon} label={nodeDef.label} variant={nodeDef.category}>
		{#each nodeDef.components as slot}
			{#if slot.signal.widget}
				{@const Widget = slot.signal.widget as AnyComponent}
				<Widget {id} {data} slotId={slot.id} />
			{/if}
		{/each}
	</NodeShell>

	{@const maxInputs = data._channelCount as number | undefined}
	{@const visibleInputs = maxInputs != null
		? nodeDef.inputs.slice(0, maxInputs)
		: nodeDef.inputs}
	{#each visibleInputs as port}
		<Handle type="target" position={Position.Left} id={port.id} />
	{/each}
	{#each nodeDef.outputs as port}
		<Handle type="source" position={Position.Right} id={port.id} />
	{/each}
{/if}
