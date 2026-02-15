<script lang="ts">
	/**
	 * ModulationPanel — Simplified modulation routing UI.
	 *
	 * Instead of a full SvelteFlow canvas, this uses a compact
	 * list-based UI where users add source nodes and connect
	 * them to @endpoint uniforms via dropdowns.
	 *
	 * Source → Endpoint mapping, with real-time value display.
	 */

	import type { ModulationBridge, ModulationSourceType } from "../modulation";
	import { SOURCE_TYPES } from "../modulation";
	import type { UniformDef } from "../types";

	interface Props {
		bridge: ModulationBridge | null;
		endpointUniforms: UniformDef[];
	}

	let { bridge, endpointUniforms }: Props = $props();

	// ── Source nodes added by user ──

	interface SourceEntry {
		id: string;
		nodeId: string;
		type: string;
		label: string;
		connectedTo: string | null;
		outputPort: string;
	}

	let sources = $state<SourceEntry[]>([]);
	let collapsed = $state(false);

	// Output port names per source type
	const OUTPUT_PORTS: Record<string, string> = {
		lfo: "wave",
		envelope: "envelope",
		noise: "noise",
		spring: "position",
		multiply: "out",
	};

	function addSource(sourceType: ModulationSourceType): void {
		if (!bridge) return;
		const nodeId = bridge.addSource(sourceType.type);
		sources = [
			...sources,
			{
				id: `src_${Date.now()}`,
				nodeId,
				type: sourceType.type,
				label: sourceType.label,
				connectedTo: null,
				outputPort: OUTPUT_PORTS[sourceType.type] ?? "out",
			},
		];
	}

	function removeSource(entry: SourceEntry): void {
		if (!bridge) return;
		bridge.removeSource(entry.nodeId);
		sources = sources.filter((s) => s.id !== entry.id);
	}

	function connectSource(entry: SourceEntry, uniformName: string): void {
		if (!bridge) return;

		const endpointId = bridge.getEndpointNodeId(uniformName);
		if (!endpointId) return;

		// Disconnect previous if any
		// (Simple approach: remove and re-add the source)
		bridge.removeSource(entry.nodeId);
		const newNodeId = bridge.addSource(entry.type);
		bridge.connect(newNodeId, entry.outputPort, endpointId);

		// Update entry
		sources = sources.map((s) =>
			s.id === entry.id
				? { ...s, nodeId: newNodeId, connectedTo: uniformName }
				: s,
		);
	}

	function disconnectSource(entry: SourceEntry): void {
		if (!bridge) return;

		// Remove and re-add without connection
		bridge.removeSource(entry.nodeId);
		const newNodeId = bridge.addSource(entry.type);

		sources = sources.map((s) =>
			s.id === entry.id
				? { ...s, nodeId: newNodeId, connectedTo: null }
				: s,
		);
	}
</script>

<div class="sp-modulation-panel">
	<button
		class="sp-panel-header"
		onclick={() => (collapsed = !collapsed)}
		type="button"
	>
		<span>Modulation</span>
		<span class="sp-panel-toggle">{collapsed ? "+" : "-"}</span>
	</button>

	{#if !collapsed}
		<div class="sp-panel-content">
			<!-- Source Palette -->
			<div class="sp-source-palette">
				<span class="sp-palette-label">Add:</span>
				{#each SOURCE_TYPES as st}
					<button
						class="sp-add-btn"
						onclick={() => addSource(st)}
						type="button"
						disabled={!bridge}
					>
						{st.label}
					</button>
				{/each}
			</div>

			<!-- Active Sources -->
			{#if sources.length > 0}
				<div class="sp-sources-list">
					{#each sources as entry (entry.id)}
						<div class="sp-source-row">
							<span class="sp-source-type">{entry.label}</span>
							<span class="sp-arrow">→</span>

							{#if endpointUniforms.length > 0}
								<select
									class="sp-endpoint-select"
									value={entry.connectedTo ?? ""}
									onchange={(e) => {
										const val = (e.target as HTMLSelectElement).value;
										if (val) {
											connectSource(entry, val);
										} else {
											disconnectSource(entry);
										}
									}}
								>
									<option value="">Not connected</option>
									{#each endpointUniforms as u}
										<option value={u.name}>{u.label ?? u.name}</option>
									{/each}
								</select>
							{:else}
								<span class="sp-no-endpoints">No @endpoint uniforms</span>
							{/if}

							<button
								class="sp-remove-btn"
								onclick={() => removeSource(entry)}
								type="button"
								title="Remove"
							>
								x
							</button>
						</div>
					{/each}
				</div>
			{:else}
				<p class="sp-empty-hint">Add a source (LFO, Noise, etc.) to modulate shader uniforms.</p>
			{/if}

			<!-- Endpoints info -->
			{#if endpointUniforms.length > 0}
				<div class="sp-endpoints-info">
					<span class="sp-endpoints-label">Endpoints:</span>
					{#each endpointUniforms as u}
						<span class="sp-endpoint-tag">{u.label ?? u.name}</span>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
