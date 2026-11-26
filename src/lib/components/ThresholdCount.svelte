<script>
	/**
	 * ThresholdCount.svelte
	 *
	 * Stacked area chart showing annual count of countries below 1.3 fertility,
	 * with optional region breakdown.
	 *
	 * Props:
	 * - data: array of { year, count_all, count_table1 }
	 * - title: chart title
	 * - includeRegions: whether to show regional breakdown (future)
	 */

	let { data = [], title = "Countries Below 1.3", includeRegions = false } = $props();

	const margin = { top: 20, right: 20, bottom: 40, left: 60 };
	const width = 800;
	const height = 400;
	const plotWidth = width - margin.left - margin.right;
	const plotHeight = height - margin.top - margin.bottom;

	// Scale functions
	const minYear = $derived(Math.min(...data.map((d) => d.year)));
	const maxYear = $derived(Math.max(...data.map((d) => d.year)));
	const maxCount = $derived(Math.max(...data.map((d) => d.count_all || 0)) * 1.1);

	const xScale = (year) => ((year - minYear) / (maxYear - minYear)) * plotWidth;
	const yScale = (count) => plotHeight - (count / maxCount) * plotHeight;

	// Generate SVG path for area chart
	function getAreaPath() {
		const topPoints = data.map((d) => `${xScale(d.year)},${yScale(d.count_all)}`).join(" ");
		const bottomPoints = data
			.map((d) => `${xScale(d.year)},${plotHeight}`)
			.reverse()
			.join(" ");
		return `M${topPoints} L${bottomPoints} Z`;
	}
</script>

<div class="chart-container">
	<h3>{title}</h3>

	<svg {width} {height} role="img" aria-label={title}>
		<!-- Gridlines -->
		<g class="gridlines">
			{#each [0, 10, 20, 30, 34] as level}
				{@const y = yScale(level)}
				{#if y > 0}
					<line
						x1={margin.left}
						x2={width - margin.right}
						y1={margin.top + y}
						y2={margin.top + y}
						stroke="#eee"
						stroke-width="1"
					/>
					<text
						x={margin.left - 10}
						y={margin.top + y}
						text-anchor="end"
						dominant-baseline="middle"
						font-size="12"
						fill="#666"
					>
						{level}
					</text>
				{/if}
			{/each}
		</g>

		<!-- Area -->
		<g transform="translate({margin.left},{margin.top})">
			<path d={getAreaPath()} fill="#3498db" opacity="0.3" />

			<!-- Line -->
			<polyline
				points={data.map((d) => `${xScale(d.year)},${yScale(d.count_all)}`).join(" ")}
				fill="none"
				stroke="#3498db"
				stroke-width="2"
				stroke-linejoin="round"
			/>

			<!-- Data points -->
			{#each data as point}
				<circle
					cx={xScale(point.year)}
					cy={yScale(point.count_all)}
					r="3"
					fill="#3498db"
					opacity="0.7"
				/>
			{/each}
		</g>

		<!-- Axes -->
		<g transform="translate({margin.left},{margin.top + plotHeight})">
			<line x1="0" x2={plotWidth} y1="0" y2="0" stroke="#000" stroke-width="1" />
			{#each [0, 0.25, 0.5, 0.75, 1.0] as proportion}
				{@const year = Math.round(minYear + (maxYear - minYear) * proportion)}
				<line x1={xScale(year)} x2={xScale(year)} y1="0" y2="5" stroke="#000" />
				<text x={xScale(year)} y="20" text-anchor="middle" font-size="12">
					{year}
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
			Number of countries
		</text>
	</svg>

	<!-- Accessible data table -->
	<details>
		<summary>Data table</summary>
		<table>
			<thead>
				<tr>
					<th>Year</th>
					<th>Total Below 1.3</th>
					<th>Table 1 Members</th>
				</tr>
			</thead>
			<tbody>
				{#each data as record}
					<tr>
						<td>{record.year}</td>
						<td>{record.count_all}</td>
						<td>{record.count_table1}</td>
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
