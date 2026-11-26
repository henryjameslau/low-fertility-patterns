<script>
	import "@onsvisual/svelte-components/css/main.css";
	import "maplibre-gl/dist/maplibre-gl.css";
	import "../app.css";
	import { page } from "$app/state";
	import { asset } from "$app/paths";

	let { children } = $props();
</script>

<svelte:head>
	<title>{page.data?.pageTitle || ""}</title>
	<link rel="icon" type="image/x-icon" href={asset("/favicon.ico")} />
	<meta property="og:title" content={page.data?.pageTitle || ""} />
	<meta property="og:type" content="website" />
	<meta property="og:description" content={page.data?.pageDescription || ""} />
	<meta name="description" content={page.data?.pageDescription || ""} />
	{#if page.data?.canonicalUrl}
		<link rel="canonical" href={page.data.canonicalUrl} />
		<meta property="og:url" content={page.data.canonicalUrl} />
	{/if}
</svelte:head>

{@render children()}
