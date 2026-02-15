<script lang="ts">
	import type { UniformDef } from "../types";

	interface Props {
		uniforms: UniformDef[];
		onchange: (name: string, value: number | number[] | boolean) => void;
	}

	let { uniforms, onchange }: Props = $props();

	// Local values tracked per uniform name
	let values = $state<Record<string, number | number[] | boolean>>({});

	// Initialize values from uniform defaults
	$effect(() => {
		for (const u of uniforms) {
			if (!(u.name in values)) {
				values[u.name] = u.value;
			}
		}
	});

	function handleFloat(name: string, val: number): void {
		values[name] = val;
		onchange(name, val);
	}

	function handleVecComponent(
		name: string,
		index: number,
		val: number,
	): void {
		const current = (values[name] as number[]) ?? [0, 0, 0, 0];
		const updated = [...current];
		updated[index] = val;
		values[name] = updated;
		onchange(name, updated);
	}

	function handleColor(name: string, hex: string): void {
		const r = Number.parseInt(hex.substring(1, 3), 16) / 255;
		const g = Number.parseInt(hex.substring(3, 5), 16) / 255;
		const b = Number.parseInt(hex.substring(5, 7), 16) / 255;
		const vec = [r, g, b];
		values[name] = vec;
		onchange(name, vec);
	}

	function handleBool(name: string, checked: boolean): void {
		values[name] = checked;
		onchange(name, checked);
	}

	function vecToHex(v: number[]): string {
		const r = Math.round((v[0] ?? 0) * 255)
			.toString(16)
			.padStart(2, "0");
		const g = Math.round((v[1] ?? 0) * 255)
			.toString(16)
			.padStart(2, "0");
		const b = Math.round((v[2] ?? 0) * 255)
			.toString(16)
			.padStart(2, "0");
		return `#${r}${g}${b}`;
	}

	function formatValue(v: number): string {
		return v.toFixed(2);
	}

	const vecLabels = ["x", "y", "z", "w"];
</script>

{#if uniforms.length > 0}
	<div class="sp-uniform-panel">
		<div class="sp-uniform-title">Uniforms</div>
		{#each uniforms as u (u.name)}
			<div class="sp-uniform-row">
				<div class="sp-uniform-header">
					{#if u.endpoint}
						<span class="sp-endpoint-dot" title="Node-Editor Endpoint"></span>
					{/if}
					<span class="sp-uniform-name">{u.label ?? u.name}</span>
					<span class="sp-uniform-type">{u.type}</span>
				</div>

				{#if u.type === "bool"}
					<label class="sp-bool-control">
						<input
							type="checkbox"
							checked={values[u.name] === true}
							onchange={(e) =>
								handleBool(
									u.name,
									(e.target as HTMLInputElement).checked,
								)}
						/>
						<span>{values[u.name] ? "ON" : "OFF"}</span>
					</label>
				{:else if u.type === "float" || u.type === "int"}
					<div class="sp-slider-row">
						<input
							type="range"
							min={u.min ?? 0}
							max={u.max ?? 1}
							step={u.type === "int" ? 1 : (u.step ?? 0.01)}
							value={typeof values[u.name] === "number" ? values[u.name] : u.value}
							oninput={(e) =>
								handleFloat(
									u.name,
									Number.parseFloat(
										(e.target as HTMLInputElement).value,
									),
								)}
						/>
						<span class="sp-value-display">
							{formatValue(
								typeof values[u.name] === "number"
									? (values[u.name] as number)
									: (u.value as number),
							)}
						</span>
					</div>
				{:else if u.color && u.type === "vec3"}
					<div class="sp-color-row">
						<input
							type="color"
							value={vecToHex(
								(values[u.name] as number[]) ??
									(u.value as number[]),
							)}
							oninput={(e) =>
								handleColor(
									u.name,
									(e.target as HTMLInputElement).value,
								)}
						/>
						<span class="sp-value-display">
							{vecToHex(
								(values[u.name] as number[]) ??
									(u.value as number[]),
							)}
						</span>
					</div>
				{:else if u.type === "vec2" || u.type === "vec3" || u.type === "vec4"}
					{@const components =
						u.type === "vec2" ? 2 : u.type === "vec3" ? 3 : 4}
					{#each Array.from({ length: components }, (_, i) => i) as i}
						<div class="sp-slider-row sp-vec-slider">
							<span class="sp-vec-label">{vecLabels[i]}</span>
							<input
								type="range"
								min={u.min ?? 0}
								max={u.max ?? 1}
								step={u.step ?? 0.01}
								value={((values[u.name] as number[]) ??
									(u.value as number[]))[i]}
								oninput={(e) =>
									handleVecComponent(
										u.name,
										i,
										Number.parseFloat(
											(e.target as HTMLInputElement)
												.value,
										),
									)}
							/>
							<span class="sp-value-display">
								{formatValue(
									((values[u.name] as number[]) ??
										(u.value as number[]))[i],
								)}
							</span>
						</div>
					{/each}
				{/if}
			</div>
		{/each}
	</div>
{/if}
