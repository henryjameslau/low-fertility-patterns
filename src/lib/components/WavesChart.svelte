<script>
	/**
	 * WavesChart.svelte
	 *
	 * Shows how lowest-low fertility spread in waves across countries over time.
	 * Displays an animated line chart where countries below 1.3 threshold are
	 * highlighted, with an index showing how many countries are in lowest-low.
	 *
	 * Props:
	 * - data: array of { location, year, tfr } records for all countries
	 * - countries: array of ISO3 location IDs (Table 1 countries)
	 * - countryNames: object mapping ID to display name
	 * - currentYear: year to highlight/animate to (from scroller)
	 * - title: chart title
	 */

	import { getSeries } from "$lib/data/fertility-client.js";

	let {
		data = [],
		countries = [],
		countryNames = {},
		currentYear = 2023,
		title = "The Spread in Waves"
	} = $props();

	const margin = { top: 20, right: 20, bottom: 40, left: 60 };
	const width = 900;
	const height = 500;
	const plotWidth = width - margin.left - margin.right;
	const plotHeight = height - margin.top - margin.bottom;

	const THRESHOLD = 1.3;

	const filtered = $derived(getSeries(data, countries, 1980, 2023));

	// Scale functions
	const minYear = $derived(Math.min(...filtered.map((d) => d.year)));
	const maxYear = $derived(Math.max(...filtered.map((d) => d.year)));
	const minTfr = $derived(Math.min(...filtered.map((d) => d.tfr)));
	const maxTfr = $derived(Math.max(2.5, Math.max(...filtered.map((d) => d.tfr))));

	const xScale = (year) => ((year - minYear) / (maxYear - minYear)) * plotWidth;
	const yScale = (tfr) => plotHeight - ((tfr - minTfr) / (maxTfr - minTfr)) * plotHeight;

	// Color palette for countries
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
		"#17becf",
		"#1f77b4",
		"#ff7f0e",
		"#2ca02c",
		"#d62728",
		"#9467bd",
		"#8c564b",
		"#e377c2",
		"#7f7f7f",
		"#bcbd22",
		"#17becf",
		"#1f77b4",
		"#ff7f0e",
		"#2ca02c",
		"#d62728",
		"#9467bd",
		"#8c564b",
		"#e377c2",
		"#7f7f7f",
		"#bcbd22",
		"#17becf",
		"#1f77b4",
		"#ff7f0e",
		"#2ca02c",
		"#d62728"
	];

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

	// Find first year each country enters lowest-low
	const entryYears = $derived.by(() => {
		const entries = {};
		for (const country of countries) {
			const countryData = dataByCountry[country] || [];
			const sorted = countryData.sort((a, b) => a.year - b.year);
			for (const record of sorted) {
				if (record.tfr <= THRESHOLD) {
					entries[country] = record.year;
					break;
				}
			}
		}
		return entries;
	});

	// Count countries below threshold at each year
	const countriesBelowThreshold = $derived.by(() => {
		const counts = {};
		for (const year of [
			minYear,
			...Array.from({ length: maxYear - minYear }, (_, i) => minYear + i + 1)
		]) {
			let count = 0;
			for (const country of countries) {
				const countryData = dataByCountry[country] || [];
				const record = countryData.find((d) => d.year === year);
				if (record && record.tfr <= THRESHOLD) {
					count++;
				}
			}
			counts[year] = count;
		}
		return counts;
	});

	// Get current count for the displayed year
	let currentCount = $derived(countriesBelowThreshold[currentYear] || 0);

	// Determine which countries should be highlighted at current year
	const highlightedCountries = $derived.by(() => {
		const highlighted = new Set();
		for (const country of countries) {
			const countryData = dataByCountry[country] || [];
			const record = countryData.find((d) => d.year === currentYear);
			if (record && record.tfr <= THRESHOLD) {
				highlighted.add(country);
			}
		}
		return highlighted;
	});
</script>

