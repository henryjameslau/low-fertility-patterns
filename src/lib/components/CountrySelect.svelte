<script>
	import { Button, Select } from "@onsvisual/svelte-components";

	let {
		countries = [],
		selected = [],
		maxCountries = 4,
		onAdd = () => {},
		onRemove = () => {}
	} = $props();

	let value = $state(/** @type {object | string | null} */ (null));
	const options = $derived(
		countries
			.filter((country) => !selected.includes(country.id))
			.map((country) => ({ ...country, label: getLabel(country) }))
			.sort((a, b) => a.label.localeCompare(b.label))
	);
	const pendingCountry = $derived(
		value && typeof value === "object" && "id" in value
			? countries.find((country) => country.id === value.id)
			: null
	);
	const atLimit = $derived(selected.length >= maxCountries);
	const canAdd = $derived(!atLimit && pendingCountry && !selected.includes(pendingCountry.id));

	function getLabel(country) {
		return country.type === "Comparator" ? `${country.name} (Comparator)` : country.name;
	}

	function loadOptions(query, populateResults) {
		const search = query.trim().toLowerCase();
		populateResults(
			options.filter(
				(option) =>
					option.label.toLowerCase().includes(search) || option.id.toLowerCase().includes(search)
			)
		);
	}

	function handleAdd() {
		if (canAdd && pendingCountry) {
			onAdd(pendingCountry);
			value = null;
		}
	}
</script>

<div class="country-select">
	<div class="add-area-controls">
		<div class="area-select">
			<Select
				id="explorer-area"
				label="Select an area"
				description={"Choose up to " + maxCountries + " countries or territories to compare."}
				placeholder="Type or select an area"
				{options}
				{loadOptions}
				bind:value
				autoClear={false}
				clearable={true}
			/>
		</div>
		<Button cls="add-area-btn" small={true} icon="plus" disabled={!canAdd} onClick={handleAdd}>
			Add area
		</Button>
	</div>

	<div class="selected-list" role="region" aria-label="Selected countries">
		<h3 class="count ons-u-fs-r--b" aria-live="polite" aria-atomic="true">
			{selected.length} of {maxCountries} areas selected
		</h3>
		<ul class="selected-areas">
			{#each selected as id (id)}
				{@const country = countries.find((country) => country.id === id)}
				<li class="selected-item">
					<Button
						variant="secondary"
						small={true}
						icon="cross"
						iconPosition="after"
						cls="remove-btn"
						arialabel={"Remove " + (country?.name || id)}
						onClick={() => onRemove(id)}
					>
						{country ? getLabel(country) : id}
					</Button>
				</li>
			{/each}
		</ul>
		{#if atLimit}
			<p class="limit-reached ons-u-mb-no">
				Maximum {maxCountries} areas selected. Remove one to add another.
			</p>
		{/if}
	</div>
</div>

<style>
	.country-select {
		margin: 1.5rem 0;
	}

	.add-area-controls {
		display: flex;
		align-items: flex-end;
		gap: 1rem;
	}

	.area-select {
		flex: 1;
		min-width: 0;
	}

	.add-area-controls :global(.add-area-btn .ons-btn__inner) {
		display: flex;
		align-items: center;
		min-height: 40px;
	}

	.selected-list {
		margin-top: 1.5rem;
	}

	.selected-areas {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		list-style: none;
		padding: 0;
		margin: 0 0 1rem;
	}

	.selected-item {
		margin: 0;
		max-width: 100%;
	}

	.selected-item :global(.ons-btn) {
		max-width: 100%;
	}

	.selected-item :global(.ons-btn__inner) {
		display: flex;
		align-items: center;
		white-space: normal;
		text-align: left;
	}

	.selected-item :global(.ons-btn__text) {
		min-width: 0;
	}

	.selected-item :global(.ons-icon) {
		flex-shrink: 0;
	}

	.limit-reached {
		margin-top: 0.75rem;
	}

	@media (max-width: 767px) {
		.add-area-controls {
			flex-direction: column;
			align-items: flex-start;
		}

		.area-select {
			width: 100%;
		}
	}
</style>
