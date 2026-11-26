/**
 * Sum complete single-age rates for each calendar year, in births per woman.
 * @param {Record<string, Record<number, Record<number, number>>>} asfrData
 * @param {string[]} countries
 */
export function buildPeriodFertility(asfrData, countries) {
	if (!countries.length || new Set(countries).size !== countries.length) {
		throw new Error("Period fertility needs a non-empty, unique country selection");
	}
	const records = [];
	for (const location of [...countries].sort()) {
		for (let year = 1950; year <= 2023; year++) {
			let tfr = 0;
			for (let age = 15; age <= 49; age++) {
				const rate = asfrData[location]?.[year]?.[age];
				if (typeof rate !== "number" || !Number.isFinite(rate) || rate < 0) {
					throw new Error(`Missing or invalid ASFR for ${location}, year ${year}, age ${age}`);
				}
				tfr += rate;
			}
			records.push({ location, year, tfr, source: "UN WPP 2024 F01" });
		}
	}
	return records;
}
