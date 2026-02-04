<script lang="ts">
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
</script>

<main class="landing">
	<!-- Header -->
	<header class="header">
		<div class="logo">
			<span class="logo-icon">🛩️</span>
			<span class="logo-text">ICAROS VR Flight Sim</span>
		</div>
		<a
			href="https://github.com/dweigend/neural-flight"
			target="_blank"
			rel="noopener noreferrer"
			class="github-link"
		>
			Hardware Docs →
		</a>
	</header>

	<!-- Hero Section -->
	<section class="hero">
		<h1>Immersive VR Flight</h1>
		<p class="subtitle">Meta Quest + ICAROS fitness device + custom ESP32 sensor</p>
	</section>

	<!-- Architecture Diagram -->
	<section class="architecture">
		<h2 class="section-title">🕸️ Architecture</h2>
		<p class="architecture-motto">"The server sits in the center — like a spider in its web."</p>

		<pre class="code-block" aria-label="System architecture diagram showing server as central hub"><code
				>                    ┌─────────────┐
                    │             │
  ┌────────────────▶│   SERVER    │◀────────────────┐
  │                 │    (Hub)    │                 │
  │                 │             │                 │
  │                 └──────┬──────┘                 │
  │                        │                        │
  │           ┌────────────┼────────────┐           │
  │           │            │            │           │
  ▼           ▼            ▼            ▼           ▼
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│ ESP32 │ │ /gyro │ │  /vr  │ │/spect │ │/lights│
│Sensor │ │ Phone │ │ Quest │ │Monitor│ │DMX/Hue│
└───────┘ └───────┘ └───────┘ └───────┘ └───────┘
  INPUT     INPUT    OUTPUT    OUTPUT    OUTPUT</code
			></pre>

		<p class="diagram-caption">
			All data flows through the server. No direct client-to-client communication.
		</p>
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
		<div class="tech-list">
			<span class="tech-item">SvelteKit</span>
			<span class="tech-separator">•</span>
			<span class="tech-item">Bun</span>
			<span class="tech-separator">•</span>
			<span class="tech-item">Three.js</span>
			<span class="tech-separator">•</span>
			<span class="tech-item">WebXR</span>
			<span class="tech-separator">•</span>
			<span class="tech-item">ESP32</span>
			<span class="tech-separator">•</span>
			<span class="tech-item">BNO055 IMU</span>
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

<style>
	.landing {
		min-height: 100vh;
		max-width: 800px;
		margin: 0 auto;
		padding: 1rem;
	}

	/* Header */
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 0;
		border-bottom: 1px solid var(--border);
		margin-bottom: 2rem;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.logo-icon {
		font-size: 1.5rem;
	}

	.logo-text {
		font-family: var(--font-mono);
		font-weight: 700;
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.github-link {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--text-muted);
		text-decoration: none;
		border: 1px solid var(--border);
		padding: 0.5rem 1rem;
		transition:
			border-color 0.15s,
			color 0.15s;
	}

	.github-link:hover {
		border-color: var(--accent);
		color: var(--accent);
	}

	/* Hero */
	.hero {
		text-align: center;
		padding: 2rem 0 3rem;
	}

	.hero h1 {
		font-size: clamp(1.75rem, 5vw, 2.5rem);
		font-weight: 700;
		margin-bottom: 0.5rem;
	}

	.subtitle {
		color: var(--text-muted);
		font-size: 1rem;
	}

	/* Architecture */
	.architecture {
		margin-bottom: 3rem;
	}

	.architecture-motto {
		font-style: italic;
		color: var(--accent);
		margin-bottom: 1.5rem;
		text-align: center;
	}

	.architecture :global(.code-block) {
		margin-bottom: 1rem;
	}

	/* Responsive font size for diagram */
	.architecture :global(code) {
		font-size: clamp(0.5rem, 2vw, 0.75rem);
	}

	.diagram-caption {
		font-size: 0.875rem;
		color: var(--text-muted);
		text-align: center;
	}

	/* Routes Grid */
	.routes {
		margin-bottom: 3rem;
	}

	.routes-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1rem;
	}

	.route-card {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1rem;
		background: var(--surface);
		border: 1px solid var(--border);
		text-decoration: none;
		color: var(--text);
		transition:
			border-color 0.15s,
			box-shadow 0.15s;
	}

	.route-card:hover {
		border-color: var(--accent);
		box-shadow: 2px 2px 0 var(--accent);
	}

	.route-card--planned {
		opacity: 0.6;
		cursor: default;
	}

	.route-card--planned:hover {
		border-color: var(--border);
		box-shadow: none;
	}

	.route-icon {
		font-size: 1.5rem;
		flex-shrink: 0;
	}

	.route-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.route-path {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--accent);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.route-title {
		font-weight: 500;
		font-size: 0.9375rem;
	}

	.route-description {
		font-size: 0.8125rem;
		color: var(--text-muted);
	}

	/* Tech Stack */
	.tech {
		margin-bottom: 3rem;
	}

	.tech-list {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.5rem 1rem;
		font-family: var(--font-mono);
		font-size: 0.875rem;
	}

	.tech-item {
		color: var(--text);
	}

	.tech-separator {
		color: var(--border);
	}

	/* Footer */
	.footer {
		border-top: 1px solid var(--border);
		padding: 1.5rem 0;
		text-align: center;
	}

	.footer p {
		font-size: 0.875rem;
		color: var(--text-muted);
	}

	.footer a {
		color: var(--accent);
		text-decoration: none;
	}

	.footer a:hover {
		text-decoration: underline;
	}

	/* Mobile Adjustments */
	@media (max-width: 480px) {
		.header {
			flex-direction: column;
			gap: 1rem;
			text-align: center;
		}

		:global(.code-block) {
			padding: 1rem 0.5rem;
		}
	}
</style>
