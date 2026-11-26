<script>
	/**
	 * FertilityTrend.svelte
	 *
	 * A simple line chart showing period total fertility rates over time
	 * for one or more countries, using SVG and D3 utilities.
	 *
	 * Props:
	 * - data: array of { location, year, tfr } records
	 * - countries: array of ISO3 location IDs to display
	 * - countryNames: object mapping ID to display name
	 * - yearRange: [minYear, maxYear]
	 * - title: chart title
	 * - highlightYear: optional year to mark
	 */

	import { getSeries } from "$lib/data/fertility-client.js";

	let {
		data = [],
		countries = [],
		countryNames = {},
		yearRange = [1980, 2023],
		title = "Fertility Rates",
		highlightYear = null
	} = $props();

	const margin = { top: 20, right: 20, bottom: 40, left: 60 };
	const width = 800;
	const height = 400;
	const plotWidth = width - margin.left - margin.right;
	const plotHeight = height - margin.top - margin.bottom;

	const filtered = $derived(getSeries(data, countries, yearRange[0], yearRange[1]));

	// Scale functions
	const minYear = $derived(Math.min(...filtered.map((d) => d.year)));
	const maxYear = $derived(Math.max(...filtered.map((d) => d.year)));
	const minTfr = $derived(Math.min(...filtered.map((d) => d.tfr)));
	const maxTfr = $derived(Math.max(2.5, Math.max(...filtered.map((d) => d.tfr)))); // at least 2.5

	const xScale = (year) => ((year - minYear) / (maxYear - minYear)) * plotWidth;
	const yScale = (tfr) => plotHeight - ((tfr - minTfr) / (maxTfr - minTfr)) * plotHeight;

	// Generate SVG path for each country
	function getPath(locationData) {
		const sorted = locationData.sort((a, b) => a.year - b.year);
		const points = sorted.map((d) => `${xScale(d.year)},${yScale(d.tfr)}`).join(" ");
		return `M${points}`;
	}

	// Color palette for countries
	const colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd"];
	const colorMap = $derived.by(() => {
		const map = {};
		countries.forEach((country, i) => {
			map[country] = colors[i % colors.length];
		});
		return map;
	});

	// Group data by country
	const dataByCountry = $derived.by(() => {
		const groups = {};
		for (const record of filtered) {
			if (!groups[record.location]) {
				groups[record.location] = [];
			}
			groups[record.location].push(record);
		}
		return groups;
	});
</script>

<div class="chart-container">
	<h3>{title}</h3>

	<svg {width} {height} role="img" aria-label={title}>
		<!-- Gridlines -->
		<g class="gridlines">
			{#each [0.5, 1.0, 1.5, 2.0, 2.5] as level}
				<line
					x1={margin.left}
					x2={width - margin.right}
					y1={margin.top + yScale(level)}
					y2={margin.top + yScale(level)}
					stroke="#eee"
					stroke-width="1"
				/>
				<text
					x={margin.left - 10}
					y={margin.top + yScale(level)}
					text-anchor="end"
					dominant-baseline="middle"
					font-size="12"
					fill="#666"
				>
					{level.toFixed(1)}
				</text>
			{/each}
		</g>

		<!-- Lines and points for each country -->
		<g transform="translate({margin.left},{margin.top})">
			{#each countries as country}
				{@const countryData = dataByCountry[country] || []}
				{@const path = getPath(countryData)}
				{#if countryData.length > 0}
					<!-- Line -->
					<polyline
						points={countryData.map((d) => `${xScale(d.year)},${yScale(d.tfr)}`).join(" ")}
						fill="none"
						stroke={colorMap[country]}
						stroke-width="2"
						stroke-linejoin="round"
					/>

					<!-- Data points -->
					{#each countryData as point}
						<circle
							cx={xScale(point.year)}
							cy={yScale(point.tfr)}
							r="3"
							fill={colorMap[country]}
							opacity="0.7"
						/>
					{/each}
				{/if}
			{/each}

			<!-- Threshold line at 1.3 -->
			<line
				x1="0"
				x2={plotWidth}
				y1={yScale(1.3)}
				y2={yScale(1.3)}
				stroke="#e74c3c"
				stroke-width="2"
				stroke-dasharray="5,5"
			/>
			<text
				x={plotWidth + 5}
				y={yScale(1.3)}
				dominant-baseline="middle"
				font-size="12"
				fill="#e74c3c"
				font-weight="bold"
			>
				Lowest-low (1.3)
			</text>

			<!-- Highlight year -->
			{#if highlightYear}
				<line
					x1={xScale(highlightYear)}
					x2={xScale(highlightYear)}
					y1="0"
					y2={plotHeight}
					stroke="#95a5a6"
					stroke-width="1"
					stroke-dasharray="3,3"
					opacity="0.5"
				/>
			{/if}
		</g>

		<!-- Axes -->
		<g transform="translate({margin.left},{margin.top + plotHeight})">
			<line x1="0" x2={plotWidth} y1="0" y2="0" stroke="#000" stroke-width="1" />
			{#each [0, 0.25, 0.5, 0.75, 1.0] as proportion}
				{@const year = minYear + (maxYear - minYear) * proportion}
				<line x1={xScale(year)} x2={xScale(year)} y1="0" y2="5" stroke="#000" />
				<text x={xScale(year)} y="20" text-anchor="middle" font-size="12">
					{Math.round(year)}
				</text>
			{/each}
		</g>

		<!-- Y-axis label -->
		<text
			x={-height / 2}
			y="15"
			text-anchor="middle"
			transform="rotate(-90)"
			font-size="12"
			fill="#666"
		>
			Births per woman
		</text>
	</svg>

	<!-- Legend -->
	<div class="legend">
		{#each countries as country}
			<div class="legend-item">
				<span class="legend-color" style="background-color: {colorMap[country]}"></span>
				<span>{countryNames[country] || country}</span>
			</div>
		{/each}
	</div>

	<!-- Accessible data table -->
	<details>
		<summary>Data table</summary>
		<table>
			<thead>
				<tr>
					<th>Country</th>
					<th>Year</th>
					<th>TFR</th>
				</tr>
			</thead>
			<tbody>
				{#each filtered as record}
					<tr>
						<td>{countryNames[record.location] || record.location}</td>
						<td>{record.year}</td>
						<td>{record.tfr.toFixed(2)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</details>
</div>

<style>
	.chart-container {
		margin: 2rem 0;
	}

	h3 {
		margin-top: 0;
	}

	svg {
		border: 1px solid #ddd;
		background: #fff;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		margin-top: 1rem;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 14px;
	}

	.legend-color {
		display: inline-block;
		width: 12px;
		height: 12px;
		border-radius: 2px;
	}

	details {
		margin-top: 1rem;
		border: 1px solid #ddd;
		padding: 0.5rem;
		border-radius: 4px;
	}

	summary {
		cursor: pointer;
		font-weight: 600;
		padding: 0.5rem;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		margin-top: 0.5rem;
		font-size: 12px;
	}

	th,
	td {
		padding: 0.25rem 0.5rem;
		text-align: left;
		border-bottom: 1px solid #ddd;
	}

	th {
		background: #f5f5f5;
		font-weight: 600;
	}
</style>
