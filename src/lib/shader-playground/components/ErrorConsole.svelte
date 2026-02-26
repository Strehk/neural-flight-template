<script lang="ts">
import { ShaderButton } from "../controls/index";
import type { ShaderError } from "../types";

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

