<script lang="ts">
import "../app.css";
import favicon from "$lib/assets/favicon.svg";
import DevConsole from "$lib/dev-console/DevConsole.svelte";

const { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<DevConsole />
