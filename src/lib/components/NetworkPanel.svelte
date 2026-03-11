<script lang="ts">
import { Accordion } from "bits-ui";
import {
	ChevronDown,
	Glasses,
	Smartphone,
	Terminal,
	Wifi,
} from "lucide-svelte";
import QRCode from "qrcode";
import type { NetworkInfo, QrData } from "$lib/network/types.js";

interface Props {
	network: NetworkInfo;
	qr: QrData;
}

let { network, qr }: Props = $props();

const qrOptions: QRCode.QRCodeToDataURLOptions = {
	width: 120,
	margin: 1,
	color: { dark: "#ffffff", light: "#18181b" },
};

async function toDataUrl(value: string): Promise<string> {
	return QRCode.toDataURL(value, qrOptions) as Promise<string>;
}
</script>

<Accordion.Root type="multiple">
	<!-- ═══ QR Codes ═══ -->
	<Accordion.Item value="qr-codes" class="np-item">
		<Accordion.Header>
			<Accordion.Trigger class="np-trigger">
				<span class="np-trigger-label">
					<Smartphone size={14} />
					QR Codes
					<span class="np-badge">{network.ip}:{network.port}</span>
				</span>
				<ChevronDown size={14} class="np-chevron" />
			</Accordion.Trigger>
		</Accordion.Header>
		<Accordion.Content class="np-content">
			{#if network.hotspot}
				<div class="np-hotspot-hint">
					<Wifi size={12} />
					Connected to <strong>{network.hotspot.ssid}</strong>
				</div>
			{/if}

			<div class="qr-grid">
				{#if qr.wifi}
					<div class="qr-card">
						{#await toDataUrl(qr.wifi) then src}
							<img {src} alt="WiFi QR" width="120" height="120" />
						{/await}
						<span class="qr-label"><Wifi size={12} /> WiFi</span>
					</div>
				{/if}
				<div class="qr-card">
					{#await toDataUrl(qr.gyro) then src}
						<img {src} alt="Gyro QR" width="120" height="120" />
					{/await}
					<span class="qr-label"><Smartphone size={12} /> Gyro</span>
				</div>
				<div class="qr-card">
					{#await toDataUrl(qr.vr) then src}
						<img {src} alt="VR QR" width="120" height="120" />
					{/await}
					<span class="qr-label"><Glasses size={12} /> VR</span>
				</div>
			</div>
		</Accordion.Content>
	</Accordion.Item>

	<!-- ═══ Local Network Setup ═══ -->
	<Accordion.Item value="local-network" class="np-item">
		<Accordion.Header>
			<Accordion.Trigger class="np-trigger">
				<span class="np-trigger-label">
					<Wifi size={14} />
					Local Network Setup
				</span>
				<ChevronDown size={14} class="np-chevron" />
			</Accordion.Trigger>
		</Accordion.Header>
		<Accordion.Content class="np-content">
			<p class="np-intro">
				No external Wi-Fi needed — create a local hotspot on your laptop so students can connect
				phones and Quest headsets directly.
			</p>

			<div class="np-steps">
				<div class="np-step">
					<span class="np-step-number">1</span>
					<div class="np-step-body">
						<strong>Create config</strong>
						<code class="np-code">cp scripts/hotspot/hotspot.conf.example scripts/hotspot/hotspot.conf</code>
						<span class="np-hint">Edit SSID and password in the config file.</span>
					</div>
				</div>

				<div class="np-step">
					<span class="np-step-number">2</span>
					<div class="np-step-body">
						<strong>Generate HTTPS certificates</strong>
						<code class="np-code">bun run hotspot:setup</code>
						<span class="np-hint">Uses mkcert — required for WebXR on local networks.</span>
					</div>
				</div>

				<div class="np-step">
					<span class="np-step-number">3</span>
					<div class="np-step-body">
						<strong>Start hotspot</strong>
						<code class="np-code">bun run hotspot:start</code>
						<span class="np-hint">macOS: guided via System Settings. Linux: automatic via nmcli.</span>
					</div>
				</div>

				<div class="np-step">
					<span class="np-step-number">4</span>
					<div class="np-step-body">
						<strong>Start dev server & scan QR codes</strong>
						<code class="np-code">bun run dev</code>
						<span class="np-hint">WiFi QR code appears above once hotspot.conf exists.</span>
					</div>
				</div>
			</div>

			<div class="np-footer">
				<Terminal size={12} />
				<span>Full docs: <code>scripts/hotspot/README.md</code></span>
			</div>
		</Accordion.Content>
	</Accordion.Item>
</Accordion.Root>

<style>
	:global(.np-item) {
		border: 1px solid var(--border);
		border-radius: 8px;
		overflow: hidden;
	}

	:global(.np-item + .np-item) {
		margin-top: 0.5rem;
	}

	:global(.np-trigger) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 0.625rem 0.875rem;
		background: var(--surface);
		border: none;
		color: var(--text-muted);
		font-size: 0.8125rem;
		cursor: pointer;
		transition: color 0.15s ease;
	}

	:global(.np-trigger:hover) {
		color: var(--text);
	}

	.np-trigger-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.np-badge {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		color: var(--text-subtle);
		background: var(--surface-hover);
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
	}

	:global(.np-chevron) {
		transition: transform 0.2s ease;
	}

	:global([data-state="open"] > .np-chevron) {
		transform: rotate(180deg);
	}

	:global(.np-content) {
		padding: 1rem;
		background: var(--bg);
		border-top: 1px solid var(--border);
	}

	:global(.np-content[data-state="open"]) {
		animation: npSlideDown 200ms ease-out;
	}

	:global(.np-content[data-state="closed"]) {
		animation: npSlideUp 200ms ease-out;
	}

	@keyframes npSlideDown {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes npSlideUp {
		from {
			opacity: 1;
			transform: translateY(0);
		}
		to {
			opacity: 0;
			transform: translateY(-4px);
		}
	}

	/* ── QR section ── */

	.np-hotspot-hint {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		margin-bottom: 0.75rem;
		font-size: 0.75rem;
		color: var(--success);
	}

	.qr-grid {
		display: flex;
		gap: 1.5rem;
		flex-wrap: wrap;
	}

	.qr-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.qr-label {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	/* ── Local Network section ── */

	.np-intro {
		font-size: 0.8125rem;
		color: var(--text-muted);
		line-height: 1.5;
		margin: 0 0 1rem;
	}

	.np-steps {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.np-step {
		display: flex;
		gap: 0.75rem;
		align-items: flex-start;
	}

	.np-step-number {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 1.5rem;
		height: 1.5rem;
		border-radius: 50%;
		background: var(--surface-hover);
		color: var(--accent);
		font-size: 0.75rem;
		font-weight: 600;
	}

	.np-step-body {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.8125rem;
		color: var(--text);
	}

	.np-code {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--accent);
		background: var(--surface);
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		border: 1px solid var(--border-subtle);
		width: fit-content;
	}

	.np-hint {
		font-size: 0.6875rem;
		color: var(--text-subtle);
	}

	.np-footer {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		margin-top: 1rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--border-subtle);
		font-size: 0.6875rem;
		color: var(--text-subtle);
	}

	.np-footer code {
		color: var(--text-muted);
	}
</style>
