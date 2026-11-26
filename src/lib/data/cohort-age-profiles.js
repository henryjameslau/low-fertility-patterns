/**
 * Reconstruct complete cohort age profiles from WPP 2024 calendar-year rates.
 * @param {Record<string, Record<number, Record<number, number>>>} asfrData
 * @param {string[]} countries
 * @param {number[]} cohorts
 * @returns {{location: string, cohortYear: number, age: number, calendarYear: number, rate: number}[]}
 */
export function buildCohortAgeProfiles(asfrData, countries, cohorts) {
	if (new Set(countries).size !== countries.length || new Set(cohorts).size !== cohorts.length) {
		throw new Error("Country and cohort selections must not contain duplicates");
	}
	for (const cohortYear of cohorts) {
		if (!Number.isInteger(cohortYear) || cohortYear < 1935 || cohortYear > 1974) {
			throw new Error(
				`Birth cohort ${cohortYear} is outside complete WPP 2024 coverage (1935-1974)`
			);
		}
	}
	const records = [];
	for (const location of countries) {
		for (const cohortYear of [...cohorts].sort((a, b) => a - b)) {
			for (let age = 15; age <= 49; age++) {
				const calendarYear = cohortYear + age;
				const rate = asfrData[location]?.[calendarYear]?.[age];
				if (typeof rate !== "number" || !Number.isFinite(rate) || rate < 0) {
					throw new Error(
						`Missing or invalid ASFR for ${location}, year ${calendarYear}, age ${age} (born ${cohortYear})`
					);
				}
				records.push({ location, cohortYear, age, calendarYear, rate });
			}
		}
	}
	return records;
}
