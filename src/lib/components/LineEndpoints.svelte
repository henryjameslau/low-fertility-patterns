<script>
	import { getContext } from "svelte";
	import EndpointSymbol from "./EndpointSymbol.svelte";
	import { spreadEndpointLabels } from "$lib/data/chart-labels.js";
	import { lineReveal } from "$lib/data/line-reveal.js";

	let {
		revealProgress = 1,
		showCursor = false,
		trackLabels = false,
		cursorPrefix = "",
		showCursorLabel = true,
		cursorAnnotationAtBottom = false,
		cursorAnnotation = /** @type {import("svelte").Snippet | null} */ (null),
		threshold = null,
		showLabels = true,
		showSymbols = true,
		highlighted = null
	} = $props();

	const { data, xScale, yScale, zGet, custom, width, height } = getContext("LayerCake");
	const coords = $custom.coords;
	const ends = $derived(
		($coords ?? []).map((group, index) => {
			const points = group.map((point) => ({ x: $xScale(point.x), y: $yScale(point.y) }));
			const tip = lineReveal(points, $width * revealProgress);
			return {
				index,
				id: $data[index][0][$custom.idKey],
				...tip,
				path: points.map((point, i) => `${i ? "L" : "M"}${point.x},${point.y}`).join(""),
				color: $zGet($data[index][0]),
				label: $data[index][0][$custom.labelKey],
				value: $yScale.invert(tip.y)
			};
		})
	);
	const stackValues = $derived(
		trackLabels && $width < 260 && ends.some((end) => end.label.length > 12)
	);
	const labelYs = $derived(
		spreadEndpointLabels(
			ends.map((end) => end.y),
			stackValues ? $height - 18 : $height,
			stackValues ? 38 : 20
		)
	);
	const labelsOpacity = $derived(Math.max(0, Math.min(1, (revealProgress - 0.85) / 0.15)));
	const currentYear = $derived.by(() => {
		const [start, end] = $xScale.domain();
		return Math.round(start + (end - start) * revealProgress);
	});
</script>

<g class="line-endpoints" data-progress={revealProgress}>
	{#if threshold !== null}
		<g class="threshold-annotation">
			<line
				x1="0"
				x2={$width}
				y1={$yScale(threshold)}
				y2={$yScale(threshold)}
				stroke="#707071"
				stroke-dasharray="2 4"
			/>
			<text x={showLabels ? 0 : $width + 12} y={$yScale(threshold) - 8}>
				{showLabels ? "Very low fertility" : "Lowest-low"}: {threshold}
			</text>
		</g>
	{/if}
	{#each ends as end, index}
		<path class="context-line" d={end.path} fill="none" stroke={end.color} opacity="0.12" />
		<path
			class="path-line"
			class:country-line={highlighted !== null}
			data-country={end.id}
			d={end.path}
			stroke={end.color}
			fill="none"
			pathLength="1"
			stroke-dasharray="1"
			stroke-dashoffset={end.dashOffset}
			opacity={end.started && revealProgress > 0
				? highlighted === null || highlighted.includes(end.id)
					? 1
					: 0.25
				: 0}
		/>
		{#if showSymbols && end.started && revealProgress > 0}
			<EndpointSymbol index={end.index} x={end.x} y={end.y} color={end.color} />
		{/if}
		{#if showLabels}
			{@const labelX = trackLabels ? end.x + 12 : $width + 12}
			<g opacity={trackLabels ? (end.started && revealProgress > 0 ? 1 : 0) : labelsOpacity}>
				<path
					class="label-leader"
					d="M{end.x + 6},{end.y} L{labelX - 4},{labelYs[index]}"
					stroke={end.color}
					fill="none"
				/>
				<text
					class="direct-label"
					x={labelX}
					y={labelYs[index]}
					fill={end.color}
					dominant-baseline="middle"
				>
					<tspan class="country-name">{end.label}</tspan>
					{#if trackLabels}
						<tspan
							class="label-value"
							x={stackValues ? labelX : undefined}
							dy={stackValues ? 18 : undefined}
							dx={stackValues ? undefined : 6}>{end.value.toFixed(2)}</tspan
						>
					{/if}
				</text>
			</g>
		{/if}
	{/each}
	{#if showCursor}
		<g class="year-cursor" transform="translate({$width * revealProgress},0)">
			<line y1="0" y2={$height} stroke="#707071" stroke-dasharray="3 3" opacity="0.4" />
			{#if showCursorLabel}
				<text y="-10" text-anchor={revealProgress > 0.8 ? "end" : "start"}>
					{cursorPrefix}{currentYear}
				</text>
			{/if}
		</g>
	{/if}
	{#if cursorAnnotation}
		<foreignObject
			class="cursor-annotation"
			x={$width * revealProgress + 10}
			y={cursorAnnotationAtBottom ? Math.max(0, $height - 180) : 0}
			width="125"
			height="180"
		>
			{@render cursorAnnotation()}
		</foreignObject>
	{/if}
</g>

<style>
	.path-line {
		stroke-width: 2.5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.context-line {
		stroke-width: 1;
	}
	.year-cursor text {
		font-size: 14px;
		font-weight: 600;
		fill: #707071;
	}
	.direct-label {
		font-size: 14px;
		paint-order: stroke;
		stroke: white;
		stroke-width: 3px;
		stroke-linejoin: round;
	}
	.label-value {
		font-weight: 600;
	}
	.threshold-annotation text {
		font-size: 13px;
		fill: #707071;
		paint-order: stroke;
		stroke: white;
		stroke-width: 3px;
	}
	.label-leader {
		stroke-width: 1;
	}
</style>
