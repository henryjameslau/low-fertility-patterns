<script>
	import { asset } from "$app/paths";
	import {
		PhaseBanner,
		Header,
		Hero,
		Main,
		Section,
		Footer,
		Scroller,
		ScrollerSection,
		Container,
		Button
	} from "@onsvisual/svelte-components";
	import CountrySelect from "$lib/components/CountrySelect.svelte";
	import EarlyLateFertility from "$lib/components/EarlyLateFertility.svelte";
	import CohortFertility from "$lib/components/CohortFertility.svelte";
	import AnimatedWavesChart from "$lib/components/AnimatedWavesChart.svelte";
	import LineChartWithLegend from "$lib/components/LineChartWithLegend.svelte";
	import { fade, fly } from "svelte/transition";
	import {
		loadCountries,
		loadFertilityData,
		loadSources,
		loadASFRData,
		buildCohortAgeProfiles,
		analyzeThresholdCrossings,
		getAnnualThresholdCounts,
		validateData
	} from "$lib/data/fertility-client.js";

	// Data state
	let countries = $state([]);
	let fertilityRecords = $state([]);
	let cohortProfiles = $state([]);
	let asfrData = $state({});
	let table1Countries = $state([]);
	let comparatorCountries = $state([]);
	let isLoading = $state(true);
	let error = $state(null);

	// Load data on mount
	$effect(() => {
		loadAllData();
	});

	async function loadAllData() {
		try {
			isLoading = true;
			console.log("Loading data on client...");

			const countriesData = await loadCountries();
			const fertilityData = await loadFertilityData();
			const asfrDataResult = await loadASFRData();
			const profiles = buildCohortAgeProfiles(
				asfrDataResult,
				["JPN", "USA"],
				[1940, 1950, 1960, 1970]
			);

			console.log("Data loaded successfully:", {
				countries: countriesData.length,
				fertilityRecords: fertilityData.length
			});

			countries = countriesData;
			fertilityRecords = fertilityData;
			cohortProfiles = profiles;
			asfrData = asfrDataResult;

			table1Countries = countries.filter((c) => c.type === "Table1");
			comparatorCountries = countries.filter((c) => c.type === "Comparator");

			isLoading = false;
		} catch (err) {
			console.error("Failed to load data:", err);
			error = err.message;
			isLoading = false;
		}
	}

	// Create lookup for country names and types - computed
	let countryMap = $derived.by(() => {
		const map = {};
		const allCountries = [...table1Countries, ...comparatorCountries];
		allCountries.forEach((c) => {
			map[c.id] = c;
		});
		return map;
	});

	let allCountries = $derived([...table1Countries, ...comparatorCountries]);

	// Prepare country names map - computed
	let countryNamesMap = $derived.by(() => {
		const map = {};
		allCountries.forEach((c) => {
			map[c.id] = c.name;
		});
		return map;
	});

	// Scroller state
	let currentIndex = $state(0);
	let scrollProgress = $state(0); // 0-1 representing progress through current section
	const revealProgress = $derived(Math.max(0, Math.min(1, scrollProgress / 0.8)));
	const periodYMax = $derived(Math.max(2.5, ...fertilityRecords.map((record) => record.tfr)));

	// Interactive explorer state
	let selectedCountries = $state(["ITA", "CZE", "KOR", "CHL"]);

	// Add country to explorer
	function handleAddCountry(country) {
		if (!selectedCountries.includes(country.id)) {
			selectedCountries.push(country.id);
			selectedCountries = selectedCountries;
		}
	}

	// Remove country from explorer
	function handleRemoveCountry(id) {
		selectedCountries = selectedCountries.filter((c) => c !== id);
	}

	// Define static scrolly sections with chart data - computed
	const staticSections = $derived.by(() => {
		const allT1Countries = table1Countries.map((c) => c.id);
		return [
			{
				title: "Understanding very low fertility",
				chartTitle: "Fertility fell to 1.3 births per woman or lower in Italy, Spain and Germany",
				text: "In 1993, Italy and Spain became the first countries to experience period total fertility rates at or below 1.3 births per woman—a threshold representing lowest-low fertility. Germany crossed the same threshold that same year.",
				countries: ["ITA", "ESP", "DEU"],
				highlightText: ""
			},
			{
				title: "Lowest-low fertility came in waves",
				chartTitle:
					"Lowest-low fertility reached countries across Europe, Asia, Latin America and Africa",
				text: "Lowest-low fertility did not emerge everywhere at once. After the first wave in Southern Europe in the 1990s, it spread through former Communist countries, then parts of Asia. Some countries entered, left, and even re-entered the lowest-low category.",
				countries: allT1Countries,
				highlightText: "",
				chartType: "waves",
				isAnimated: true
			},
			{
				title: "Similar levels, different paths",
				chartTitle: "Fertility recovered temporarily in Czechia but reached new lows in Korea",
				text: [
					"Countries that reached lowest-low fertility did not all stay there, nor do they all follow the same trajectory.",
					"Italy has remained in lowest-low fertility for three decades, while Korea experienced the sharpest decline."
				],
				countries: ["ITA", "CZE", "KOR", "CHL"],
				highlightText: ""
			},
			{
				title: "Early births declined",
				chartTitle: "Births shifted towards older ages in Sweden and Italy",
				text: "The story of lowest-low fertility is not uniform fertility decline—it is a shift in the timing of births. Women have delayed childbearing, particularly in developed countries.",
				countries: ["SWE", "ITA"],
				highlightText: "",
				chartType: "earlyLate"
			},
			{
				title: "Later births did not always offset",
				chartTitle: "Later births did not always mean fewer children in Japan and the USA",
				text: "Follow women born in 1940, 1950, 1960 and 1970 through their childbearing ages. A shift towards older ages shows later births, as seen across the USA's cohorts. In Japan, women born in 1960 and 1970 have smaller areas under their curves than earlier cohorts, indicating fewer children per woman overall.",
				countries: ["JPN", "USA"],
				highlightText: "",
				chartType: "cohort"
			}
		];
	});

	// Get current section data
	let currentSection = $derived(staticSections[currentIndex] || staticSections[0]);

	// Alias for template use
	let sections = $derived(staticSections);

	// Keep the waves counter in step with the drawing position.
	let animatedYear = $derived.by(() => {
		if (!currentSection.isAnimated) return 2023;
		if (currentIndex === 1) {
			return Math.round(1980 + revealProgress * 43);
		}
		return 2023;
	});

	// Transform data for current chart (scrollytelling)
	let chartData = $derived.by(() => {
		if (!fertilityRecords || fertilityRecords.length === 0) return [];

		return fertilityRecords
			.filter((d) => currentSection.countries.includes(d.location))
			.map((d) => ({
				location: d.location,
				year: d.year,
				tfr: d.tfr,
				label: countryNamesMap[d.location] || d.location
			}));
	});

	// Transform data for explorer chart
	let explorerChartData = $derived.by(() => {
		if (!fertilityRecords || fertilityRecords.length === 0) return [];

		return fertilityRecords
			.filter((d) => selectedCountries.includes(d.location))
			.map((d) => ({
				location: d.location,
				year: d.year,
				tfr: d.tfr,
				label: countryNamesMap[d.location] || d.location
			}));
	});

	function handleScroller(detail) {
		if (detail.index !== null) currentIndex = detail.index;
	}
