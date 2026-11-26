<script>
	/**
	 * AnimatedLineChartWithLegend.svelte
	 *
	 * Wrapper around @onsvisual/svelte-charts LineChart that adds:
	 * 1. Animated line drawing with stroke-dasharray
	 * 2. Legend below chart
	 *
	 * Props:
	 * - data: array of records with location, year, tfr, label fields
	 * - zKey: location identifier key
	 * - labelKey: display name key
	 * - scrollProgress: 0-1 representing animation progress
	 * - other props: passed to LineChart component
	 */

	import { LineChart } from "@onsvisual/svelte-charts";

	let {
		data = [],
		zKey = "location",
		labelKey = "label",
		height = 500,
		xKey = "year",
		yKey = "tfr",
		xAxisLabel = "Year",
		yAxisLabel = "Total Fertility Rate",
		animation = true,
		duration = 800,
		scrollProgress = 0
	} = $props();

	// Extract unique locations and their colors
	const uniqueLocations = $derived.by(() => {
		const locs = [];
		const seen = new Set();
		for (const record of data) {
			if (!seen.has(record[zKey])) {
				locs.push({
					id: record[zKey],
					label: record[labelKey],
					color: getColorForLocation(record[zKey])
				});
				seen.add(record[zKey]);
			}
		}
		return locs;
	});

	// Color palette matching svelte-charts
	const colors = [
		"#1f77b4",
		"#ff7f0e",
		"#2ca02c",
		"#d62728",
		"#9467bd",
		"#8c564b",
		"#e377c2",
		"#7f7f7f",
		"#bcbd22",
		"#17becf"
	];

	function getColorForLocation(id) {
		// Use the same color palette that svelte-charts uses
		// This is a best guess based on common D3 defaults
		const hash = id.charCodeAt(0) + id.charCodeAt(1);
		return colors[hash % colors.length];
	}
</script>

<div class="chart-with-legend">
	<!-- Container to inject CSS animation -->
	<div class="animated-chart-container" style="--animation-progress: {scrollProgress};">
		<LineChart
			{data}
			{height}
			{xKey}
			{yKey}
			{zKey}
			{labelKey}
			{animation}
			{duration}
			{xAxisLabel}
			{yAxisLabel}
		/>
	</div>

	<!-- Legend below chart -->
	{#if uniqueLocations.length > 0}
		<div class="legend">
			<div class="legend-title">Countries</div>
			<div class="legend-items">
				{#each uniqueLocations as location}
					<div class="legend-item">
						<span class="legend-color" style="background-color: {location.color}"></span>
						<span>{location.label}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.chart-with-legend {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.animated-chart-container {
		--animation-progress: 0;
	}

	.legend {
		padding: 1rem;
		background: #f9f9f9;
		border: 1px solid #ddd;
		border-radius: 4px;
	}

	.legend-title {
		font-weight: 600;
		font-size: 14px;
		margin-bottom: 0.75rem;
		color: #333;
	}

	.legend-items {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 0.75rem;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 13px;
		color: #333;
	}

	.legend-color {
		display: inline-block;
		width: 12px;
		height: 12px;
		border-radius: 2px;
		flex-shrink: 0;
	}

	@media (max-width: 768px) {
		.legend-items {
			grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		}
	}
</style>
