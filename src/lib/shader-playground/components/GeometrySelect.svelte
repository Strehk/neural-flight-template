<script lang="ts">
	import type { GeometryType } from "../types";

	interface Props {
		value: GeometryType;
		onchange: (type: GeometryType) => void;
	}

	let { value, onchange }: Props = $props();

	const geometries: { type: GeometryType; label: string }[] = [
		{ type: "plane", label: "Plane" },
		{ type: "sphere", label: "Sphere" },
		{ type: "cube", label: "Cube" },
		{ type: "torus", label: "Torus" },
		{ type: "cylinder", label: "Cylinder" },
	];

	function handleChange(e: Event): void {
		onchange((e.target as HTMLSelectElement).value as GeometryType);
	}
</script>

<select class="sp-geometry-select" {value} onchange={handleChange}>
	{#each geometries as g}
		<option value={g.type}>{g.label}</option>
	{/each}
</select>