</script>

<PhaseBanner phase="Prototype" />
<Header />

<Hero
	theme="blue"
	title="Very low fertility patterns"
	lede="An interactive exploration of countries experiencing lowest-low fertility, comparing patterns and trajectories"
	height={500}
>
	<div class="hero-info">
		<p>
			Based on research by Gianpiero Dalla-Zuanna and Tiziana Leone using UN World Population
			Prospects 2024 data.
		</p>
	</div>
</Hero>

<Main>
	<Section title="The problem: lowest-low fertility" marginTop={true}>
		<p>
			In recent decades, some countries have experienced total fertility rates below 1.3 births per
			woman—a phenomenon called "lowest-low fertility." This threshold matters: it represents a
			fertility level far below the 2.1 births per woman often cited as population replacement
			level.
		</p>
		<p>
			This increase in lowest-low fertility is not evenly distributed across the world. Some
			countries have remained in this state for decades, while others have entered, left, and even
			re-entered it. The timing, duration, and trajectories vary significantly—telling distinct
			stories about demographic, economic, and social change.
		</p>
		<p>
			Scroll through the following sections to explore how lowest-low fertility emerged, spread
			across regions, and continues to shape population patterns in countries from Southern Europe
			to East Asia.
		</p>
	</Section>
</Main>

