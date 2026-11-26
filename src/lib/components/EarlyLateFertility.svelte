<script>
	import LineChartWithLegend from "./LineChartWithLegend.svelte";
	import { calculateCohortEarlyLate } from "$lib/data/fertility-client.js";

	/**
	 * Scene 4: Early vs Late Fertility Comparison
	 *
	 * Visualizes calendar-year fertility timing differences across countries.
	 * Uses ASFR data to calculate:
	 * - Early fertility = ages 15-29
	 * - Late fertility = ages 30-49
	 *
	 * Props:
	 * - asfrData: Object mapping location ISO3 to {year: {age: rate}}
	 * - countries: Array of ISO3 country codes to display
	 * - countryNames: Object mapping ISO3 to display name
	 */

	let { asfrData = {}, countries = [], countryNames = {}, scrollProgress = null } = $props();
	let viewportWidth = $state(1440);
	const chartHeight = $derived(viewportWidth < 768 ? 240 : 400);

	// Sum each calendar year's age-specific rates, not birth-cohort rates.
	let earlyLateData = $derived.by(() => {
		const data = [];

		countries.forEach((iso3) => {
			if (!asfrData[iso3]) return;

			const countryASFR = asfrData[iso3];

			// For each calendar year with data
			Object.entries(countryASFR).forEach(([yearStr, ageMap]) => {
				const year = parseInt(yearStr);

				// Calculate early (15-29) and late (30-49) fertility
				const { early, late } = calculateCohortEarlyLate(ageMap);

				if (early !== null) {
					data.push({
						year,
						value: early,
						label: "Ages 15-29",
						location: iso3,
						type: "early"
					});
				}

				if (late !== null) {
					data.push({
						year,
						value: late,
						label: "Ages 30-49",
						location: iso3,
						type: "late"
					});
				}
			});
		});

		return data;
	});
	const yMax = $derived(
		Math.max(1, Math.ceil(Math.max(0, ...earlyLateData.map((record) => record.value)) * 2) / 2)
	);
</script>

<svelte:window bind:innerWidth={viewportWidth} />

<div class="chart-container">
	{#if earlyLateData.length > 0}
		<p class="facet-units">Births per woman</p>
		<div class="age-group-facets">
			{#each countries as iso3 (iso3)}
				{@const countryName = countryNames[iso3] || iso3}
				{@const countryData = earlyLateData.filter((record) => record.location === iso3)}
				<section class="country-facet" data-country={iso3} aria-labelledby={"age-facet-" + iso3}>
					<h3 id={"age-facet-" + iso3}>{countryName}</h3>
					{#if countryData.length}
						<LineChartWithLegend
							data={countryData}
							{scrollProgress}
							{yMax}
							xTicks={2}
							yTicks={5}
							height={chartHeight}
							xKey="year"
							yKey="value"
							zKey="type"
							labelKey="label"
							title={"Early and late fertility in " + countryName}
							trackLabels={true}
							colors={["#206095", "#A8BD3A"]}
							xAxisLabel="Calendar year"
							yAxisLabel=""
						/>
					{:else}
						<p class="no-data">No age-specific fertility data available for {countryName}.</p>
					{/if}
				</section>
			{/each}
		</div>
		<div class="chart-note">
			<p>
				<strong>Ages 15-29</strong> and <strong>ages 30-49</strong> show the sum of age-specific fertility
				rates within each age group.
			</p>
			<p>These are calendar-year rates, not completed birth-cohort fertility.</p>
		</div>
	{:else}
		<p class="no-data">No data available for selected countries.</p>
	{/if}
</div>

<style>
	.chart-container {
		width: 100%;
	}

	.age-group-facets {
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
		.age-group-facets {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
	}
</style>
