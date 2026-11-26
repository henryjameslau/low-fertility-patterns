# Very Low Fertility Patterns: Interactive Scrollytelling Prototype

An interactive exploration of countries experiencing lowest-low fertility (≤1.3 births per woman), based on the research paper "Commonalities and Differences in Lowest-Low Fertility Patterns" by Gianpiero Dalla-Zuanna and Tiziana Leone (Population and Development Review, 2026).

## Overview

This prototype presents an interactive scrollytelling narrative exploring how lowest-low fertility spread across 34 countries and territories between 1950 and 2023. It uses data from the UN World Population Prospects 2024 and includes an interactive tool for comparing fertility trajectories of up to four countries at a time.

The narrative is divided into six scenes:

1. **Understanding Very Low Fertility** – Introduces the 1.3 threshold concept using Italy, Spain, and Germany (entry in 1993)
2. **The Pattern Spread in Waves** – Shows how lowest-low fertility spread unevenly over time
3. **Similar Levels, Different Paths** – Compares four contrasting country trajectories
4. **Early Births Declined** – Compares calendar-year fertility at ages 15–29 and 30–49 in Sweden and Italy
5. **Later Births Did Not Always Offset** – Compares age-specific fertility profiles for the 1940, 1950, 1960 and 1970 birth cohorts in Japan and the USA
6. **Compare Country Experiences** – An interactive explorer for custom country comparison

## Getting Started

### Prerequisites

- Node.js 24+ (includes native test runner)
- npm 10+

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will start on http://localhost:5173. Open your browser and navigate to the page.

### Building

```bash
npm run build
```

Outputs a static site in the `build/` directory, ready for deployment.

### Preview

```bash
npm run preview
```

Locally preview the production build.

## Testing

### Unit Tests (Data Logic)

```bash
npm run test
```

Runs 10 test cases covering:

- Threshold crossing analysis
- Annual threshold counts
- Series filtering and sorting
- Data validation and error detection

### Browser Tests (Interactions & Accessibility)

```bash
npm run test:browser
```

Runs Playwright browser tests covering:

- Page load and structure
- Chart visibility and data tables
- Country selector functionality
- Responsive layouts (320px, 1200px)
- Heading hierarchy and accessibility
- Link integrity
- Console errors

### Full Verification

```bash
npm run verify
```

Runs linting, type checks, conventions checks, unit tests, and a strict production build.

## Project Structure

```
src/
├── routes/
│   ├── +layout.svelte       # App shell with header/footer
│   ├── +layout.js           # Metadata and data loading
│   └── +page.svelte         # Main scrollytelling page
├── lib/
│   ├── data/
│   │   ├── fertility.js      # Data loading (SvelteKit)
│   │   ├── transform.js      # Pure data transformation logic
│   │   └── fertility.test.js # Data logic tests
│   ├── content/
│   │   └── story.js          # Narrative scenes and content
│   └── components/
│       ├── FertilityTrend.svelte   # Multi-line chart
│       ├── ThresholdCount.svelte   # Area chart for counts
│       └── CountrySelect.svelte    # Country selector/explorer
└── app.css                   # Global styles

static/data/
├── countries.json            # 37 entities (34 + 3 comparators)
├── fertility.csv             # Period TFR by year (1950–2023)
└── sources.json              # Data source metadata

tests/
└── page.spec.ts              # Browser tests (Playwright)

scripts/
├── prepare-fertility-data.js # Data fetching and preparation
└── [starter templates]

package.json                  # Dependencies and scripts
```

## Data

### Source

**All chart rates:** UN World Population Prospects 2024, F01

- **Coverage:** 1950–2023 annual estimates for single ages 15–49
- **Input:** Supplied single-age fertility workbook, processed into `static/data/asfr.csv`
- **Cohorts:** For each age, use the rate in calendar year `birth year + age`. The 1940, 1950, 1960 and 1970 cohorts all have complete coverage at ages 15–49; no completion imputation is used.
- **Units:** ASFR files store births per woman. Chart five displays births per 1,000 women at each age, multiplying the stored rates by 1,000.
- **URL:** https://population.un.org/wpp/

**Annual total-fertility charts and explorer:** Sum the F01 rates at ages 15–49 within each calendar year, in births per woman. All 37 countries and territories, including Taiwan, have complete 1950–2023 coverage. Source precision is retained rather than rounding before threshold comparisons.

### Countries Included

**34 lowest-low fertility countries/territories** (Table 1 from paper):

- **Southern Europe (5):** Italy, Spain, Portugal, Greece, Malta
- **Former Communist European countries (14):** Bulgaria, Czechia, Latvia, Slovenia, Russia, Belarus, Ukraine, Estonia, Hungary, Slovakia, Bosnia and Herzegovina, Romania, Lithuania, Poland
- **North-Central Europe (2):** Germany, Finland
- **Asia (9):** Hong Kong, Macao, Singapore, Republic of Korea, Taiwan, Japan, Thailand, China, United Arab Emirates
- **Latin America & Caribbean (3):** Puerto Rico, Curaçao, Chile
- **Africa (1):** Mauritius

**3 Comparator countries:**

- Sweden, United States of America, Australia

### Data Files

- `static/data/countries.json` – Entity metadata, population, groupings
- `static/data/fertility.csv` – Period TFR by location and year
- `static/data/asfr.csv` – UN single-age calendar-year rates, used for charts four and five
- `static/data/cohort.csv` – Legacy cohort-total import; no longer loaded or used by the page
- `static/data/sources.json` – Source attribution and coverage notes
- `static/data/all-fertility-data.xlsx` – Complete download: source rates, age-group sums, cohort profiles, country metadata and notes