{#if fertilityRecords.length > 0}
	<Scroller
		onChange={handleScroller}
		bind:offset={scrollProgress}
		id="fertility-scroller"
		splitscreen={true}
	>
		{#snippet background()}
			<Container width="full" height="full">
				<div class="scroller-background" in:fade={{ duration: 500 }}>
					<div class="chart-container">
						<div class="chart-header">
							<h2>{currentSection.chartTitle}</h2>
						</div>

						{#if currentSection.chartType === "earlyLate"}
							<EarlyLateFertility
								{asfrData}
								scrollProgress={revealProgress}
								countries={currentSection.countries}
								countryNames={countryNamesMap}
							/>
						{:else if currentSection.chartType === "cohort"}
							<CohortFertility
								profiles={cohortProfiles}
								scrollProgress={revealProgress}
								countries={currentSection.countries}
								countryNames={countryNamesMap}
							/>
						{:else if currentSection.chartType === "waves"}
							<AnimatedWavesChart
								data={fertilityRecords}
								countries={currentSection.countries}
								countryNames={countryNamesMap}
								currentYear={animatedYear}
								scrollProgress={revealProgress}
								title={currentSection.chartTitle}
								yMax={periodYMax}
							/>
						{:else}
							<!-- Default period fertility chart -->
							<LineChartWithLegend
								data={chartData}
								scrollProgress={revealProgress}
								yMax={periodYMax}
								yTicks={[0, 2, 4, 6]}
								trackLabels={currentIndex === 0 || currentIndex === 2}
								threshold={currentIndex === 0 || currentIndex === 2 ? 1.3 : null}
								height={500}
								xKey="year"
								yKey="tfr"
								zKey="location"
								labelKey="label"
								title={currentSection.chartTitle}
								animation={true}
								duration={800}
								xAxisLabel="Year"
								yAxisLabel="Births per woman"
							/>
						{/if}
					</div>
				</div>
			</Container>
		{/snippet}

		{#snippet foreground()}
			{#each sections as section, i}
				<ScrollerSection id={`section-${i}`}>
					<div class="section-content">
						<h3 class="section-title">{section.title}</h3>
						{#each Array.isArray(section.text) ? section.text : [section.text] as text}
							<p class="section-text">{text}</p>
						{/each}
						{#if section.highlightText}
							<p class="section-highlight">{section.highlightText}</p>
						{/if}
					</div>
				</ScrollerSection>
			{/each}
		{/snippet}
	</Scroller>
{/if}

<!-- Conclusion and explorer -->
<Main>
	<Section id="conclusion" title="There is no single path to low fertility" marginTop={true}>
		<p>
			Similar fertility rates can hide different histories. Some countries have seen temporary
			recoveries, while others have fallen further.
		</p>
		<p>
			Later births do not always make up for fewer births at younger ages. Following birth cohorts
			helps distinguish a change in when women have children from a change in how many they have
			overall.
		</p>
		<p>
			These patterns describe change, not its causes or what will happen next. Use the explorer
			below to compare countries' annual fertility trajectories for yourself.
		</p>
	</Section>

	<Section title="Compare country experiences" marginTop={true}>
		<p>
			Select and compare up to four countries' fertility trajectories over 1950-2023 from 34
			countries in lowest-low fertility, plus Sweden, the USA, and Australia as comparators.
		</p>

		<div class="explorer-section">
			<div class="explorer-controls">
				<CountrySelect
					countries={allCountries}
					selected={selectedCountries}
					maxCountries={4}
					onAdd={handleAddCountry}
					onRemove={handleRemoveCountry}
				/>
			</div>

			{#if explorerChartData.length > 0}
				<div class="explorer-chart" in:fly={{ y: 20, duration: 500 }}>
					<LineChartWithLegend
						data={explorerChartData}
						height={500}
						xKey="year"
						yKey="tfr"
						zKey="location"
						labelKey="label"
						animation={true}
						duration={800}
						xAxisLabel="Year"
						yAxisLabel="Total Fertility Rate"
					/>
				</div>
			{/if}
		</div>
	</Section>

	<Section title="Download the data" marginTop={true}>
		<p>
			<Button
				href={asset("/data/all-fertility-data.xlsx")}
				download="all-fertility-data.xlsx"
				small={true}
				icon="download"
			>
				Download all the data (Excel)
			</Button>
		</p>
		<p>
			The workbook includes all available countries and years, annual fertility rates, single-age
			rates, age-group sums, cohort age profiles, country information and sources.
		</p>
	</Section>

	<Section title="Sources and Methods" marginTop={true}>
		<h4>Paper</h4>
		<p>
			Dalla-Zuanna, Gianpiero, and Tiziana Leone. "Commonalities and Differences in Lowest-Low
			Fertility Patterns." <em>Population and Development Review</em>, 2026.
			<a href="https://onlinelibrary.wiley.com/doi/10.1111/padr.70098">
				https://onlinelibrary.wiley.com/doi/10.1111/padr.70098
			</a>
		</p>

		<h4>Data</h4>
		<p>
			All fertility measures are derived from single-age estimates in
			<a href="https://population.un.org/wpp/"><em>World Population Prospects 2024</em></a>
			(F01), published by the United Nations, Department of Economic and Social Affairs, Population Division.
			The estimates cover ages 15–49 for each year from 1950 to 2023, with complete coverage for the 34
			historical-group countries and territories and three comparators.
		</p>
		<p>
			Annual total fertility is the sum of age-specific rates at ages 15–49 within the same calendar
			year, expressed as births per woman. Early and late fertility are the contributions from ages
			15–29 and 30–49, respectively.
		</p>
		<p>
			Birth-cohort profiles follow women born in 1940, 1950, 1960 and 1970 through ages 15–49, using
			the rate at each age in the calendar year equal to birth year plus age. These rates are
			expressed as births per 1,000 women at each age. All four cohorts have complete coverage, so
			no missing late-age rates have been imputed.
		</p>

		<h4>Coverage</h4>
		<p>
			The analysis includes 34 countries and territories that experienced lowest-low fertility (≤1.3
			births per woman) between 1950 and 2023, plus three comparator countries: Sweden, the USA, and
			Australia.
		</p>
	</Section>
</Main>

<Footer />

<style>
	:global(main) {
		max-width: 100%;
		padding: 0;
	}

	:global(svelte-scroller-outer) {
		display: block;
		width: 100%;
		min-height: 500vh;
	}

	.hero-info {
		color: white;
		font-size: 18px;
		line-height: 1.6;
	}

	.disclaimer {
		margin-top: 1rem;
		font-size: 14px;
		opacity: 0.9;
	}

	.scroller-background {
		width: 100%;
		height: 100%;
		background: white;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		box-sizing: border-box;
	}

	.chart-container {
		width: 90%;
		max-width: 1000px;
		padding: 0;
		box-sizing: border-box;
	}

	.chart-header {
		margin-bottom: 1.5rem;
		text-align: center;
	}

	.chart-header h2 {
		margin: 0;
		font-size: 1.5rem;
		color: #333;
	}

	.section-content {
		max-width: 500px;
		background: white;
		padding: 2rem;
		border-radius: 8px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
		margin: 0 auto;
	}

	.section-title {
		font-size: 1.75rem;
		font-weight: 700;
		margin: 0 0 1rem 0;
		color: #0084d1;
	}

	.section-text {
		font-size: 1rem;
		line-height: 1.8;
		margin: 0 0 1rem 0;
		color: #333;
	}

	.section-highlight {
		font-size: 0.95rem;
		line-height: 1.6;
		margin: 1rem 0;
		padding: 1rem;
		background: #f0f8ff;
		border-left: 4px solid #0084d1;
		color: #333;
		font-style: italic;
	}

	.explorer-section {
		margin-top: 2rem;
		padding: 1.5rem;
		background: #fafafa;
		border-radius: 4px;
	}

	.explorer-controls {
		margin-bottom: 2rem;
	}

	.explorer-chart {
		margin-top: 2rem;
	}

	@media (min-width: 992px) {
		.section-content {
			background: transparent;
			border-radius: 0;
			box-shadow: none;
			padding: 1.5rem;
		}
	}

	@media (max-width: 768px) {
		.chart-container {
			width: 95%;
			padding: 0;
		}

		.chart-header h2 {
			font-size: 1.25rem;
			line-height: 1.5;
		}

		.chart-header {
			min-height: 60px;
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.section-content {
			max-width: 95%;
			padding: 1.5rem;
		}

		.section-title {
			font-size: 1.5rem;
		}

		.section-text {
			font-size: 0.95rem;
		}
	}
</style>
