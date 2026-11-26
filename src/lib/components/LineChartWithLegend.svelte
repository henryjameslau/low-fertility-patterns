<script>
	import { LineChart } from "@onsvisual/svelte-charts";
	import LineEndpoints from "./LineEndpoints.svelte";
	import { reducedMotion } from "$lib/reduced-motion.svelte.js";

	// Legacy types omit SVG snippet props and the explicit tick arrays supported by AxisY.
	const Chart = /** @type {import("svelte").ComponentType<import("svelte").SvelteComponent<
		Omit<import("svelte").ComponentProps<typeof LineChart>, "yTicks"> &
		{ svg?: import("svelte").Snippet, yTicks?: number | number[] }
	>>} */ (LineChart);

	let {
		data = [],
		zKey = "location",
		labelKey = "label",
		height = 500,
		xKey = "year",
		yKey = "tfr",
		xAxisLabel = "Year",
		yAxisLabel = "Total Fertility Rate",
		title = "Fertility rates by country",
		animation = true,
		duration = 800,
		scrollProgress = null,
		yMax = null,
		xTicks = 4,
		yTicks = /** @type {number | number[]} */ (4),
		trackLabels = false,
		cursorPrefix = "",
		threshold = null,
		colors = ["#206095", "#A8BD3A", "#003C57", "#27A0CC"],
		showLabels = true,
		showSymbols = true,
		highlighted = null
	} = $props();

	const motion = reducedMotion();
	const revealProgress = $derived(
		motion.current || scrollProgress === null ? 1 : Math.max(0, Math.min(1, scrollProgress))
	);
	const series = $derived([...new Set(data.map((record) => record[zKey]))]);
	const sortedData = $derived([...data].sort((a, b) => a[xKey] - b[xKey]));
</script>

<div class="direct-label-chart">
	{#key series.join("|")}
		<Chart
			data={sortedData}
			{height}
			{xKey}
			{yKey}
			{zKey}
			{labelKey}
			animation={animation && !motion.current}
			{duration}
			{xAxisLabel}
			{yAxisLabel}
			{colors}
			{yMax}
			{xTicks}
			{yTicks}
			line={false}
			zDomain={series}
			xFormatTickString="d"
			xForceTicks={false}
			yTrimGridlinesRight={true}
			padding={{ top: 35, bottom: 63, left: 35, right: 135 }}
			alt={title}
			table={true}
		>
			{#snippet svg()}
				<LineEndpoints
					{revealProgress}
					{trackLabels}
					{cursorPrefix}
					{threshold}
					{showLabels}
					{showSymbols}
					{highlighted}
					showCursor={scrollProgress !== null && !motion.current}
				/>
			{/snippet}
		</Chart>
	{/key}
</div>

<style>
	.direct-label-chart {
		width: 100%;
	}
</style>
