<script lang="ts">
/**
 * GateButton Control — bits-ui Toggle with HIGH/LOW state
 */
import { Toggle } from "bits-ui";

interface Props {
	open: boolean;
	onclick: () => void;
}

const { open, onclick }: Props = $props();
</script>

<Toggle.Root
	pressed={open}
	onPressedChange={() => onclick()}
	class="gate-button nodrag"
>
	{open ? "HIGH" : "LOW"}
</Toggle.Root>
