import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildPeriodFertility } from "./period-fertility.js";
import { parseASFRCSV, parseFertilityCSV } from "./transform.js";

function completeRates() {
	return {
		TEST: Object.fromEntries(
			Array.from({ length: 74 }, (_, index) => [
				1950 + index,
				Object.fromEntries(Array.from({ length: 35 }, (_, index) => [15 + index, 0]))
			])
		)
	};
}

test("period totals sum ages 15-49 within the same calendar year and retain precision", () => {
	const data = completeRates();
	data.TEST[1950][15] = 0.031234;
	data.TEST[1950][29] = 0.02;
	data.TEST[1950][30] = 0.03;
	data.TEST[1950][49] = 0.04;
	const records = buildPeriodFertility(data, ["TEST"]);
	assert.equal(records.length, 74);
	assert.ok(Math.abs(records[0].tfr - 0.121234) < 1e-12);
	assert.equal(records[1].tfr, 0);
	assert.equal(records.at(-1).year, 2023);
	assert.equal(records[0].source, "UN WPP 2024 F01");
});

test("period totals reject missing countries, years, ages and invalid rates", () => {
	const data = completeRates();
	assert.throws(() => buildPeriodFertility(data, ["MISSING"]), /Missing or invalid/);
	assert.throws(() => buildPeriodFertility(data, []), /non-empty, unique/);
	assert.throws(() => buildPeriodFertility(data, ["TEST", "TEST"]), /non-empty, unique/);
	delete data.TEST[1950][29];
	assert.throws(() => buildPeriodFertility(data, ["TEST"]), /year 1950, age 29/);
	data.TEST[1950][29] = -1;
	assert.throws(() => buildPeriodFertility(data, ["TEST"]), /year 1950, age 29/);
	data.TEST[1950][29] = NaN;
	assert.throws(() => buildPeriodFertility(data, ["TEST"]), /year 1950, age 29/);
	delete data.TEST[1950];
	assert.throws(() => buildPeriodFertility(data, ["TEST"]), /year 1950, age 15/);
});

test("packaged period rates reproduce all UN age sums, including Taiwan and pre-1960 years", () => {
	const directory = new URL("../../../static/data/", import.meta.url);
	const source = parseASFRCSV(readFileSync(new URL("asfr.csv", directory), "utf8"));
	const countries = JSON.parse(readFileSync(new URL("countries.json", directory), "utf8"));
	const records = parseFertilityCSV(readFileSync(new URL("fertility.csv", directory), "utf8"));
	assert.deepEqual(
		records,
		buildPeriodFertility(
			source,
			countries.map((country) => country.id)
		)
	);
	assert.equal(records.length, 2738);
	assert.equal(records.filter((row) => row.location === "TWN").length, 74);
	assert.equal(records.filter((row) => row.year === 1950).length, 37);
	for (const [location, expected] of [
		["ITA", 1.197619],
		["ESP", 1.212696],
		["DEU", 1.441171],
		["TWN", 0.869762]
	]) {
		const record = records.find((row) => row.location === location && row.year === 2023);
		assert.ok(Math.abs(record.tfr - Number(expected)) < 1e-12);
	}
});
