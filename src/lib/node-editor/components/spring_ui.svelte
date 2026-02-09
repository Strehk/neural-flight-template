<script lang="ts">
/**
 * Spring UI Widget — position display
 *
 * Reads `data.position` for visual feedback.
 * Stiffness/Damping come from external node wiring.
 */
import { ValueDisplay, WaveBar } from "../controls";

interface Props {
	id: string;
	data: Record<string, unknown>;
	slotId: string;
}

const { data }: Props = $props();

const position = $derived((data.position as number) ?? 0.5);
</script>

<WaveBar value={position} color="var(--accent)" />
<ValueDisplay value={position} />
