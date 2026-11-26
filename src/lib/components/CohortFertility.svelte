<script>
	import LineChartWithLegend from "./LineChartWithLegend.svelte";

	let { profiles = [], countries = [], countryNames = {}, scrollProgress = null } = $props();
	let viewportWidth = $state(1440);
	const chartHeight = $derived(viewportWidth < 768 ? 240 : 400);
	const chartData = $derived(
		profiles.map((record) => ({
			...record,
			ratePer1000: record.rate * 1000,
			label: `Born ${record.cohortYear}`
		}))
	);
	const yMax = $derived(
		Math.max(50, Math.ceil(Math.max(0, ...chartData.map((record) => record.ratePer1000)) / 50) * 50)
	);
</script>

<svelte:window bind:innerWidth={viewportWidth} />

<div class="chart-container">
	{#if chartData.length}
		<p class="facet-units">Age-specific fertility rate: births per 1,000 women at each age</p>
		<div class="cohort-age-facets">
			{#each countries as iso3 (iso3)}
				{@const countryName = countryNames[iso3] || iso3}
				{@const countryData = chartData.filter((record) => record.location === iso3)}
				<section class="country-facet" data-country={iso3} aria-labelledby={"cohort-facet-" + iso3}>
					<h3 id={"cohort-facet-" + iso3}>{countryName}</h3>
					{#if countryData.length}
						<LineChartWithLegend
							data={countryData}
							{scrollProgress}
							{yMax}
							xTicks={3}
							yTicks={5}
							height={chartHeight}
							xKey="age"
							yKey="ratePer1000"
							zKey="cohortYear"
							labelKey="label"
							title={"Age-specific fertility by birth cohort in " + countryName}
							trackLabels={true}
							cursorPrefix="Age "
							xAxisLabel="Age"
							yAxisLabel=""
						/>
					{:else}
						<p class="no-data">No complete cohort age profiles available for {countryName}.</p>
					{/if}
				</section>
			{/each}
		</div>
		<div class="chart-note">
			<p>
				<strong>Source: UN WPP 2024.</strong> Complete ages 15-49; no imputation. Calendar year = birth
				year + age. Divide the sum of the rates by 1,000 for births per woman over these ages.
			</p>
		</div>
	{:else}
		<p class="no-data">No complete cohort age profiles available for selected countries.</p>
	{/if}
</div>

<style>
	.chart-container {
		width: 100%;
	}

	.cohort-age-facets {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1.5rem;
	}

	.facet-units {
		margin: 0 0 0.75rem;
		font-size: 14px;
		color: #707071;
	}

	.country-facet {
		min-width: 0;
	}

	.country-facet h3 {
		margin: 0 0 0.5rem;
		font-size: 1.125rem;
		text-align: center;
	}

	.chart-note {
		margin-top: 12px;
		font-size: 13px;
		line-height: 1.4;
	}

	.chart-note p {
		margin: 4px 0;
	}

	.no-data {
		text-align: center;
		color: #666;
		font-size: 14px;
		padding: 40px 20px;
	}

	@media (max-width: 767px) {
		.cohort-age-facets {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
	}
</style>
