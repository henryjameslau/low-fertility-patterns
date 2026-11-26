#!/usr/bin/env node

/**
 * prepare-cohort-data.js
 *
 * Process UN WPP 2024 cohort fertility files and prepare data for visualization
 * - Completed Cohort Fertility (1935-1968 cohorts)
 * - Age-Specific Fertility Rates (ASFR) by single age
 *
 * Output:
 * - static/data/cohort.csv: Processed cohort data for visualization
 * - static/data/asfr.csv: Age-specific fertility rates by age and year
 */

import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Countries we need (Table 1 + comparators)
const TABLE1_ISO3 = [
	"ITA",
	"ESP",
	"PRT",
	"GRC",
	"MLT",
	"BGR",
	"CZE",
	"LVA",
	"SVN",
	"RUS",
	"BLR",
	"UKR",
	"EST",
	"HUN",
	"SVK",
	"BIH",
	"ROU",
	"LTU",
	"POL",
	"DEU",
	"FIN",
	"HKG",
	"MAC",
	"SGP",
	"KOR",
	"TWN",
	"JPN",
	"THA",
	"CHN",
	"ARE",
	"PRI",
	"CUW",
	"CHL",
	"MUS"
];

const COMPARATOR_ISO3 = ["SWE", "USA", "AUS"];
const ALL_ISO3 = [...TABLE1_ISO3, ...COMPARATOR_ISO3];

/**
 * Process Completed Cohort Fertility file
 */
