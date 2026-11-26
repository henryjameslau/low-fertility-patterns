import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { autoType, csvParse } from "d3-dsv";
import XLSX from "xlsx";
import { buildCohortAgeProfiles } from "./cohort-age-profiles.js";
import { calculateCohortEarlyLate, parseASFRCSV } from "./transform.js";

const directory = new URL("../../../static/data/", import.meta.url);
const readData = (name) => readFileSync(new URL(name, directory), "utf8");
const workbook = XLSX.readFile(fileURLToPath(new URL("all-fertility-data.xlsx", directory)));
const sheet = (name) => XLSX.utils.sheet_to_json(workbook.Sheets[name]);
const countries = JSON.parse(readData("countries.json"));
const nameOf = (location) => countries.find((country) => country.id === location).name;

test("download contains every packaged country and source rate, not a chart selection", () => {
	assert.deepEqual(sheet("Countries"), countries);
	for (const [name, file] of [
		["Annual fertility", "fertility.csv"],
		["Single-age fertility", "asfr.csv"]
	]) {
		const expected = csvParse(readData(file), autoType).map((row) => ({
			...row,
			country: nameOf(row.location),
			unit: "births per woman"
		}));
		assert.deepEqual(sheet(name), expected);
	}
	assert.equal(sheet("Sources").length, 1);
	assert.ok(sheet("About").length);
	assert.equal(sheet("Annual fertility").filter((row) => row.location === "TWN").length, 74);
});

test("download preserves cohort source ages, display units and calendar-year age-group sums", () => {
	const asfr = parseASFRCSV(readData("asfr.csv"));
	const profiles = buildCohortAgeProfiles(asfr, ["JPN", "USA"], [1940, 1950, 1960, 1970]);
	assert.equal(sheet("Cohort age profiles").length, 280);
	assert.deepEqual(
		sheet("Cohort age profiles"),
		profiles.map((row) => ({
			...row,
			country: nameOf(row.location),
			ratePer1000: row.rate * 1000,
			rateUnit: "births per woman",
			ratePer1000Unit: "births per 1,000 women",
			source: "UN WPP 2024"
		}))
	);
	const expected = Object.entries(asfr).flatMap(([location, years]) =>
		Object.entries(years).map(([year, ages]) => ({
			location,
			country: nameOf(location),
			year: Number(year),
			...calculateCohortEarlyLate(ages),
			unit: "births per woman",
			source: "UN WPP 2024"
		}))
	);
	assert.deepEqual(sheet("Age-group fertility"), expected);
});
