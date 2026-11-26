/**
 * Tests for fertility data loading and transformation
 * Run with: node --test src/lib/data/fertility.test.js
 */

import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import {
	analyzeThresholdCrossings,
	getAnnualThresholdCounts,
	getSeries,
	validateData,
	parseASFRCSV,
	calculateCohortEarlyLate
} from "./transform.js";

test("ASFR parser provides country/year/age maps and preserves rates in births per woman", () => {
	const data = parseASFRCSV(
		"location,year,age,asfr_rate,source\r\n" +
			'ITA,2023,29,0.074835,"UN WPP, 2024"\r\n' +
			"ITA,2023,30,0.082279,UN WPP 2024\r\n" +
			"SWE,2023,15,0,UN WPP 2024\r\n" +
			"ITA,2022,29,0.08,UN WPP 2024\r\n"
	);
	assert.deepStrictEqual(data, {
		ITA: { 2023: { 29: 0.074835, 30: 0.082279 }, 2022: { 29: 0.08 } },
		SWE: { 2023: { 15: 0 } }
	});
	assert.deepStrictEqual(calculateCohortEarlyLate(data.ITA[2023]), {
		early: 0.074835,
		late: 0.082279,
		total: 0.074835 + 0.082279
	});
});

test("ASFR parser rejects malformed, missing and duplicate rates rather than empty data", () => {
	const header = "location,year,age,asfr_rate,source\n";
	for (const row of [
		"ITA,2023,15,,UN",
		"ITA,2023,15,invalid,UN",
		"ITA,2023,14,0.01,UN",
		"ITA,2023,15,-0.01,UN",
		"ITA,2023,15,0.01,UN\nITA,2023,15,0.02,UN"
	]) {
		assert.throws(() => parseASFRCSV(header + row), /Invalid ASFR|Duplicate ASFR/);
	}
	assert.throws(() => parseASFRCSV(header), /empty/);
	assert.throws(() => parseASFRCSV("location,year\nITA,2023"), /required columns/);
});

test("packaged Italy/Sweden ASFR matches WPP 2024 age columns and early/late totals", () => {
	const data = parseASFRCSV(
		readFileSync(new URL("../../../static/data/asfr.csv", import.meta.url), "utf8")
	);
	// Estimates sheet, 2023: L = age 15, Z = age 29, AA = age 30, AT = age 49.
	const benchmarks = {
		ITA: {
			age15: 0.000248,
			age29: 0.074835,
			age30: 0.082279,
			age49: 0.000268,
			early: 0.391464,
			late: 0.806155
		},
		SWE: {
			age15: 0.000065,
			age29: 0.105348,
			age30: 0.110554,
			age49: 0.000247,
			early: 0.555553,
			late: 0.874399
		}
	};
	for (const [location, expected] of Object.entries(benchmarks)) {
		assert.strictEqual(Object.keys(data[location]).length, 74);
		for (const ageMap of Object.values(data[location])) {
			assert.strictEqual(Object.keys(ageMap).length, 35);
		}
		const ageMap = data[location][2023];
		for (const age of [15, 29, 30, 49]) {
			assert(Math.abs(ageMap[age] - expected[`age${age}`]) < 1e-10);
		}
		const totals = calculateCohortEarlyLate(ageMap);
		assert(Math.abs(totals.early - expected.early) < 1e-10);
		assert(Math.abs(totals.late - expected.late) < 1e-10);
		assert(Math.abs(totals.total - expected.early - expected.late) < 1e-10);
	}
});

test("analyzeThresholdCrossings: identifies entries correctly", () => {
	const records = [
		{ location: "ITA", year: 1992, tfr: 1.31 },
		{ location: "ITA", year: 1993, tfr: 1.29 },
		{ location: "ITA", year: 1994, tfr: 1.25 },
		{ location: "USA", year: 1990, tfr: 1.7 },
		{ location: "USA", year: 2023, tfr: 1.67 }
	];

	const result = analyzeThresholdCrossings(records);

	assert.strictEqual(result.ITA.crossed, true);
	assert.strictEqual(result.ITA.year_entry, 1993);
	assert.strictEqual(result.ITA.min_tfr, 1.25);
	assert.strictEqual(result.ITA.year_min, 1994);

	assert.strictEqual(result.USA.crossed, false);
});

