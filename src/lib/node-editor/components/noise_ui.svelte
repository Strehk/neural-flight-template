<script lang="ts">
/**
 * Noise UI Widget — WaveBar + value display
 *
 * Reads `data.noise` for animation. Speed is driven externally.
 */
import { ValueDisplay, WaveBar } from "../controls";

interface Props {
	id: string;
	data: Record<string, unknown>;
	slotId: string;
}

const { data }: Props = $props();

const noise = $derived((data.noise as number) ?? 0.5);
</script>

<WaveBar value={noise} color="var(--accent)" />
<ValueDisplay value={noise} />
