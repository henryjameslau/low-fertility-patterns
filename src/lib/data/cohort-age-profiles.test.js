import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCohortAgeProfiles } from "./cohort-age-profiles.js";
import { parseASFRCSV } from "./transform.js";

function exampleData() {
	const data = { JPN: {} };
	for (let age = 15; age <= 49; age++) {
		data.JPN[1940 + age] = { [age]: age / 1000 };
	}
	return data;
}

test("cohort profiles follow calendar year = birth year + age and preserve zero rates", () => {
	const data = exampleData();
	data.JPN[1970][30] = 0;
	const profiles = buildCohortAgeProfiles(data, ["JPN"], [1940]);
	assert.equal(profiles.length, 35);
	assert.deepEqual(profiles[0], {
		location: "JPN",
		cohortYear: 1940,
		age: 15,
		calendarYear: 1955,
		rate: 0.015
	});
	assert.deepEqual(profiles[15], {
		location: "JPN",
		cohortYear: 1940,
		age: 30,
		calendarYear: 1970,
		rate: 0
	});
	assert.equal(profiles.at(-1).calendarYear, 1989);
	assert.equal(profiles.at(-1).age, 49);
});

test("cohort profiles reject incomplete coverage, invalid rates and duplicate selections", () => {
	for (const rate of [undefined, NaN, -0.01]) {
		const data = exampleData();
		data.JPN[1970][30] = rate;
		assert.throws(() => buildCohortAgeProfiles(data, ["JPN"], [1940]), /JPN, year 1970, age 30/);
	}
	assert.throws(() => buildCohortAgeProfiles({}, ["JPN"], [1940]), /Missing or invalid ASFR/);
	for (const year of [1934, 1975, 1980, 1940.5]) {
		assert.throws(() => buildCohortAgeProfiles(exampleData(), ["JPN"], [year]), /outside complete/);
	}
	assert.throws(() => buildCohortAgeProfiles(exampleData(), ["JPN"], [1940, 1940]), /duplicates/);
	assert.throws(() => buildCohortAgeProfiles(exampleData(), ["JPN", "JPN"], [1940]), /duplicates/);
});

test("packaged Japan/USA profiles use complete UN single-age rates rather than cohort totals", () => {
	const source = parseASFRCSV(
		readFileSync(new URL("../../../static/data/asfr.csv", import.meta.url), "utf8")
	);
	const profiles = buildCohortAgeProfiles(source, ["JPN", "USA"], [1940, 1950, 1960, 1970]);
	assert.equal(profiles.length, 280);
	for (const record of profiles) {
		assert.equal(record.rate, source[record.location][record.cohortYear + record.age][record.age]);
	}
	/** @type {Array<[string, number, number]>} */
	const benchmarks = [
		["JPN", 1950, 1.996738],
		["JPN", 1970, 1.45789],
		["USA", 1950, 2.091945],
		["USA", 1970, 2.105825]
	];
	for (const [location, cohortYear, expected] of benchmarks) {
		const total = profiles
			.filter((record) => record.location === location && record.cohortYear === cohortYear)
			.reduce((sum, record) => sum + record.rate, 0);
		assert(Math.abs(total - expected) < 1e-10);
	}
});
