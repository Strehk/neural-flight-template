<script lang="ts">
import { useSvelteFlow } from "@xyflow/svelte";
import { ColorPicker } from "../controls";

interface Props {
	id: string;
	data: Record<string, unknown>;
}

const { id, data }: Props = $props();
const { updateNodeData } = useSvelteFlow();
</script>

<div class="color-preview" style="background: {data.value};"></div>
<ColorPicker value={data.value as string} onchange={(v) => updateNodeData(id, { value: v })} />
<div class="port-labels">
	<span class="port-label" style="color: #e74c3c;">R</span>
	<span class="port-label" style="color: #2ecc71;">G</span>
	<span class="port-label" style="color: #3498db;">B</span>
</div>

<style>
	.color-preview {
		width: 100%;
		height: 20px;
		border: 1px solid var(--border);
	}

	.port-labels {
		display: flex;
		justify-content: space-around;
		font-size: 0.6rem;
		font-weight: 700;
	}

	.port-label {
		opacity: 0.8;
	}
</style>
