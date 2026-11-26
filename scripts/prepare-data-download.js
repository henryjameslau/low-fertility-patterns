import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { autoType, csvParse } from "d3-dsv";
import XLSX from "xlsx";
import { buildCohortAgeProfiles } from "../src/lib/data/cohort-age-profiles.js";
import {
	calculateCohortEarlyLate,
	parseASFRCSV,
	parseFertilityCSV,
	validateData
} from "../src/lib/data/transform.js";

const dataDirectory = new URL("../static/data/", import.meta.url);
const readData = (name) => readFileSync(new URL(name, dataDirectory), "utf8");
const countries = JSON.parse(readData("countries.json"));
const sources = JSON.parse(readData("sources.json"));
const fertility = parseFertilityCSV(readData("fertility.csv"));
const asfrText = readData("asfr.csv");
const asfr = parseASFRCSV(asfrText);
const issues = validateData(fertility);
if (!fertility.length || issues.length) {
	throw new Error("Cannot export invalid annual fertility data: " + issues.join("; "));
}

function countryName(location) {
	const country = countries.find((country) => country.id === location);
	if (!country) throw new Error("Missing country metadata for " + location);
	return country.name;
}

const workbook = XLSX.utils.book_new();
function addSheet(name, rows) {
	XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name);
}

addSheet("About", [
	{ topic: "Contents", details: "All packaged app data, independent of the selected countries." },
	{
		topic: "Annual fertility",
		details:
			"UN WPP 2024 F01, 1950-2023. Sum of single-age fertility rates at ages 15-49 within each calendar year. Values are births per woman; source precision is retained."
	},
	{
		topic: "Single-age fertility",
		details: "UN WPP 2024, calendar years 1950-2023, ages 15-49. Values are births per woman."
	},
	{
		topic: "Age-group fertility",
		details: "Calendar-year sums of single-age rates: early ages 15-29, late ages 30-49."
	},
	{
		topic: "Cohort age profiles",
		details:
			"Japan and USA, cohorts 1940, 1950, 1960 and 1970. Calendar year = birth year + age. Complete ages 15-49; no imputation. Chart rates multiply births per woman by 1,000."
	},
	{
		topic: "Coverage",
		details:
			"All 34 historical-group entities, including Taiwan, and 3 comparators have complete 1950-2023 coverage. All chart rates derive from UN WPP 2024 F01. The explanatory charts are not an exact replication of the paper's figures."
	},
	{
		topic: "Legacy cohort import",
		details:
			"The unused legacy cohort.csv is excluded; cohort profiles use validated single-age rates."
	},
	{
		topic: "Paper",
		details:
			"Dalla-Zuanna and Leone, Commonalities and Differences in Lowest-Low Fertility Patterns. https://doi.org/10.1111/padr.70098"
	}
]);
addSheet("Countries", countries);
addSheet(
	"Annual fertility",
	fertility.map((row) => ({
		...row,
		country: countryName(row.location),
		unit: "births per woman"
	}))
);
addSheet(
	"Single-age fertility",
	csvParse(asfrText, autoType).map((row) => ({
		...row,
		country: countryName(row.location),
		unit: "births per woman"
	}))
);
addSheet(
	"Age-group fertility",
	Object.entries(asfr).flatMap(([location, years]) =>
		Object.entries(years).map(([year, ages]) => ({
			location,
			country: countryName(location),
			year: Number(year),
			...calculateCohortEarlyLate(ages),
			unit: "births per woman",
			source: "UN WPP 2024"
		}))
	)
);
addSheet(
	"Cohort age profiles",
	buildCohortAgeProfiles(asfr, ["JPN", "USA"], [1940, 1950, 1960, 1970]).map((row) => ({
		...row,
		country: countryName(row.location),
		ratePer1000: row.rate * 1000,
		rateUnit: "births per woman",
		ratePer1000Unit: "births per 1,000 women",
		source: "UN WPP 2024"
	}))
);
addSheet("Sources", sources);

const output = fileURLToPath(new URL("all-fertility-data.xlsx", dataDirectory));
XLSX.writeFile(workbook, output, { compression: true });
console.log("Prepared all-fertility-data.xlsx with " + workbook.SheetNames.length + " worksheets.");