<div class="chart-container">
	<div class="header-with-counter">
		<h3>{title}</h3>
		<div class="counter">
			<strong>{currentCount}</strong> countries in lowest-low fertility
			{#if currentYear}
				<span class="year-label">in {currentYear}</span>
			{/if}
		</div>
	</div>

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
				{@const isHighlighted = highlightedCountries.has(country)}
				{#if countryData.length > 0}
					<!-- Line -->
					<polyline
						points={countryData.map((d) => `${xScale(d.year)},${yScale(d.tfr)}`).join(" ")}
						fill="none"
						stroke={colorMap[country]}
						stroke-width={isHighlighted ? 3 : 1}
						stroke-linejoin="round"
						opacity={isHighlighted ? 1 : 0.3}
						class="country-line"
						data-country={country}
					/>

					<!-- Data points (only show for highlighted countries) -->
					{#if isHighlighted}
						{#each countryData as point}
							<circle
								cx={xScale(point.year)}
								cy={yScale(point.tfr)}
								r="2"
								fill={colorMap[country]}
								opacity="1"
							/>
						{/each}
					{/if}
				{/if}
			{/each}

			<!-- Threshold line at 1.3 -->
			<line
				x1="0"
				x2={plotWidth}
				y1={yScale(THRESHOLD)}
				y2={yScale(THRESHOLD)}
				stroke="#e74c3c"
				stroke-width="2"
				stroke-dasharray="5,5"
			/>
			<text
				x={plotWidth + 5}
				y={yScale(THRESHOLD)}
				dominant-baseline="middle"
				font-size="12"
				fill="#e74c3c"
				font-weight="bold"
			>
				Lowest-low (1.3)
			</text>

			<!-- Current year highlight line -->
			{#if currentYear}
				<line
					x1={xScale(currentYear)}
					x2={xScale(currentYear)}
					y1="0"
					y2={plotHeight}
					stroke="#95a5a6"
					stroke-width="2"
					stroke-dasharray="2,2"
					opacity="0.6"
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

	<!-- Highlighted countries list -->
	<div class="highlighted-info">
		<p>
			<strong>Highlighted ({currentCount}):</strong>
			{#if highlightedCountries.size > 0}
				{Array.from(highlightedCountries)
					.map((country) => countryNames[country] || country)
					.sort()
					.join(", ")}
			{:else}
				No countries below threshold
			{/if}
		</p>
	</div>

	<!-- Legend -->
	<div class="legend">
		<div class="legend-title">Countries by region</div>
		{#each countries as country}
			{@const isHighlighted = highlightedCountries.has(country)}
			<div class="legend-item" class:highlighted={isHighlighted}>
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
				{#each filtered.sort((a, b) => a.location.localeCompare(b.location) || a.year - b.year) as record}
					<tr class:below-threshold={record.tfr <= THRESHOLD}>
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

	.header-with-counter {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 1rem;
	}

	h3 {
		margin: 0;
	}

	.counter {
		font-size: 18px;
		font-weight: 600;
		color: #0084d1;
		display: flex;
		gap: 0.5rem;
		align-items: baseline;
	}

	.counter strong {
		font-size: 32px;
		color: #e74c3c;
	}

	.year-label {
		font-size: 14px;
		color: #666;
	}

	svg {
		border: 1px solid #ddd;
		background: #fff;
		width: 100%;
		max-width: 100%;
		height: auto;
	}

	.country-line {
		transition:
			stroke-width 0.3s ease,
			opacity 0.3s ease;
	}

	.highlighted-info {
		margin-top: 1rem;
		padding: 1rem;
		background: #f9f9f9;
		border-left: 4px solid #0084d1;
		border-radius: 4px;
	}

	.highlighted-info p {
		margin: 0;
		font-size: 14px;
		line-height: 1.6;
	}

	.legend {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 0.5rem;
		margin-top: 1.5rem;
		padding: 1rem;
		background: #f5f5f5;
		border-radius: 4px;
	}

	.legend-title {
		grid-column: 1 / -1;
		font-weight: 600;
		margin-bottom: 0.5rem;
		font-size: 14px;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 13px;
		opacity: 0.6;
		transition: opacity 0.3s ease;
	}

	.legend-item.highlighted {
		opacity: 1;
		font-weight: 600;
	}

	.legend-color {
		display: inline-block;
		width: 10px;
		height: 10px;
		border-radius: 2px;
	}

	details {
		margin-top: 1.5rem;
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

	tbody tr.below-threshold {
		background: #fffbf0;
		font-weight: 500;
	}

	@media (max-width: 768px) {
		.header-with-counter {
			flex-direction: column;
			gap: 1rem;
		}

		.legend {
			grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		}
	}
</style>
