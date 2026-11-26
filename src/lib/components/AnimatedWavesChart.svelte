<script>
	import LineChartWithLegend from "./LineChartWithLegend.svelte";
	import { getSeries } from "$lib/data/fertility-client.js";
	import { reducedMotion } from "$lib/reduced-motion.svelte.js";

	let {
		data = [],
		countries = [],
		countryNames = {},
		currentYear = 2023,
		scrollProgress = 0,
		title = "Lowest-low fertility came in waves",
		yMax = null
	} = $props();

	const motion = reducedMotion();
	const displayedYear = $derived(motion.current ? 2023 : currentYear);
	const chartData = $derived(
		getSeries(data, countries, 1980, 2023).map((record) => ({
			...record,
			label: countryNames[record.location] || record.location
		}))
	);
	const highlighted = $derived(
		chartData
			.filter((record) => record.year === displayedYear && record.tfr <= 1.3)
			.map((record) => record.location)
	);
	const coveredCountries = $derived(new Set(chartData.map((record) => record.location)));
	const missingNames = $derived(
		countries
			.filter((country) => !coveredCountries.has(country))
			.map((country) => countryNames[country] || country)
	);
</script>

<div class="waves-chart">
	<LineChartWithLegend
		data={chartData}
		{scrollProgress}
		{yMax}
		yTicks={[0, 2, 4, 6]}
		xTicks={3}
		{title}
		height={500}
		yAxisLabel="Births per woman"
		colors={["#206095"]}
		threshold={1.3}
		showLabels={false}
		showSymbols={false}
		{highlighted}
	/>
	<div class="counter">
		<strong>{highlighted.length}</strong>
		<span>countries in lowest-low fertility</span>
		<span class="year-label">in {displayedYear}</span>
		{#if missingNames.length}
			<span class="coverage-note">
				Data for {coveredCountries.size} of {countries.length} countries. Missing: {missingNames.join(
					", "
				)}.
			</span>
		{/if}
	</div>
</div>

<style>
	.waves-chart {
		position: relative;
		width: 100%;
	}

	.counter {
		position: absolute;
		top: 2.5rem;
		right: 0;
		width: 125px;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		color: #206095;
	}

	.counter strong {
		font-size: 4rem;
		line-height: 1;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.counter span {
		font-size: 0.875rem;
		line-height: 1.4;
	}

	.year-label {
		color: #707071;
	}

	.counter .coverage-note {
		margin-top: 0.5rem;
		font-size: 0.75rem;
		color: #707071;
	}
</style>