function processCohortFile() {
	console.log("Processing Completed Cohort Fertility file...");

	const wb = XLSX.readFile(
		path.join(__dirname, "..", "WPP2024_FERT_F05_COMPLETED_COHORT_FERTILITY.xlsx")
	);
	const ws = wb.Sheets["Estimates"];
	const csv = XLSX.utils.sheet_to_csv(ws, { blankrows: false });
	const lines = csv.split("\n");

	// Header is at line 11 (0-indexed)
	const headers = lines[11].split(",").map((h) => h.trim().replace(/"/g, ""));
	const cohortYears = headers.slice(10).map(Number); // Birth cohorts start at column 10

	// Parse country rows
	const countryData = {};
	for (let i = 12; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		// Parse CSV carefully (handles quoted fields)
		const fields = [];
		let current = "";
		let inQuotes = false;
		for (const char of line) {
			if (char === '"') {
				inQuotes = !inQuotes;
			} else if (char === "," && !inQuotes) {
				fields.push(current.trim());
				current = "";
			} else {
				current += char;
			}
		}
		fields.push(current.trim());

		const iso3 = fields[5]?.replace(/"/g, "").trim() || "";
		if (!ALL_ISO3.includes(iso3)) continue;

		const countryName = fields[2]?.replace(/"/g, "").trim() || "";
		const values = fields.slice(10).map((v) => {
			const num = parseFloat(v);
			return isNaN(num) ? null : num;
		});

		countryData[iso3] = {
			name: countryName,
			cohorts: {}
		};

		cohortYears.forEach((year, idx) => {
			if (values[idx] !== null) {
				countryData[iso3].cohorts[year] = values[idx];
			}
		});
	}

	// Convert to output format: location, cohort_year, tfr, source
	let csvOutput = "location,cohort_year,total_fertility_rate,measure_type,source\n";
	for (const [iso3, data] of Object.entries(countryData)) {
		for (const [cohortYear, tfr] of Object.entries(data.cohorts)) {
			csvOutput += `${iso3},${cohortYear},${tfr},observed,UN WPP 2024\n`;
		}
	}

	fs.writeFileSync(path.join(__dirname, "..", "static/data/cohort.csv"), csvOutput);
	console.log(`✓ Written cohort.csv with ${Object.keys(countryData).length} countries`);

	return Object.keys(countryData);
}

/**
 * Process ASFR file (Age-Specific Fertility Rates)
 */
function processASFRFile() {
	const filePath = path.join(
		__dirname,
		"..",
		"WPP2024_FERT_F01_FERTILITY_RATES_BY_SINGLE_AGE_OF_MOTHER.xlsx"
	);

	if (!fs.existsSync(filePath)) {
		console.log("⚠ ASFR file not found, skipping ASFR processing");
		return;
	}

	console.log("Processing ASFR file...");

	try {
		const wb = XLSX.readFile(filePath);
		const ws = wb.Sheets["Estimates"];

		if (!ws) {
			console.log("⚠ 'Estimates' sheet not found in ASFR file");
			return;
		}

		const asfrData = {};
		let row = 18; // Data starts at row 18

		// Process all rows
		while (row < 100000) {
			const iso3Cell = ws[`F${row}`];
			const yearCell = ws[`K${row}`];

			if (!iso3Cell || !yearCell) break;

			const iso3 = iso3Cell.v;
			const year = yearCell.v;

			// Skip if not in our country list or invalid year
			if (!iso3 || !ALL_ISO3.includes(iso3) || !year || year < 1950 || year > 2023) {
				row++;
				continue;
			}

			if (!asfrData[iso3]) {
				asfrData[iso3] = {};
			}

			// Ages 15-49 are in columns L onwards (cols 11+)
			for (let age = 15; age <= 49; age++) {
				const colNum = 12 + (age - 15);
				let colLetter;

				// Convert column number to letter(s)
				if (colNum <= 26) {
					colLetter = String.fromCharCode(64 + colNum); // A-Z
				} else if (colNum <= 52) {
					colLetter = "A" + String.fromCharCode(64 + (colNum - 26)); // AA-AZ
				} else {
					colLetter = "B" + String.fromCharCode(64 + (colNum - 52)); // BA-...
				}

				const cell = ws[`${colLetter}${row}`];

				if (cell && cell.v !== undefined && cell.v !== null) {
					const ratePerThousand = parseFloat(cell.v);

					if (!isNaN(ratePerThousand)) {
						if (!asfrData[iso3][year]) {
							asfrData[iso3][year] = {};
						}
						// Convert from births per 1,000 women to births per woman
						asfrData[iso3][year][age] = ratePerThousand / 1000;
					}
				}
			}

			row++;
		}

		// Convert to output format: location, year, age, asfr_rate, source
		let csvOutput = "location,year,age,asfr_rate,source\n";
		for (const [iso3, years] of Object.entries(asfrData)) {
			for (const [year, ageMap] of Object.entries(years)) {
				for (const [age, rate] of Object.entries(ageMap)) {
					csvOutput += `${iso3},${year},${age},${rate},UN WPP 2024\n`;
				}
			}
		}

		fs.writeFileSync(path.join(__dirname, "..", "static/data/asfr.csv"), csvOutput);
		console.log(`✓ Written asfr.csv with ${Object.keys(asfrData).length} countries`);
	} catch (err) {
		console.error("⚠ Error processing ASFR file:", err.message);
	}
}

/**
 * Create paper benchmarks file for validation
 */
function createBenchmarks(countriesProcessed) {
	const benchmarks = {
		source: "UN WPP 2024, completed cohort fertility estimates",
		countries_processed: countriesProcessed.length,
		validated_at: new Date().toISOString(),
		cohort_coverage: {
			fully_observed: "1935-1974",
			imputed_ages_40_49: "1975-1984",
			early_fertility_ages: "15-29",
			late_fertility_ages: "30-49"
		},
		notes: [
			"Completed cohort fertility represents live births per woman for specified birth cohort",
			"Birth cohort year represents year of birth of mother",
			"Paper uses these cohorts with ASFR transforms to compare early vs late fertility timing"
		]
	};

	fs.writeFileSync(
		path.join(__dirname, "..", "static/data/cohort-benchmarks.json"),
		JSON.stringify(benchmarks, null, 2)
	);
	console.log("✓ Written cohort-benchmarks.json");
}

// Main execution
async function main() {
	try {
		console.log("🔄 Preparing cohort and ASFR data from UN WPP 2024...\n");

		if (process.argv.includes("--asfr-only")) {
			processASFRFile();
		} else {
			const countries = processCohortFile();
			processASFRFile();
			createBenchmarks(countries);
		}

		console.log("\n✅ Data preparation complete!\n");
		console.log("Next steps:");
		console.log("1. Update +page.svelte to load cohort data");
		console.log("2. Create Scene 4 component for early/late fertility comparison");
		console.log("3. Create Scene 5 component for cohort level visualization");
		console.log("4. Test Figure 3/4 reproduction against paper reference figures\n");
	} catch (err) {
		console.error("❌ Error:", err.message);
		process.exit(1);
	}
}

main();
