import { readFileSync, writeFileSync } from "node:fs";
import { csvFormat } from "d3-dsv";
import { parseASFRCSV } from "../src/lib/data/transform.js";
import { buildPeriodFertility } from "../src/lib/data/period-fertility.js";

const directory = new URL("../static/data/", import.meta.url);
const countries = JSON.parse(readFileSync(new URL("countries.json", directory), "utf8"));
const asfr = parseASFRCSV(readFileSync(new URL("asfr.csv", directory), "utf8"));
const records = buildPeriodFertility(
	asfr,
	countries.map((country) => country.id)
);
writeFileSync(new URL("fertility.csv", directory), csvFormat(records) + "\n");
writeFileSync(
	new URL("sources.json", directory),
	JSON.stringify(
		[
			{
				source: "United Nations Population Division",
				edition: "World Population Prospects 2024",
				dataset: "FERT/F01",
				title: "Fertility rates by single age of mother",
				coverage: "1950-2023, ages 15-49, 37 countries and territories",
				url: "https://population.un.org/wpp/",
				note: "Single-age rates are stored in births per woman. Annual total fertility is the sum of ages 15-49 for each calendar year, without rounding before threshold comparisons. Cohort age profiles use calendar year = birth year + age; no completion imputation is used."
			}
		],
		null,
		2
	) + "\n"
);
console.log(
	`Prepared ${records.length} UN WPP 2024 period rates for ${countries.length} countries.`
);
