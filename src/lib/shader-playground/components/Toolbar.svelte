<script lang="ts">
	import type { GeometryType, ShaderTemplate } from "../types";
	import { TEMPLATES } from "../templates";

	interface Props {
		ontemplate: (template: ShaderTemplate) => void;
		onpreset: () => void;
		oncompile: () => void;
		onsave: () => void;
		onexport: () => void;
		onimport: () => void;
		onfullscreen: () => void;
		currentGeometry: GeometryType;
		ongeometry: (type: GeometryType) => void;
		snippetDrawerOpen: boolean;
		ontogglesidebar: () => void;
	}

	let {
		ontemplate,
		onpreset,
		oncompile,
		onsave,
		onexport,
		onimport,
		onfullscreen,
		currentGeometry,
		ongeometry,
		snippetDrawerOpen,
		ontogglesidebar,
	}: Props = $props();

	const geometries: GeometryType[] = [
		"plane",
		"sphere",
		"cube",
		"torus",
		"cylinder",
	];

	function handleTemplateChange(e: Event): void {
		const value = (e.target as HTMLSelectElement).value;
		const template = TEMPLATES.find((t) => t.id === value);
		if (template) ontemplate(template);
	}

	function handleGeometryChange(e: Event): void {
		const value = (e.target as HTMLSelectElement).value as GeometryType;
		ongeometry(value);
	}
</script>

<div class="sp-toolbar">
	<div class="sp-toolbar-group">
		<button
			class="sp-toolbar-btn"
			class:active={snippetDrawerOpen}
			onclick={ontogglesidebar}
			type="button"
			title="Snippets"
		>
			Snippets
		</button>

		<button class="sp-toolbar-btn" onclick={onpreset} type="button" title="Presets">
			Presets
		</button>

		<select class="sp-toolbar-select" onchange={handleTemplateChange}>
			<option value="" disabled selected>Template</option>
			{#each TEMPLATES as t}
				<option value={t.id}>{t.name}</option>
			{/each}
		</select>
	</div>

	<div class="sp-toolbar-group">
		<button class="sp-toolbar-btn primary" onclick={oncompile} type="button">
			Compile
		</button>
		<button class="sp-toolbar-btn" onclick={onsave} type="button">Save</button>
		<button class="sp-toolbar-btn" onclick={onexport} type="button">Export</button>
		<button class="sp-toolbar-btn" onclick={onimport} type="button">Import</button>
	</div>

	<div class="sp-toolbar-group">
		<select
			class="sp-toolbar-select"
			value={currentGeometry}
			onchange={handleGeometryChange}
		>
			{#each geometries as g}
				<option value={g}>{g}</option>
			{/each}
		</select>

		<button class="sp-toolbar-btn" onclick={onfullscreen} type="button" title="Fullscreen">
			FS
		</button>
	</div>
</div>
