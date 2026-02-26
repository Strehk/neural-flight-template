<script lang="ts">
/**
 * ShaderSwitch — bits-ui Switch wrapper for boolean uniforms.
 */
import { Switch } from "bits-ui";

interface Props {
	checked: boolean;
	label?: string;
	onchange: (checked: boolean) => void;
}

const { checked, label, onchange }: Props = $props();
</script>

<label class="sp-switch-row">
	<Switch.Root
		{checked}
		onCheckedChange={onchange}
		class="switch-root"
	>
		<Switch.Thumb class="switch-thumb" />
	</Switch.Root>
	<span class="sp-switch-label">{label ?? (checked ? "ON" : "OFF")}</span>
</label>

