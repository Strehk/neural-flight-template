<script lang="ts">
import { ValueDisplay } from "../controls";

interface Props {
	id: string;
	data: Record<string, unknown>;
}

const { data }: Props = $props();
</script>

<div class="multiply-symbol">×</div>
<ValueDisplay value={data.out as number} />

<style>
	.multiply-symbol {
		text-align: center;
		font-size: 1.4rem;
		font-weight: bold;
		color: var(--text);
		line-height: 1;
	}
</style>
