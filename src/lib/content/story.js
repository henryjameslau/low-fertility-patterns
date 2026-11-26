/**
 * Story configuration and editorial content
 *
 * This file defines the narrative structure, scene content, and evidence references.
 * Each scene links back to source material (paper figures, tables) and datasets.
 */

export const projectMetadata = {
	title: "Very Low Fertility Patterns",
	subtitle: "An interactive exploration of countries experiencing lowest-low fertility",
	description:
		"This prototype explains similarities and differences in lowest-low fertility across 34 countries and territories using data from the UN World Population Prospects 2024, based on research by Dalla-Zuanna & Leone.",
	authors: ["Gianpiero Dalla-Zuanna", "Tiziana Leone"],
	paper: {
		title: "Commonalities and Differences in Lowest-Low Fertility Patterns",
		doi: "10.1111/padr.70098",
		published: "Population and Development Review, 2026",
		source_url: "https://onlinelibrary.wiley.com/doi/10.1111/padr.70098"
	},
	data_source: {
		source: "UN World Population Prospects 2024",
		url: "https://population.un.org/wpp/",
		coverage: "1950-2023",
		note: "All chart rates derive from F01 single-age fertility estimates. Annual total fertility sums ages 15-49 within each calendar year."
	}
};

export const scenes = [
	{
		id: "scene-1-threshold",
		title: "Understanding Very Low Fertility",
		short_title: "The 1.3 threshold",
		sequence: 1,
		purpose:
			"Introduce the concept of lowest-low fertility (≤1.3 births per woman) using Italy and Spain's entry in 1993",
		content: {
			hook: "In 1993, two countries entered a demographic milestone that would reshape global population patterns.",
			main: [
				"Italy and Spain became the first countries to experience period total fertility rates at or below 1.3 births per woman—a threshold representing lowest-low fertility.",
				"Germany crossed the same threshold that same year.",
				"This threshold matters because it represents a dramatic departure from population replacement. For context, approximately 2.1 births per woman replaces the population over time under stable conditions, but this figure varies by mortality and migration.",
				"The 1.3 threshold is not a universal constant or policy target. Rather, it identifies a historic demographic shift worth studying."
			],
			visual: {
				type: "line_chart",
				title: "Period Total Fertility Rates: Italy, Spain, Germany (1980–2000)",
				data_ref: ["ITA", "ESP", "DEU"],
				year_range: [1980, 2000],
				highlight_year: 1993,
				annotation: "Entry into lowest-low fertility (≤1.3)"
			}
		},
		evidence: {
			paper_ref: "Table 1; Introduction and Trends",
			figure_ref: null,
			benchmark: {
				ITA: { year_entry: 1993, tfr_1993: 1.29 },
				ESP: { year_entry: 1995, tfr_1995: 1.28 },
				DEU: { year_entry: 1993, tfr_1993: 1.26 }
			}
		}
	},

	{
		id: "scene-2-spread",
		title: "The Pattern Spread in Waves",
		short_title: "Waves of spread",
		sequence: 2,
		purpose:
			"Show how lowest-low fertility spread unevenly across time and regions. Explain the 150,000 population filter that defines the study.",
		content: {
			hook: "Lowest-low fertility did not emerge everywhere at once. It spread in distinct waves, stalled in the 2000s, and resumed again from the 2010s.",
			main: [
				"The study tracks 34 countries and territories with at least 150,000 inhabitants in 2023 that experienced lowest-low fertility at some point between 1950 and 2023.",
				"Southern Europe led, with Italy, Spain, and Greece entering in the 1990s.",
				"Former Communist European countries followed, with many crossing in the early 1990s.",
				"Asian countries and others entered later, with the most recent entry (Finland) occurring in 2023.",
				"The annual count rose, fell, and rose again—suggesting that the phenomenon is neither inevitable nor irreversible."
			],
			visual: {
				type: "area_chart",
				title: "Number of Countries/Territories Below 1.3 Fertility Rate (1950–2023)",
				data_ref: "all_table1",
				metric: "count_table1",
				regions: true,
				annotation_points: [
					{
						year: 1993,
						label: "First entries: Southern Europe"
					},
					{
						year: 2010,
						label: "Stall and expansion"
					}
				]
			}
		},
		evidence: {
			paper_ref: "Table 1; Figure 1 (annual counts)",
			figure_ref: null,
			methodology_note:
				"Population 150,000+ filter applied to 2023. Historical eligibility dates are based on year of first ≤1.3 crossing."
		}
	},

	{
		id: "scene-3-paths",
		title: "Similar Levels, Different Paths",
		short_title: "Diverse trajectories",
		sequence: 3,
		purpose:
			"Show all 34 countries in small multiples, highlighting contrasting experiences: persistent low fertility, temporary dips, and recent entrants.",
		content: {
			hook: "Countries that reached lowest-low fertility did not all stay there, nor do they all follow the same trajectory.",
			main: [
				"Italy has remained in lowest-low fertility for three decades, with its minimum of 1.19 in 2010.",
				"Czechia experienced a temporary dip, then recovered, now hovering above 1.3.",
				"Republic of Korea has the lowest fertility rate globally (0.72), with a sharp decline since the 1990s.",
				"Chile only recently entered lowest-low fertility, in 2010.",
				"These patterns reflect different histories, policies, and social conditions—not a single inevitable path."
			],
			visual: {
				type: "small_multiples",
				title: "Period Total Fertility Rates: 34 Lowest-Low Countries (1950–2023)",
				data_ref: "table1_all",
				layout: "grid",
				sort_by: "year_entry",
				highlights: ["ITA", "CZE", "KOR", "CHL"],
				threshold_line: 1.3
			}
		},
		evidence: {
			paper_ref: "Table 1; Trends and timing section",
			figure_ref: null,
			case_studies: [
				{
					country: "Italy",
					year_entry: 1993,
					min_tfr: 1.19,
					year_min: 2010,
					note: "Persistent lowest-low, illustrates Southern European pattern"
				},
				{
					country: "Czechia",
					year_entry: 1990,
					min_tfr: 1.13,
					year_min: 1999,
					note: "Recovered above 1.3; illustrates post-communist recovery"
				},
				{
					country: "Republic of Korea",
					year_entry: 1990,
					min_tfr: 0.72,
					year_min: 2010,
					note: "Globally lowest; rapid decline from high fertility"
				},
				{
					country: "Chile",
					year_entry: 2010,
					min_tfr: 1.26,
					year_min: 2010,
					note: "Most recent entrant among Table 1; only Latin American member"
				}
			]
		}
	},

	{
		id: "scene-4-early-decline",
		title: "Early Births Declined",
		short_title: "Ages 15–29 fertility",
		sequence: 4,
		purpose:
			"Introduce cohort analysis. Show using Figure 3 how early fertility (ages 15–29) declined sharply in certain country pairs, while late fertility did not always compensate.",
		content: {
			hook: "The story of lowest-low fertility is not uniform fertility decline—it is a shift in the timing of births.",
			main: [
				"Women have delayed childbearing, particularly in developed countries.",
				"Early fertility (births to women aged 15–29) declined sharply in Italy, Japan, and Thailand from their baseline cohorts.",
				"These declines were not offset by increases in late fertility (ages 30–49).",
				"Sweden, the USA, and Australia maintained more stable age patterns, illustrating that delay did not follow one path."
			],
			visual: {
				type: "cohort_comparison",
				title: "Change in Cohort Fertility by Age: Contrasting Patterns",
				pairs: [
					{
						label: "Early decline: Italy vs. Sweden",
						countries: ["ITA", "SWE"],
						measure: "early_fertility",
						cohort_reference: "near_2.1_tfrc"
					},
					{
						label: "Early decline: Japan vs. USA",
						countries: ["JPN", "USA"],
						measure: "early_fertility",
						cohort_reference: "near_2.1_tfrc"
					},
					{
						label: "Early decline: Thailand vs. Australia",
						countries: ["THA", "AUS"],
						measure: "early_fertility",
						cohort_reference: "near_2.1_tfrc"
					}
				],
				annotation: "Change relative to baseline cohort with TFRc ≈ 2.1"
			}
		},
		evidence: {
			paper_ref: "Figure 3; Data and methods section",
			figure_ref: "Figure 3",
			cohort_note:
				"Ages 15–29 define early fertility; ages 30–49 define late fertility. Baseline is a cohort with total cohort fertility near 2.1.",
			data_quality:
				"Complete observed data for cohorts born 1935–1974; imputed for 1975–1984 (imputation method described in article methods)."
		}
	},

	{
		id: "scene-5-late-not-offset",
		title: "Later Births Did Not Always Offset",
		short_title: "Ages 30–49 fertility",
		sequence: 5,
		purpose:
			"Show Figure 4a: how late fertility responses differed. In some cases late fertility partially offset early decline; in others, it remained flat or low.",
		content: {
			hook: "The key insight: not all countries compensated for early fertility decline with late fertility increases.",
			main: [
				"In some countries, women did have more births later (ages 30–49), but not enough to maintain overall fertility levels.",
				"In others, late fertility remained consistently low or even declined further.",
				"This divergence explains why lowest-low fertility persists despite delayed childbearing—delay alone does not restore fertility.",
				"The authors propose that social mechanisms (economic conditions, family policies, gender roles, norms) may shape these patterns. This is an interpretation, not a causal inference from the charts alone."
			],
			visual: {
				type: "cohort_levels",
				title: "Cohort Fertility Levels: Early vs. Late Components (Figure 4a)",
				data_ref: "figure_4a_reconstruction",
				show_observed: true,
				show_imputed: true,
				imputation_flag: true,
				cohort_range: [1935, 1984],
				countries_highlight: ["ITA", "JPN", "THA"]
			}
		},
		evidence: {
			paper_ref: "Figure 4a; Results and discussion",
			figure_ref: "Figure 4a",
			methodology_note:
				"Imputed ages 40–49 for cohorts 1975–1984 (see methods). Flagged in display.",
			limitation:
				"Authors interpret but do not causally test mechanisms. See discussion for proposed social factors."
		}
	},

	{
		id: "scene-6-explorer",
		title: "Compare Country Experiences",
		short_title: "Interactive explorer",
		sequence: 6,
		purpose: "Let readers explore the data themselves, comparing up to four countries at a time.",
		content: {
			hook: "Now it's your turn to explore. Choose up to four countries to compare their fertility trajectories.",
			main: [
				"Select countries from the 34 historical group members or the three comparators (Sweden, USA, Australia).",
				"The app starts with four contrasting examples: Italy, Czechia, Republic of Korea, and Chile.",
				"Comparator countries are labelled to show they did not cross the 1.3 threshold.",
				"Scroll down to see a data table and download option.",
				"Remember: data gaps indicate years with incomplete reporting. Missing values are not filled in."
			],
			visual: {
				type: "interactive_select",
				title: "Compare Total Fertility Rates",
				max_countries: 4,
				default_selection: ["ITA", "CZE", "KOR", "CHL"],
				show_table: true,
				show_download: true
			}
		},
		evidence: {
			paper_ref: "Data and methods; Table 1",
			note: "All visualisations in this page are built from the same underlying dataset."
		}
	}
];

export const narrativeHighlights = {
	italy_spain_1993: {
		title: "Entry into Lowest-Low Fertility",
		entities: ["ITA", "ESP"],
		year: 1993,
		significance: "First countries to cross the ≤1.3 threshold"
	},
	germany_1993: {
		title: "Germany's Entry",
		entities: ["DEU"],
		year: 1993,
		significance: "Simultaneous with Italy and Spain, suggesting regional factors"
	},
	finland_2023: {
		title: "Finland's Recent Entry",
		entities: ["FIN"],
		year: 2023,
		significance:
			"Most recent addition to the group; Nordic country context differs from early entrants"
	}
};

export const sourceAttribution = {
	paper_full_citation:
		'Dalla-Zuanna, Gianpiero, and Tiziana Leone. "Commonalities and Differences in Lowest-Low Fertility Patterns." Population and Development Review, vol. XX, no. X, 2026.',
	paper_access: "https://onlinelibrary.wiley.com/doi/10.1111/padr.70098",
	data_citation:
		"United Nations, Department of Economic and Social Affairs, Population Division. World Population Prospects 2024. https://population.un.org/wpp/",
	prototype_note:
		"This is an independent prototype created to explore the paper's findings using published data. It is not an official publication of the Office for National Statistics or the UN."
};