test("analyzeThresholdCrossings: handles 2023 value", () => {
	const records = [
		{ location: "ITA", year: 1993, tfr: 1.29 },
		{ location: "ITA", year: 2023, tfr: 1.24 }
	];

	const result = analyzeThresholdCrossings(records);
	assert.strictEqual(result.ITA.tfr_2023, 1.24);
});

test("getAnnualThresholdCounts: counts correctly", () => {
	const records = [
		{ location: "ITA", year: 1993, tfr: 1.29 }, // ITA is Table1
		{ location: "USA", year: 1993, tfr: 1.7 }, // USA is Comparator
		{ location: "CZE", year: 1993, tfr: 1.25 }, // CZE is Table1
		{ location: "ITA", year: 1994, tfr: 1.7 }
	];

	const countriesConfig = [
		{ id: "ITA", type: "Table1" },
		{ id: "USA", type: "Comparator" },
		{ id: "CZE", type: "Table1" }
	];

	const counts = getAnnualThresholdCounts(records, countriesConfig);

	const year1993 = counts.find((c) => c.year === 1993);
	assert(year1993);
	assert.strictEqual(year1993.count_table1, 2); // ITA and CZE
	assert.strictEqual(year1993.count_all, 2); // Only threshold countries

	const year1994 = counts.find((c) => c.year === 1994);
	assert(!year1994 || year1994.count_all === 0); // ITA no longer below 1.3
});

test("getSeries: filters and sorts correctly", () => {
	const records = [
		{ location: "ITA", year: 2000, tfr: 1.26 },
		{ location: "CZE", year: 2000, tfr: 1.25 },
		{ location: "ITA", year: 1995, tfr: 1.3 },
		{ location: "USA", year: 2000, tfr: 1.7 }
	];

	const series = getSeries(records, ["ITA", "CZE"], 1995, 2023);

	assert.strictEqual(series.length, 3);
	assert.strictEqual(series[0].location, "CZE");
	assert.strictEqual(series[0].year, 2000);
	assert.strictEqual(series[1].location, "ITA");
	assert.strictEqual(series[1].year, 1995);
	assert.strictEqual(series[2].location, "ITA");
	assert.strictEqual(series[2].year, 2000);
});

test("getSeries: respects year range", () => {
	const records = [
		{ location: "ITA", year: 1940, tfr: 2.0 },
		{ location: "ITA", year: 1995, tfr: 1.3 },
		{ location: "ITA", year: 2024, tfr: 1.2 }
	];

	const series = getSeries(records, ["ITA"], 1950, 2023);
	assert.strictEqual(series.length, 1);
	assert.strictEqual(series[0].year, 1995);
});

test("validateData: detects missing fields", () => {
	const records = [
		{ location: "ITA", year: 1993, tfr: 1.29 },
		{ location: "CZE", year: 1993 } // missing tfr
	];

	const issues = validateData(records);
	assert(issues.some((i) => i.includes("required fields")));
});

test("validateData: detects out-of-range years", () => {
	const records = [
		{ location: "ITA", year: 1949, tfr: 1.29 },
		{ location: "ITA", year: 2024, tfr: 1.2 }
	];

	const issues = validateData(records);
	assert(issues.some((i) => i.includes("1950-2023")));
});

test("validateData: detects invalid TFR values", () => {
	const records = [
		{ location: "ITA", year: 1993, tfr: -0.5 },
		{ location: "CZE", year: 1993, tfr: 15.0 }
	];

	const issues = validateData(records);
	assert(issues.some((i) => i.includes("implausible TFR")));
});

test("validateData: detects duplicates", () => {
	const records = [
		{ location: "ITA", year: 1993, tfr: 1.29 },
		{ location: "ITA", year: 1993, tfr: 1.25 }
	];

	const issues = validateData(records);
	assert(issues.some((i) => i.includes("duplicate")));
});

test("validateData: accepts valid data", () => {
	const records = [
		{ location: "ITA", year: 1950, tfr: 2.47 },
		{ location: "ITA", year: 2023, tfr: 1.24 },
		{ location: "CZE", year: 1990, tfr: 2.08 }
	];

	const issues = validateData(records);
	assert.strictEqual(issues.length, 0);
});
