/**
 * Client-side fertility data loading
 * All data is loaded via fetch from static files
 */

import { asset } from "$app/paths";
import { parseASFRCSV, parseFertilityCSV } from "./transform.js";

export { buildCohortAgeProfiles } from "./cohort-age-profiles.js";

export {
	parseFertilityCSV,
	analyzeThresholdCrossings,
	getAnnualThresholdCounts,
	getSeries,
	validateData,
	calculateCohortEarlyLate
} from "./transform.js";

export async function loadCountries() {
	try {
		const response = await fetch(asset("/data/countries.json"));
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		return await response.json();
	} catch (error) {
		console.error("Failed to load countries data:", error.message);
		return [];
	}
}

export async function loadFertilityData() {
	try {
		const response = await fetch(asset("/data/fertility.csv"));
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const text = await response.text();
		return parseFertilityCSV(text);
	} catch (error) {
		console.error("Failed to load fertility data:", error.message);
		return [];
	}
}

export async function loadSources() {
	try {
		const response = await fetch(asset("/data/sources.json"));
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		return await response.json();
	} catch (error) {
		console.error("Failed to load sources:", error.message);
		return [];
	}
}

export async function loadCohortData() {
	try {
		const response = await fetch(asset("/data/cohort.csv"));
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const text = await response.text();
		return parseCohortCSV(text);
	} catch (error) {
		console.error("Failed to load cohort data:", error.message);
		return {};
	}
}

export async function loadASFRData() {
	const response = await fetch(asset("/data/asfr.csv"));
	if (!response.ok) throw new Error(`Failed to load ASFR data: HTTP ${response.status}`);
	return parseASFRCSV(await response.text());
}

function parseCohortCSV(csv) {
	const lines = csv.trim().split("\n");
	const header = lines[0].split(",");
	const data = {};

	for (let i = 1; i < lines.length; i++) {
		const values = lines[i].split(",");
		if (values.length !== header.length) continue;

		const location = values[0];
		const cohortYear = parseInt(values[1]);
		const tfr = parseFloat(values[2]);
		const measureType = values[3];

		if (!location || isNaN(cohortYear) || isNaN(tfr)) continue;

		if (!data[location]) {
			data[location] = [];
		}

		data[location].push({
			cohortYear,
			tfr,
			measureType
		});
	}

	return data;
}