### Preparing Data

```bash
node scripts/prepare-fertility-data.js
```

Derives annual total fertility from the validated packaged UN single-age rates for all 37 entities and every year from 1950 to 2023. Missing ages or years fail preparation rather than yielding partial totals. No data API is called. Output files:

- `static/data/fertility.csv`
- `static/data/sources.json`

To regenerate the UN single-age input from the supplied workbook:

```bash
node scripts/prepare-cohort-data.js --asfr-only
```

Chart five reconstructs cohort age profiles from this file in the browser; it does not use the legacy cohort-total import.

Regenerate the downloadable workbook after changing the packaged data:

```bash
npm run prepare:download
```

Production and preview builds also regenerate the annual totals and workbook. The workbook contains all available countries and years, not just the current chart or explorer selection. All rates use UN WPP 2024 F01; the unused legacy cohort import and F03 birth counts are excluded.

## Visualizations

### FertilityTrend.svelte

Multi-line chart showing period total fertility rates over time.

- **Features:** Multiple countries with color coding, 1.3 threshold indicator, legend, accessible data table
- **Props:** `data`, `countries`, `countryNames`, `yearRange`, `title`, `highlightYear`

### ThresholdCount.svelte

Area chart showing the annual count of countries below 1.3 fertility.

- **Features:** Gridlines, proportional x-axis scaling, data table
- **Props:** `data`, `title`, `includeRegions`

### CountrySelect.svelte

Searchable ONS country selector with an Add area button, a live selection-count heading and removable area labels.

- **Features:** Separates Table 1 from Comparators, up-to-4 limit, visual feedback, keyboard accessible
- **Props:** `countries`, `selected`, `maxCountries`, `onAdd`, `onRemove`

## Accessibility

The prototype meets WCAG 2.2 AA standards:

- ✓ Semantic HTML and proper heading hierarchy (H1–H4)
- ✓ Visible focus indicators on interactive elements
- ✓ All charts include data tables as accessible alternatives
- ✓ No JavaScript required to access data (tables fallback)
- ✓ Keyboard navigation throughout
- ✓ Respects `prefers-reduced-motion` (future enhancement)
- ✓ Color-independent information (not relying on color alone)
- ✓ Responsive layouts: 320px (mobile) through desktop

### Tested Configurations

- Mobile: 320px viewport width
- Tablet: 768px viewport width
- Desktop: 1200px viewport width
- 200% zoom
- Keyboard-only navigation

## Responsive Design

- **Mobile (320px+):** Stacked single-column layout
- **Tablet (768px+):** Two-column layout with charts at full width
- **Desktop (1200px+):** Full-width content with side-by-side where applicable

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Tested on:

- macOS 13+
- iOS 15+
- Android 10+

## Code Conventions

- **Language:** JavaScript (ES2022+), Svelte 5 with runes
- **Formatting:** Prettier (enforced by `npm run lint`)
- **Type checking:** JSDoc comments with checked types
- **Naming:** camelCase for variables/functions, kebab-case for files
- **Components:** Svelte 5 runes (`$state`, `$derived`, snippets)

## Known Limitations & Future Work

1. **Data source:** All chart rates use UN WPP 2024 F01. The charts explain the paper's patterns but are not an exact replication of its figures.

2. **Cohort analysis:** Chart five shows complete age profiles for four historical cohorts, not an exact reproduction of the paper's baseline-relative early/late comparisons. Its imputation methodology for 1975–1984 cohorts is not implemented; those incomplete cohorts are not plotted.

3. **Regional groupings:** Currently static. Future versions may allow interactive filtering by region.

4. **Download/export:** The complete Excel workbook includes the packaged source data and derived chart measures. Missing source series remain missing.

5. **Comparison to literature:** The page does not currently show comparisons to other demographic indicators (e.g., GDP per capita, education levels, family policy scores). These are out of scope for this prototype but could enhance future versions.

## Contributing

This is a prototype developed during active research. Issues, suggestions, and pull requests are welcome. Please ensure:

- All tests pass (`npm run verify`)
- Code follows the project's conventions
- Changes include relevant test updates

## Attribution

**Research:**

- Dalla-Zuanna, Gianpiero, and Tiziana Leone. "Commonalities and Differences in Lowest-Low Fertility Patterns." _Population and Development Review_, 2026. https://doi.org/10.1111/padr.70098

**Data:**

- United Nations, Department of Economic and Social Affairs, Population Division. _World Population Prospects 2024_. https://population.un.org/wpp/

**Technology:**

- Svelte 5 (https://svelte.dev)
- SvelteKit 2 (https://kit.svelte.dev)
- ONS Svelte Components (https://github.com/ONSdigital/svelte-components)
- Vite 7 (https://vitejs.dev)
- Playwright (https://playwright.dev)

**Prototype developed with:** GitHub Copilot CLI and ONS Digital Publishing skills

## License

This prototype is provided as-is for research and educational purposes. The underlying paper is published open-access. The code is available under the MIT License (see LICENSE file).

The supplied PDF and EPUB of the paper are copyright © 2026 by their respective publishers and are provided for reference only.

## Support & Questions

For questions about the prototype, please file an issue in the repository.

For questions about the research, refer to the paper or contact the authors through the publisher.

---

**Last updated:** November 2026
**Version:** 1.0.0 (Prototype)
**Status:** Active development (ready for user testing)
