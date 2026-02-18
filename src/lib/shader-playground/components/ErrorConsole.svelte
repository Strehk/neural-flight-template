<script lang="ts">
	import type { ShaderError } from "../types";
	import { ShaderButton } from "../controls/index";

	interface Props {
		errors: ShaderError[];
		onclick?: (line: number) => void;
	}

	let { errors, onclick }: Props = $props();

	let collapsed = $state(false);

	const hasErrors = $derived(errors.length > 0);
</script>

{#if hasErrors}
	<div class="sp-error-console" class:collapsed>
		<button
			class="sp-error-header"
			onclick={() => (collapsed = !collapsed)}
			type="button"
		>
			<span>{errors.length} error{errors.length !== 1 ? "s" : ""}</span>
			<span class="sp-error-toggle">{collapsed ? "+" : "-"}</span>
		</button>

		{#if !collapsed}
			<ul class="sp-error-list">
				{#each errors as error}
					<li>
						<ShaderButton
							variant="ghost"
							onclick={() => onclick?.(error.line)}
						>
							{#if error.source}
								<span class="sp-error-source">{error.source}</span>
							{/if}
							{#if error.line > 0}
								<span class="sp-error-line-num">:{error.line}</span>
							{/if}
							<span class="sp-error-msg">{error.message}</span>
						</ShaderButton>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
{/if}

<style>
	.sp-error-console {
		background: color-mix(in srgb, var(--error) 8%, var(--bg));
		border: 1px solid color-mix(in srgb, var(--error) 25%, transparent);
		border-radius: var(--radius-none);
		font-family: var(--font-mono);
		font-size: 0.75rem;
		overflow: hidden;
	}

	.sp-error-header {
		all: unset;
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		padding: var(--space-xs) var(--space-sm);
		cursor: pointer;
		color: var(--error);
		font-weight: 600;
		font-size: 0.75rem;
	}

	.sp-error-header:hover {
		background: color-mix(in srgb, var(--error) 12%, var(--bg));
	}

	.sp-error-toggle {
		opacity: 0.5;
	}

	.sp-error-list {
		list-style: none;
		padding: 0;
		margin: 0;
		max-height: 120px;
		overflow-y: auto;
	}

	.sp-error-list li {
		border-top: 1px solid color-mix(in srgb, var(--error) 15%, transparent);
	}

	.sp-error-source {
		color: var(--text-subtle);
		font-size: 0.6rem;
		font-weight: 600;
		text-transform: uppercase;
		opacity: 0.7;
	}

	.sp-error-line-num {
		color: var(--error);
		font-weight: 600;
		min-width: 2rem;
	}

	.sp-error-msg {
		color: var(--error-muted);
	}
</style>
