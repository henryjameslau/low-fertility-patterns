<script>
	let { index = 0, color = "#206095", x = 0, y = 0 } = $props();
</script>

<g
	class="endpoint-symbol"
	data-symbol={index % 4}
	transform="translate({x},{y})"
	fill={color}
	stroke="white"
	stroke-width="1"
>
	{#if index % 4 === 0}
		<circle r="4.5" />
	{:else if index % 4 === 1}
		<rect x="-4.5" y="-4.5" width="9" height="9" />
	{:else if index % 4 === 2}
		<path d="M0,-5.5 L5,4 L-5,4 Z" />
	{:else}
		<path d="M0,-6 L5,0 L0,6 L-5,0 Z" />
	{/if}
</g>
