<script lang="ts">
	import {
		Plane,
		Glasses,
		Smartphone,
		Gamepad2,
		Eye,
		Network,
		MapPin,
		Wrench,
		BookOpen,
	} from 'lucide-svelte';
	import ArchitectureDiagram from '$lib/components/ArchitectureDiagram.svelte';
	import DataTable from '$lib/components/DataTable.svelte';
	import LinkCard from '$lib/components/LinkCard.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';

	// Route definitions
	const routes = [
		{
			path: '/vr',
			icon: Glasses,
			title: 'VR Flight Scene',
			description: 'WebXR experience for Meta Quest',
			planned: false,
		},
		{
			path: '/gyro',
			icon: Smartphone,
			title: 'Smartphone Gyro',
			description: 'Device Orientation API input',
			planned: false,
		},
		{
			path: '/controller',
			icon: Gamepad2,
			title: 'Desktop Controller',
			description: 'Manual pitch/roll input',
			planned: false,
		},
		{
			path: '/spectator',
			icon: Eye,
			title: 'Spectator Monitor',
			description: 'External display for viewers',
			planned: true,
		},
	];

	// Tech stack
	const techStack = [
		{ name: 'SvelteKit', description: 'Full-stack web framework', url: 'https://svelte.dev' },
		{ name: 'Bun', description: 'JavaScript runtime', url: 'https://bun.sh' },
		{ name: 'Three.js', description: '3D graphics library', url: 'https://threejs.org' },
		{ name: 'WebXR', description: 'VR/AR browser API', url: 'https://immersiveweb.dev' },
		{ name: 'bits-ui', description: 'Svelte UI components', url: 'https://bits-ui.com' },
		{ name: 'ESP32', description: 'Microcontroller', url: 'https://espressif.com' },
		{ name: 'BNO055', description: '9-DOF IMU sensor', url: 'https://www.adafruit.com/product/2472' },
	];
</script>

<main class="landing">
	<PageHeader icon={Plane} label="ICAROS VR Flight Sim" />

	<section class="intro">
		<p>
			VR flight simulation for Meta Quest, controlled by body movement on an ICAROS fitness device.
			Pitch and roll translate directly into flight controls via WebSocket.
		</p>
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
		<h2 class="section-title"><Wrench size={14} /> Tech Stack</h2>
		<DataTable items={techStack} />
	</section>

	<footer class="footer">
		<p>
			<BookOpen size={14} style="display: inline; vertical-align: middle;" />
			See <a href="https://github.com/dweigend/neural-flight" target="_blank" rel="noopener noreferrer">
				neural-flight
			</a> for hardware specs & protocol documentation
		</p>
	</footer>
</main>
