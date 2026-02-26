<script lang="ts">
/**
 * ColorPicker — Native color input with label for vec3 color uniforms.
 */

interface Props {
	value: string;
	label?: string;
	onchange: (hex: string) => void;
}

const { value, label, onchange }: Props = $props();
</script>

<div class="sp-color-picker">
	<input
		type="color"
		{value}
		oninput={(e) => onchange((e.target as HTMLInputElement).value)}
	/>
	{#if label}
		<span class="sp-color-label">{label}</span>
	{/if}
	<span class="sp-color-hex">{value}</span>
</div>

