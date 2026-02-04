<script lang="ts">
	import ArchitectureDiagram from '$lib/components/ArchitectureDiagram.svelte';

	// Route definitions for the landing page
	const routes = [
		{
			path: '/vr',
			icon: '🥽',
			title: 'VR Flight Scene',
			description: 'WebXR experience for Meta Quest',
			status: 'active' as const,
		},
		{
			path: '/gyro',
			icon: '📱',
			title: 'Smartphone Gyro',
			description: 'Device Orientation API input',
			status: 'active' as const,
		},
		{
			path: '/controller',
			icon: '🎮',
			title: 'Desktop Controller',
			description: 'Manual pitch/roll input',
			status: 'active' as const,
		},
		{
			path: '/spectator',
			icon: '👀',
			title: 'Spectator Monitor',
			description: 'External display for viewers',
			status: 'planned' as const,
		},
	];

	// Tech stack with links and descriptions
	const techStack = [
		{
			name: 'SvelteKit',
			description: 'Full-stack web framework',
			url: 'https://svelte.dev',
		},
		{
			name: 'Bun',
			description: 'JavaScript runtime',
			url: 'https://bun.sh',
		},
		{
			name: 'Three.js',
			description: '3D graphics library',
			url: 'https://threejs.org',
		},
		{
			name: 'WebXR',
			description: 'VR/AR browser API',
			url: 'https://immersiveweb.dev',
		},
		{
			name: 'bits-ui',
			description: 'Svelte UI components',
			url: 'https://bits-ui.com',
		},
		{
			name: 'ESP32',
			description: 'Microcontroller',
			url: 'https://espressif.com',
		},
		{
			name: 'BNO055',
			description: '9-DOF IMU sensor',
			url: 'https://www.adafruit.com/product/2472',
		},
	];
</script>

<main class="landing">
	<!-- Header -->
	<header class="header">
		<div class="logo">
			<span class="logo-icon">🛩️</span>
			<span class="logo-text">ICAROS VR Flight Sim</span>
		</div>
	</header>

	<!-- Intro -->
	<section class="intro">
		<p>
			VR flight simulation for Meta Quest, controlled by body movement on an ICAROS fitness device.
			Pitch and roll translate directly into flight controls via WebSocket.
		</p>
	</section>

	<!-- Architecture Diagram -->
	<section class="architecture">
		<h2 class="section-title">🕸️ Architecture</h2>
		<ArchitectureDiagram />
		<p class="architecture-motto">"The server sits in the center — like a spider in its web."</p>
	</section>

	<!-- Routes Grid -->
	<section class="routes">
		<h2 class="section-title">📍 Routes</h2>
		<div class="routes-grid">
			{#each routes as route}
				{#if route.status === 'active'}
					<a href={route.path} class="route-card">
						<span class="route-icon">{route.icon}</span>
						<div class="route-info">
							<span class="route-path">{route.path}</span>
							<span class="route-title">{route.title}</span>
							<span class="route-description">{route.description}</span>
						</div>
					</a>
				{:else}
					<div class="route-card route-card--planned">
						<span class="route-icon">{route.icon}</span>
						<div class="route-info">
							<span class="route-path">
								{route.path}
								<span class="badge">planned</span>
							</span>
							<span class="route-title">{route.title}</span>
							<span class="route-description">{route.description}</span>
						</div>
					</div>
				{/if}
			{/each}
		</div>
	</section>

	<!-- Tech Stack -->
	<section class="tech">
		<h2 class="section-title">🔧 Tech Stack</h2>
		<div class="tech-table-wrapper">
			<table class="tech-table">
				<thead>
					<tr>
						<th>Tech</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
					{#each techStack as tech}
						<tr>
							<td>
								<a href={tech.url} target="_blank" rel="noopener noreferrer">{tech.name}</a>
							</td>
							<td>{tech.description}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<!-- Footer -->
	<footer class="footer">
		<p>
			📚 See <a
				href="https://github.com/dweigend/neural-flight"
				target="_blank"
				rel="noopener noreferrer">neural-flight</a
			> for hardware specs & protocol documentation
		</p>
	</footer>
</main>
