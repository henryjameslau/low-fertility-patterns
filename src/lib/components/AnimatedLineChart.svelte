<script>
	import { fade, fly } from "svelte/transition";
	import { quintOut } from "svelte/easing";
	import { LineChart } from "@onsvisual/svelte-charts";

	/**
	 * AnimatedLineChart - Wrapper around ONS LineChart with transitions
	 * @type {{ data: any[], countries: string[], countryNames: Record<string, string>, title: string }}
	 */
	let { data = [], countries = [], countryNames = {}, title = "" } = $props();

	// Transform data for LineChart
	let chartData = $derived.by(() => {
		if (!data || data.length === 0) return [];

		// Group by country and prepare for LineChart format
		const groups = {};
		data.forEach((d) => {
			if (countries.includes(d.location)) {
				if (!groups[d.location]) groups[d.location] = [];
				groups[d.location].push({ year: d.year, tfr: d.tfr });
			}
		});

		// Convert to array of series for LineChart
		return Object.entries(groups).map(([country, points]) => ({
			key: country,
			values: points
		}));
	});

	// Prepare flattened data for LineChart
	let flatData = $derived.by(() => {
		const result = [];
		chartData.forEach((series) => {
			series.values.forEach((point) => {
				result.push({
					location: series.key,
					year: point.year,
					tfr: point.tfr,
					label: countryNames[series.key] || series.key
				});
			});
		});
		return result;
	});
</script>

<div class="chart-wrapper" in:fade={{ duration: 600 }}>
	{#if title}
		<h3 in:fly={{ y: 20, duration: 500 }}>{title}</h3>
	{/if}

	{#if flatData.length > 0}
		<div in:fly={{ y: 20, duration: 500, delay: 100 }} class="chart-container">
			<LineChart
				data={flatData}
				height={400}
				xKey="year"
				yKey="tfr"
				zKey="location"
				labelKey="label"
				animation={true}
				duration={600}
				yAxisLabel="Total Fertility Rate"
				xAxisLabel="Year"
			/>
		</div>
	{/if}

	<!-- Accessible data table -->
	<details class="data-table" in:fade={{ duration: 500, delay: 200 }}>
		<summary>View detailed data</summary>
		<table>
			<thead>
				<tr>
					<th>Country</th>
					<th>Year</th>
					<th>TFR</th>
				</tr>
			</thead>
			<tbody>
				{#each flatData.sort((a, b) => a.label.localeCompare(b.label) || a.year - b.year) as row}
					<tr>
						<td>{row.label}</td>
						<td>{row.year}</td>
						<td>{row.tfr.toFixed(2)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</details>
</div>

<style>
	.chart-wrapper {
		margin: 2rem 0;
		padding: 1.5rem;
		background: #f9f9f9;
		border: 1px solid #e0e0e0;
		border-radius: 4px;
	}

	h3 {
		margin: 0 0 1.5rem 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #333;
	}

	.chart-container {
		margin-bottom: 1.5rem;
		background: white;
		padding: 1rem;
		border-radius: 4px;
	}

	.data-table {
		cursor: pointer;
		margin-top: 1rem;
	}

	.data-table summary {
		padding: 0.75rem;
		background: #e8e8e8;
		border-radius: 4px;
		font-weight: 500;
		user-select: none;
		transition: background 0.2s;
	}

	.data-table summary:hover {
		background: #d8d8d8;
	}

	table {
		width: 100%;
		margin-top: 1rem;
		border-collapse: collapse;
		font-size: 0.9rem;
		background: white;
	}

	th,
	td {
		padding: 0.5rem;
		text-align: left;
		border-bottom: 1px solid #ddd;
	}

	th {
		background: #f5f5f5;
		font-weight: 600;
		color: #333;
	}

	tr:nth-child(even) {
		background: #fafafa;
	}

	@media (max-width: 768px) {
		.chart-wrapper {
			padding: 1rem;
			margin: 1rem 0;
		}

		h3 {
			font-size: 1.1rem;
			margin-bottom: 1rem;
		}

		.chart-container {
			padding: 0.5rem;
		}

		table {
			font-size: 0.8rem;
		}

		th,
		td {
			padding: 0.25rem 0.5rem;
		}
	}
</style>
