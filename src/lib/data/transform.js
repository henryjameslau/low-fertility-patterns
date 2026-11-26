/**
 * Pure fertility data transformation logic (testable without SvelteKit)
 *
 * Data analysis functions that don't depend on SvelteKit libraries.
 */

import { csvParseRows } from "d3-dsv";

/**
 * Group rates in births per woman by country, calendar year and single age.
 * @param {string} csv
 * @returns {Record<string, Record<number, Record<number, number>>>}
 */
export function parseASFRCSV(csv) {
	const [columns = [], ...rows] = csvParseRows(csv);
	const required = ["location", "year", "age", "asfr_rate"];
	if (required.some((column) => !columns.includes(column))) {
		throw new Error("ASFR data is missing required columns");
	}
	/** @type {Record<string, Record<number, Record<number, number>>>} */
	const data = {};
	for (const [index, values] of rows.entries()) {
		if (values.length !== columns.length) {
			throw new Error(`Invalid ASFR data at row ${index + 2}`);
		}
		const row = Object.fromEntries(columns.map((column, i) => [column, values[i]]));
		const location = row.location.trim();
		const year = Number(row.year);
		const age = Number(row.age);
		const rate = Number(row.asfr_rate);
		if (
			!location ||
			!row.year.trim() ||
			!row.age.trim() ||
			!row.asfr_rate.trim() ||
			!Number.isInteger(year) ||
			year < 1950 ||
			year > 2023 ||
			!Number.isInteger(age) ||
			age < 15 ||
			age > 49 ||
			!Number.isFinite(rate) ||
			rate < 0
		) {
			throw new Error(`Invalid ASFR data at row ${index + 2}`);
		}
		data[location] ??= {};
		data[location][year] ??= {};
		if (Object.hasOwn(data[location][year], age)) {
			throw new Error(`Duplicate ASFR data for ${location}, ${year}, age ${age}`);
		}
		data[location][year][age] = rate;
	}
	if (rows.length === 0) throw new Error("ASFR data is empty");
	return data;
}

/**
 * Parse fertility CSV into structured format
 * CSV format: location,year,tfr,source
 */
export function parseFertilityCSV(csv) {
	const lines = csv.trim().split("\n");
	if (lines.length < 2) return [];

	const records = [];
	for (let i = 1; i < lines.length; i++) {
		const [location, year, tfr, source] = lines[i].split(",");
		if (!location || !year || !tfr) continue;

		records.push({
			location,
			year: parseInt(year, 10),
			tfr: parseFloat(tfr),
			source: source || "Unknown"
		});
	}

	return records;
}

/**
 * Analyze fertility threshold crossing (≤1.3)
 * Returns object: { country_id -> { year_entry, min_tfr, year_min, tfr_2023 } }
 */
export function analyzeThresholdCrossings(records) {
	const byLocation = {};

	for (const record of records) {
		if (!byLocation[record.location]) {
			byLocation[record.location] = [];
		}
		byLocation[record.location].push(record);
	}

	const results = {};

	for (const [location, records] of Object.entries(byLocation)) {
		const sorted = records.sort((a, b) => a.year - b.year);
		const crossed = sorted.filter((r) => r.tfr <= 1.3);

		if (crossed.length === 0) {
			results[location] = { crossed: false };
			continue;
		}

		const year_entry = crossed[0].year;
		const { tfr: min_tfr, year: year_min } = sorted.reduce((min, r) => (r.tfr < min.tfr ? r : min));
		const rec2023 = sorted.find((r) => r.year === 2023);

		results[location] = {
			crossed: true,
			year_entry,
			min_tfr,
			year_min,
			tfr_2023: rec2023?.tfr || null
		};
	}

	return results;
}

/**
 * Get annual threshold count over time
 * Returns array: { year, count_below_13, count_in_table1 }
 */
export function getAnnualThresholdCounts(records, countriesConfig) {
	const table1Ids = new Set(countriesConfig.filter((c) => c.type === "Table1").map((c) => c.id));

	const byYear = {};
	for (const record of records) {
		if (!byYear[record.year]) byYear[record.year] = { total: 0, in_table1: 0 };
		if (record.tfr <= 1.3) {
			byYear[record.year].total++;
			if (table1Ids.has(record.location)) {
				byYear[record.year].in_table1++;
			}
		}
	}

	return Object.entries(byYear)
		.map(([year, counts]) => ({
			year: parseInt(year, 10),
			count_all: counts.total,
			count_table1: counts.in_table1
		}))
		.sort((a, b) => a.year - b.year);
}

/**
 * Get period series for one or more locations
 * Optionally filtered to a year range
 */
export function getSeries(records, locations, minYear = 1950, maxYear = 2023) {
	const locationSet = new Set(locations);
	return records
		.filter((r) => locationSet.has(r.location) && r.year >= minYear && r.year <= maxYear)
		.sort((a, b) =>
			a.location === b.location ? a.year - b.year : a.location.localeCompare(b.location)
		);
}

/**
 * Validate data integrity
 * Returns array of issues found
 */
export function validateData(records) {
	const issues = [];

	// Check for required fields
	const hasAllFields = records.every(
		(r) => r.location && r.year !== undefined && r.tfr !== undefined
	);
	if (!hasAllFields) {
		issues.push("Some records missing required fields");
	}

	// Check for invalid years
	const badYears = records.filter((r) => r.year < 1950 || r.year > 2023);
	if (badYears.length > 0) {
		issues.push(`${badYears.length} records outside 1950-2023 range`);
	}

	// Check for invalid TFR values
	const badTFR = records.filter((r) => r.tfr < 0 || r.tfr > 10);
	if (badTFR.length > 0) {
		issues.push(`${badTFR.length} records with implausible TFR values`);
	}

	// Check for duplicates
	const seen = new Set();
	const duplicates = records.filter((r) => {
		const key = `${r.location}-${r.year}`;
		if (seen.has(key)) return true;
		seen.add(key);
		return false;
	});
	if (duplicates.length > 0) {
		issues.push(`${duplicates.length} duplicate year values per location`);
	}

	return issues;
}

/**
 * Calculate early (15-29) and late (30-49) fertility from age-specific rates
 * @param {Object} ageMap - Object mapping age to fertility rate
 * @returns {Object} - { early: sum_15_29, late: sum_30_49 }
 */
export function calculateCohortEarlyLate(ageMap) {
	let early = 0;
	let late = 0;
	let earlyCount = 0;
	let lateCount = 0;

	for (const [ageStr, rate] of Object.entries(ageMap)) {
		const age = parseInt(ageStr);
		const value = parseFloat(rate);

		if (isNaN(age) || isNaN(value)) continue;

		// Ages 15-29 (inclusive)
		if (age >= 15 && age <= 29) {
			early += value;
			earlyCount++;
		}
		// Ages 30-49 (inclusive)
		else if (age >= 30 && age <= 49) {
			late += value;
			lateCount++;
		}
	}

	return {
		early: earlyCount > 0 ? early : null,
		late: lateCount > 0 ? late : null,
		total: earlyCount > 0 && lateCount > 0 ? early + late : null
	};
}
