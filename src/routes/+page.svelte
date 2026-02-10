<script lang="ts">
import {
	BookOpen,
	Eye,
	Gamepad2,
	Glasses,
	MapPin,
	Mountain,
	Network,
	Plane,
	Play,
	Smartphone,
	Workflow,
	Wrench,
} from "lucide-svelte";
import { onDestroy } from "svelte";
import { goto } from "$app/navigation";
import ArchitectureDiagram from "$lib/components/ArchitectureDiagram.svelte";
import DataTable from "$lib/components/DataTable.svelte";
import LinkCard from "$lib/components/LinkCard.svelte";
import NodeEditorPreview from "$lib/components/NodeEditorPreview.svelte";
import PageHeader from "$lib/components/PageHeader.svelte";
import { listExperiences } from "$lib/experiences/catalog";
import { setActiveExperienceId } from "$lib/experiences/loader";
import { createWebSocketClient } from "$lib/ws/client.svelte";

const ws = createWebSocketClient();

onDestroy(() => {
	ws.disconnect();
});

// Experience catalog — from registry
const experiences = listExperiences();

function launchExperience(id: string): void {
	setActiveExperienceId(id);
	goto("/vr");
}

// Route definitions
const routes = [
	{
		path: "/vr",
		icon: Glasses,
		title: "VR Experience",
		description: "WebXR experience for Meta Quest",
		planned: false,
	},
	{
		path: "/gyro",
		icon: Smartphone,
		title: "Smartphone Gyro",
		description: "Device Orientation API input",
		planned: false,
	},
	{
		path: "/controller",
		icon: Gamepad2,
		title: "Desktop Controller",
		description: "Manual pitch/roll input",
		planned: false,
	},
	{
		path: "/spectator",
		icon: Eye,
		title: "Spectator Monitor",
		description: "External display for viewers",
		planned: true,
	},
	{
		path: "/node-editor",
		icon: Workflow,
		title: "Node Editor",
		description: "Visual programming for VR scene",
		planned: false,
	},
];

// Tech stack
const techStack = [
	{
		name: "SvelteKit",
		description: "Full-stack web framework",
		url: "https://svelte.dev",
	},
	{ name: "Bun", description: "JavaScript runtime", url: "https://bun.sh" },
	{
		name: "Three.js",
		description: "3D graphics library",
		url: "https://threejs.org",
	},
	{
		name: "WebXR",
		description: "VR/AR browser API",
		url: "https://immersiveweb.dev",
	},
	{
		name: "bits-ui",
		description: "Svelte UI components",
		url: "https://bits-ui.com",
	},
	{
		name: "ESP32",
		description: "Microcontroller",
		url: "https://espressif.com",
	},
	{
		name: "BNO055",
		description: "9-DOF IMU sensor",
		url: "https://www.adafruit.com/product/2472",
	},
];
</script>

<div class="landing-page">
	<PageHeader icon={Plane} label="ICAROS VR Platform" status={ws.status} />

	<main class="landing-main">
		<section class="intro">
			<p>
				VR teaching platform for Meta Quest, controlled by body movement on an ICAROS fitness device.
				Students build their own VR experiences — pitch and roll translate directly into controls via WebSocket.
			</p>
		</section>

		<!-- ═══ Experience Catalog ═══ -->
		<section class="section">
			<h2 class="section-title"><Mountain size={14} /> Experiences</h2>
			<div class="experience-grid">
				{#each experiences as exp}
					<button
						class="experience-card"
						onclick={() => launchExperience(exp.id)}
						type="button"
					>
						<div class="experience-card-header">
							<Play size={16} />
							<span class="experience-card-name">{exp.name}</span>
						</div>
						<span class="experience-card-description">{exp.description}</span>
						<div class="experience-card-meta">
							<span>{exp.author}</span>
							<span>v{exp.version}</span>
							<span>{exp.parameters.length} params</span>
						</div>
					</button>
				{/each}
			</div>
		</section>

		<section class="section">
			<h2 class="section-title"><Network size={14} /> Architecture</h2>
			<ArchitectureDiagram />
			<p class="architecture-motto">"The server sits in the center — like a spider in its web."</p>
		</section>

		<section class="section">
			<h2 class="section-title"><MapPin size={14} /> Routes</h2>
			<div class="routes-grid">
				{#each routes as route}
					<LinkCard
						href={route.path}
						icon={route.icon}
						path={route.path}
						title={route.title}
						description={route.description}
						planned={route.planned}
					/>
				{/each}
			</div>
		</section>

		<section class="section">
			<h2 class="section-title"><Workflow size={14} /> Node Editor</h2>
			<p class="section-intro">
				Visual programming for real-time VR scene control. Connect LFOs, remaps, and output nodes
				to animate fog, sun, terrain, and more.
			</p>
			<NodeEditorPreview />
		</section>

		<section class="section">
			<h2 class="section-title"><Wrench size={14} /> Tech Stack</h2>
			<DataTable items={techStack} />
		</section>
	</main>
</div>
