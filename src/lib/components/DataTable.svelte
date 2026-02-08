<script lang="ts">
interface TableItem {
	name: string;
	description: string;
	url?: string;
}

interface Props {
	items: TableItem[];
	headers?: [string, string];
}

const { items, headers = ["Tech", "Description"] }: Props = $props();
</script>

<div class="data-table-wrapper">
	<table class="data-table">
		<thead>
			<tr>
				<th>{headers[0]}</th>
				<th>{headers[1]}</th>
			</tr>
		</thead>
		<tbody>
			{#each items as item}
				<tr>
					<td>
						{#if item.url}
							<a href={item.url} target="_blank" rel="noopener noreferrer">{item.name}</a>
						{:else}
							{item.name}
						{/if}
					</td>
					<td>{item.description}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.data-table-wrapper {
		overflow-x: auto;
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		font-family: var(--font-mono);
		font-size: 0.8125rem;
	}

	.data-table th,
	.data-table td {
		padding: 0.75rem 1rem;
		text-align: left;
		border-bottom: 1px solid var(--border);
	}

	.data-table th {
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
		background: var(--surface);
	}

	.data-table td:first-child {
		white-space: nowrap;
	}

	.data-table a {
		color: var(--accent);
		text-decoration: none;
	}

	.data-table a:hover {
		text-decoration: underline;
	}

	.data-table td:last-child {
		color: var(--text-muted);
	}

	@media (max-width: 480px) {
		.data-table th,
		.data-table td {
			padding: 0.5rem;
		}
	}
</style>
