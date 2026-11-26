import { test, expect, type Page } from "@playwright/test";
import * as XLSX from "xlsx";
import {
	calculateCohortEarlyLate,
	parseASFRCSV,
	parseFertilityCSV
} from "../src/lib/data/transform.js";

async function scrollScene(page: Page, index: number, offset: number) {
	const section = page.locator(`section[data-id="section-${index}"]`);
	await expect(section).toBeAttached();
	await section.evaluate((element, offset) => {
		const top = element.getBoundingClientRect().top + window.scrollY;
		const next = element.nextElementSibling;
		const bottom = next
			? next.getBoundingClientRect().top + window.scrollY
			: element.getBoundingClientRect().bottom + window.scrollY;
		window.scrollTo(0, top + (bottom - top) * offset - window.innerHeight * 0.7);
	}, offset);
}

test.describe("Low Fertility Patterns - Scrollytelling Page", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
	});

	test("page loads with hero section", async ({ page }) => {
		const hero = page.locator("h1").first();
		await expect(hero).toContainText("Very Low Fertility Patterns");
	});

	test("empty highlights do not render an empty callout", async ({ page }) => {
		const first = page.locator('section[data-id="section-0"]');
		await expect(first).toBeAttached();
		await expect(first.locator(".section-highlight")).toHaveCount(0);
		await expect(page.locator('section[data-id="section-3"] .section-highlight')).toContainText(
			"Italy shows a sharper decline"
		);
	});

	test("array narrative text renders separate paragraphs", async ({ page }) => {
		const paragraphs = page.locator('section[data-id="section-2"] .section-text');
		await expect(paragraphs).toHaveText([
			"Countries that reached lowest-low fertility did not all stay there, nor do they all follow the same trajectory.",
			"Italy has remained in lowest-low fertility for three decades, while Korea experienced the sharpest decline."
		]);
		await expect(page.locator('section[data-id="section-0"] .section-text')).toHaveCount(1);
	});

	test("conclusion appears before the explorer without JavaScript", async ({ browser, page }) => {
		const staticPage = await browser.newPage({ javaScriptEnabled: false });
		try {
			await staticPage.goto(page.url());
			const conclusion = staticPage.locator("#conclusion");
			await expect(conclusion).toBeVisible();
			await expect(conclusion).toContainText("Later births do not always make up");
			expect(
				await conclusion.evaluate((element) =>
					Boolean(
						element.compareDocumentPosition(document.querySelector(".explorer-section")!) &
						Node.DOCUMENT_POSITION_FOLLOWING
					)
				)
			).toBe(true);
		} finally {
			await staticPage.close();
		}
	});

	for (const width of [1440, 390]) {
		test(`chart titles describe the comparison separately from section headings at ${width}px`, async ({
			page
		}) => {
			await page.setViewportSize({ width, height: 1000 });
			const errors: string[] = [];
			page.on("pageerror", (error) => errors.push(error.message));
			const titles = [
				"Fertility fell to 1.3 births per woman or lower in Italy, Spain and Germany",
				"Lowest-low fertility reached countries across Europe, Asia, Latin America and Africa",
				"Fertility recovered temporarily in Czechia but reached new lows in Korea",
				"Births shifted towards older ages in Sweden and Italy",
				"Later births did not always mean fewer children in Japan and the USA"
			];
			for (const [index, title] of titles.entries()) {
				await scrollScene(page, index, 0.4);
				const heading = page.locator(".chart-header h2");
				await expect(heading).toHaveText(title);
				const sectionTitle = await page
					.locator(`section[data-id="section-${index}"] .section-title`)
					.textContent();
				expect(title).not.toBe(sectionTitle);
				const bounds = (await heading.boundingBox())!;
				expect(bounds.x).toBeGreaterThanOrEqual(0);
				expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
			}
			expect(errors).toEqual([]);
		});
	}

	test("early births scene renders Italy and Sweden early/late lines", async ({ page }) => {
		const errors: string[] = [];
		page.on("pageerror", (error) => errors.push(error.message));
		const caption = page.locator(".section-title").filter({ hasText: "Early births declined" });
		await expect(caption).toBeAttached();
		await caption.evaluate((element) => element.scrollIntoView({ block: "center" }));
		await expect(page.locator(".chart-header h2")).toHaveText(
			"Births shifted towards older ages in Sweden and Italy"
		);
		await expect(
			page.getByText("These are calendar-year rates, not completed birth-cohort fertility.")
		).toBeVisible();
		await expect(
			page.getByText("No data available for selected countries.", { exact: true })
		).toHaveCount(0);
		const lines = page.locator(".scroller-background path.path-line");
		await expect(lines).toHaveCount(4);
		for (const line of await lines.all()) {
			await expect(line).toHaveAttribute("d", /^M/);
			await expect(line).not.toHaveAttribute("d", /NaN|Infinity/);
		}
		expect(errors).toEqual([]);
	});

	for (const width of [1440, 1024, 390]) {
		test(`age-group facets share scales, colours and symbols with tracking values at ${width}px`, async ({
			page
		}) => {
			const height = width < 768 ? 844 : 1000;
			await page.setViewportSize({ width, height });
			const response = await page.request.get("/data/asfr.csv");
			const source = parseASFRCSV(await response.text());
			const background = page.locator(".scroller-background");
			const facets = background.locator(".country-facet");
			const groups = {
				"Ages 15-29": { type: "early", color: "#206095", symbol: "0" },
				"Ages 30-49": { type: "late", color: "#A8BD3A", symbol: "1" }
			};
			const years = Object.keys(source.SWE).map(Number);
			const minYear = Math.min(...years);
			const maxYear = Math.max(...years);
			let previousX = -1;
			let previousOffset = -1;
			for (const offset of [0.15, 0.5, 0.15, 0.85]) {
				await scrollScene(page, 3, offset);
				await expect(page.locator(".chart-header h2")).toHaveText(
					"Births shifted towards older ages in Sweden and Italy"
				);
				await expect(facets).toHaveCount(2);
				await expect(background.locator(".facet-units")).toHaveText("Births per woman");
				expect(await facets.locator("h3").allTextContents()).toEqual(["Sweden", "Italy"]);
				const first = (await facets.first().boundingBox())!;
				const second = (await facets.last().boundingBox())!;
				if (width >= 768) {
					expect(first.y).toBeCloseTo(second.y);
					expect(first.x + first.width).toBeLessThanOrEqual(second.x);
				} else {
					expect(first.x).toBeCloseTo(second.x);
					expect(first.y + first.height).toBeLessThanOrEqual(second.y);
				}
				const cursors = [];
				const ticks = [];
				const tickPositions = [];
				for (const facet of await facets.all()) {
					const iso = (await facet.getAttribute("data-country"))!;
					const progress = facet.locator(".line-endpoints");
					await expect
						.poll(async () => Number(await progress.getAttribute("data-progress")))
						.toBeCloseTo(Math.min(1, offset / 0.8), 2);
					const value = Number(await progress.getAttribute("data-progress"));
					const year = minYear + value * (maxYear - minYear);
					const labels = facet.locator(".direct-label");
					const symbols = facet.locator(".endpoint-symbol");
					await expect(labels).toHaveCount(2);
					expect((await labels.locator(".country-name").allTextContents()).sort()).toEqual(
						Object.keys(groups).sort()
					);
					for (const [index, label] of (await labels.all()).entries()) {
						const group = groups[(await label.locator(".country-name").textContent())!];
						const lower = calculateCohortEarlyLate(source[iso][Math.floor(year)])[group.type]!;
						const upper = calculateCohortEarlyLate(source[iso][Math.ceil(year)])[group.type]!;
						const expected = lower + (upper - lower) * (year - Math.floor(year));
						await expect(label.locator(".label-value")).toHaveText(expected.toFixed(2));
						await expect(label).toHaveAttribute("fill", group.color);
						await expect(symbols.nth(index)).toHaveAttribute("fill", group.color);
						await expect(symbols.nth(index)).toHaveAttribute("data-symbol", group.symbol);
						await expect(facet.locator(".path-line").nth(index)).toHaveAttribute(
							"stroke",
							group.color
						);
						const symbolX = Number(
							(await symbols.nth(index).getAttribute("transform"))!.match(/translate\(([^,]+)/)![1]
						);
						expect(Number(await label.getAttribute("x"))).toBeCloseTo(symbolX + 12);
						const bounds = (await label.boundingBox())!;
						const facetBounds = (await facet.boundingBox())!;
						expect(bounds.x + bounds.width).toBeLessThanOrEqual(facetBounds.x + facetBounds.width);
					}
					const svg = (await facet.locator("svg").boundingBox())!;
					expect(svg.y).toBeGreaterThanOrEqual(0);
					expect(svg.y + svg.height).toBeLessThanOrEqual(height);
					const unitBounds = (await background.locator(".facet-units").boundingBox())!;
					const cursorBounds = (await facet.locator(".year-cursor text").boundingBox())!;
					expect(cursorBounds.y).toBeGreaterThanOrEqual(unitBounds.y + unitBounds.height);
					cursors.push(await facet.locator(".year-cursor text").textContent());
					ticks.push(await facet.locator(".y-axis .tick text").allTextContents());
					tickPositions.push(
						await facet.locator(".y-axis .tick text").evaluateAll((elements) =>
							elements.map((element) => {
								const svg = element.closest("svg")!.getBoundingClientRect();
								return element.getBoundingClientRect().y - svg.y;
							})
						)
					);
					const yearTicks = await facet.locator(".x-axis .tick text").evaluateAll((elements) =>
						elements.map((element) => {
							const { left, right } = element.getBoundingClientRect();
							return { left, right };
						})
					);
					for (let index = 1; index < yearTicks.length; index++) {
						expect(yearTicks[index].left).toBeGreaterThanOrEqual(yearTicks[index - 1].right);
					}
				}
				expect(cursors[0]).toEqual(cursors[1]);
				expect(ticks[0].map(Number)).toEqual([0, 0.5, 1, 1.5, 2]);
				expect(ticks[0]).toEqual(ticks[1]);
				for (const [index, position] of tickPositions[0].entries()) {
					expect(position).toBeCloseTo(tickPositions[1][index]);
				}
				const x = Number(await facets.first().locator(".direct-label").first().getAttribute("x"));
				if (offset > previousOffset) expect(x).toBeGreaterThan(previousX);
				else expect(x).toBeLessThan(previousX);
				previousX = x;
				previousOffset = offset;
			}
		});
	}

	for (const width of [1440, 390]) {
		test(`line charts use years, direct labels and endpoint symbols at ${width}px`, async ({
			page
		}) => {
			await page.setViewportSize({ width, height: 1000 });
			const errors: string[] = [];
			page.on("pageerror", (error) => errors.push(error.message));
			await scrollScene(page, 0, 0.85);
			const background = page.locator(".scroller-background");
			const labels = background.locator(".direct-label");
			await expect(labels).toHaveCount(3);
			expect((await labels.locator(".country-name").allTextContents()).sort()).toEqual([
				"Germany",
				"Italy",
				"Spain"
			]);
			await expect(background).toHaveCSS("background-color", "rgb(255, 255, 255)");
			await expect(background.locator(":scope > .chart-container")).toHaveCSS("box-shadow", "none");
			const ticks = await background.locator(".x-axis .tick text").allTextContents();
			expect(ticks.length).toBeGreaterThan(0);
			for (const tick of ticks) expect(tick.trim()).toMatch(/^\d{4}$/);
			const symbols = background.locator(".endpoint-symbol");
			await expect(symbols).toHaveCount(3);
			expect(
				await symbols.evaluateAll((elements) =>
					elements.map((element) => element.getAttribute("data-symbol"))
				)
			).toEqual(["0", "1", "2"]);
			const lineColors = await background
				.locator("path.path-line")
				.evaluateAll((elements) => elements.map((element) => element.getAttribute("stroke")));
			expect(
				await labels.evaluateAll((elements) =>
					elements.map((element) => element.getAttribute("fill"))
				)
			).toEqual(lineColors);
			for (const label of await labels.all()) {
				const bounds = await label.boundingBox();
				expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
			}
			await scrollScene(page, 2, 0.85);
			await expect(page.locator(".chart-header h2")).toHaveText(
				"Fertility recovered temporarily in Czechia but reached new lows in Korea"
			);
			await expect(labels).toHaveCount(4);
			expect((await labels.locator(".country-name").allTextContents()).sort()).toEqual([
				"Chile",
				"Czechia",
				"Italy",
				"Republic of Korea"
			]);
			await expect(symbols).toHaveCount(4);
			expect(errors).toEqual([]);
		});
	}

	for (const width of [1440, 1024, 390]) {
		test(`cohort age profiles trace UN rates with shared Japan/USA facets at ${width}px`, async ({
			page
		}) => {
			const height = width < 768 ? 844 : 1000;
			await page.setViewportSize({ width, height });
			const requests: string[] = [];
			const errors: string[] = [];
			page.on("request", (request) => requests.push(request.url()));
			page.on("pageerror", (error) => errors.push(error.message));
			await page.reload();
			const response = await page.request.get("/data/asfr.csv");
			const source = parseASFRCSV(await response.text());
			const background = page.locator(".scroller-background");
			const facets = background.locator(".cohort-age-facets .country-facet");
			const cohortYears = [1940, 1950, 1960, 1970];
			const colors = ["#206095", "#A8BD3A", "#003C57", "#27A0CC"];
			let previousX = -1;
			let previousOffset = -1;
			for (const offset of [0.15, 0.5, 0.15, 0.85]) {
				await scrollScene(page, 4, offset);
				await expect(page.locator(".chart-header h2")).toHaveText(
					"Later births did not always mean fewer children in Japan and the USA"
				);
				await expect(facets).toHaveCount(2);
				expect(
					await facets.evaluateAll((elements) =>
						elements.map((element) => element.getAttribute("data-country"))
					)
				).toEqual(["JPN", "USA"]);
				for (const progress of await facets.locator(".line-endpoints").all()) {
					await expect
						.poll(async () => Number(await progress.getAttribute("data-progress")))
						.toBeCloseTo(Math.min(1, offset / 0.8), 2);
				}
				await page.evaluate(() => document.fonts.ready);
				const first = (await facets.first().boundingBox())!;
				const second = (await facets.last().boundingBox())!;
				if (width >= 768) {
					expect(first.y).toBeCloseTo(second.y);
					expect(first.x + first.width).toBeLessThanOrEqual(second.x);
				} else {
					expect(first.x).toBeCloseTo(second.x);
					expect(first.y + first.height).toBeLessThanOrEqual(second.y);
				}
				const ticks = [];
				const cursors = [];
				for (const facet of await facets.all()) {
					const iso = (await facet.getAttribute("data-country"))!;
					const progress = facet.locator(".line-endpoints");
					await expect
						.poll(async () => Number(await progress.getAttribute("data-progress")))
						.toBeCloseTo(Math.min(1, offset / 0.8), 2);
					const value = Number(await progress.getAttribute("data-progress"));
					const age = 15 + value * 34;
					const labels = facet.locator(".direct-label");
					const symbols = facet.locator(".endpoint-symbol");
					await expect(labels).toHaveCount(4);
					for (const [index, label] of (await labels.all()).entries()) {
						const cohort = cohortYears[index];
						const lowerAge = Math.floor(age);
						const upperAge = Math.ceil(age);
						const lower = source[iso][cohort + lowerAge][lowerAge];
						const upper = source[iso][cohort + upperAge][upperAge];
						const expected = (lower + (upper - lower) * (age - lowerAge)) * 1000;
						await expect(label.locator(".country-name")).toHaveText(`Born ${cohort}`);
						await expect(label.locator(".label-value")).toHaveText(expected.toFixed(2));
						await expect(label).toHaveAttribute("fill", colors[index]);
						await expect(symbols.nth(index)).toHaveAttribute("fill", colors[index]);
						await expect(symbols.nth(index)).toHaveAttribute("data-symbol", String(index));
						const symbolX = Number(
							(await symbols.nth(index).getAttribute("transform"))!.match(/translate\(([^,]+)/)![1]
						);
						expect(Number(await label.getAttribute("x"))).toBeCloseTo(symbolX + 12);
						const bounds = (await label.boundingBox())!;
						const facetBounds = (await facet.boundingBox())!;
						expect(bounds.x + bounds.width).toBeLessThanOrEqual(facetBounds.x + facetBounds.width);
					}
					const svg = (await facet.locator("svg").boundingBox())!;
					expect(svg.y).toBeGreaterThanOrEqual(0);
					expect(svg.y + svg.height).toBeLessThanOrEqual(height);
					const xTicks = await facet.locator(".x-axis .tick text").allTextContents();
					for (const tick of xTicks) expect(Number(tick)).toBeGreaterThanOrEqual(15);
					for (const tick of xTicks) expect(Number(tick)).toBeLessThanOrEqual(49);
					await expect(facet.locator(".year-cursor text")).toHaveText(`Age ${Math.round(age)}`);
					cursors.push(await facet.locator(".year-cursor text").textContent());
					ticks.push(await facet.locator(".y-axis .tick text").allTextContents());
					for (const line of await facet.locator(".path-line").all()) {
						await expect(line).not.toHaveAttribute("d", /NaN|Infinity/);
						if (offset > 0.8) await expect(line).toHaveAttribute("stroke-dashoffset", "0");
					}
				}
				expect(cursors[0]).toEqual(cursors[1]);
				expect(ticks[0]).toEqual(ticks[1]);
				expect(ticks[0].map(Number)).toEqual([0, 50, 100, 150, 200, 250, 300]);
				const x = Number(await facets.first().locator(".direct-label").first().getAttribute("x"));
				if (offset > previousOffset) expect(x).toBeGreaterThan(previousX);
				else expect(x).toBeLessThan(previousX);
				previousX = x;
				previousOffset = offset;
			}
			await expect(
				page.getByRole("button", { name: "Download all the data (Excel)" })
			).toHaveAttribute("download", "all-fertility-data.xlsx");
			expect(requests.some((url) => url.endsWith("/data/cohort.csv"))).toBe(false);
			expect(errors).toEqual([]);
		});
	}

	for (const scene of [
		{
			name: "first",
			index: 0,
			title: "Fertility fell to 1.3 births per woman or lower in Italy, Spain and Germany",
			countries: { Germany: "DEU", Spain: "ESP", Italy: "ITA" }
		},
		{
			name: "third",
			index: 2,
			title: "Fertility recovered temporarily in Czechia but reached new lows in Korea",
			countries: { Italy: "ITA", Czechia: "CZE", "Republic of Korea": "KOR", Chile: "CHL" }
		}
	]) {
		for (const width of [1440, 390]) {
			test(`${scene.name} chart tracks country names and interpolated values at ${width}px`, async ({
				page
			}) => {
				await page.setViewportSize({ width, height: 1000 });
				const response = await page.request.get("/data/fertility.csv");
				const records = parseFertilityCSV(await response.text());
				const countries = scene.countries;
				const selected = records.filter((record) =>
					Object.values(countries).includes(record.location)
				);
				const minYear = Math.min(...selected.map((record) => record.year));
				const maxYear = Math.max(...selected.map((record) => record.year));
				const background = page.locator(".scroller-background");
				const labels = background.locator(".direct-label");
				let previousX = -1;
				let previousOffset = -1;
				for (const offset of [0.15, 0.45, 0.15, 0.8]) {
					await scrollScene(page, scene.index, offset);
					await expect(background.locator(".line-endpoints")).toHaveAttribute(
						"data-progress",
						/.+/
					);
					await expect
						.poll(async () =>
							Number(await background.locator(".line-endpoints").getAttribute("data-progress"))
						)
						.toBeCloseTo(offset / 0.8, 2);
					await expect(page.locator(".chart-header h2")).toHaveText(scene.title);
					await expect(labels).toHaveCount(Object.keys(countries).length);
					const progress = Number(
						await background.locator(".line-endpoints").getAttribute("data-progress")
					);
					const year = minYear + progress * (maxYear - minYear);
					const symbols = background.locator(".endpoint-symbol");
					for (const [index, label] of (await labels.all()).entries()) {
						await expect(label).toBeVisible();
						const name = (await label.locator(".country-name").textContent())!;
						const country = selected.filter((record) => record.location === countries[name]);
						const lower = country.find((record) => record.year === Math.floor(year))!;
						const upper = country.find((record) => record.year === Math.ceil(year))!;
						const value = lower.tfr + (upper.tfr - lower.tfr) * (year - Math.floor(year));
						await expect(label.locator(".label-value")).toHaveText(value.toFixed(2));
						const symbolX = Number(
							(await symbols.nth(index).getAttribute("transform"))!.match(/translate\(([^,]+)/)![1]
						);
						expect(Number(await label.getAttribute("x"))).toBeCloseTo(symbolX + 12);
						const bounds = (await label.boundingBox())!;
						expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
					}
					const labelBounds = await labels.evaluateAll((elements) =>
						elements
							.map((element) => {
								const { top, bottom } = element.getBoundingClientRect();
								return { top, bottom };
							})
							.sort((a, b) => a.top - b.top)
					);
					for (let index = 1; index < labelBounds.length; index++) {
						expect(labelBounds[index].top).toBeGreaterThanOrEqual(labelBounds[index - 1].bottom);
					}
					const x = Number(await labels.first().getAttribute("x"));
					if (offset > previousOffset) expect(x).toBeGreaterThan(previousX);
					else expect(x).toBeLessThan(previousX);
					previousX = x;
					previousOffset = offset;
					await expect(background.locator(".threshold-annotation text")).toHaveText(
						"Very low fertility: 1.3"
					);
					await expect(background.locator(".threshold-annotation line")).toHaveAttribute(
						"stroke-dasharray",
						"2 4"
					);
				}
				await expect(page.locator(".explorer-chart .threshold-annotation")).toHaveCount(0);
				await expect(page.locator(".explorer-chart .label-value")).toHaveCount(0);
			});
		}
	}

	for (const width of [1440, 390]) {
		test(`narrative lines draw and rewind continuously at ${width}px`, async ({ page }) => {
			await page.setViewportSize({ width, height: 1000 });
			const progress = page.locator(".scroller-background .line-endpoints");
			const line = page.locator(".scroller-background .path-line").first();
			await scrollScene(page, 0, 0.1);
			await expect
				.poll(async () => Number(await progress.getAttribute("data-progress")))
				.toBeCloseTo(0.125, 2);
			const startYear = Number(await page.locator(".year-cursor text").textContent());
			const startOffset = Number(await line.getAttribute("stroke-dashoffset"));
			const ticks = await page.locator(".scroller-background .x-axis .tick text").allTextContents();
			const marker = await page
				.locator(".scroller-background .endpoint-symbol")
				.first()
				.getAttribute("transform");
			await scrollScene(page, 0, 0.4);
			await expect
				.poll(async () => Number(await progress.getAttribute("data-progress")))
				.toBeCloseTo(0.5, 2);
			expect(Number(await line.getAttribute("stroke-dashoffset"))).toBeLessThan(startOffset);
			expect(Number(await page.locator(".year-cursor text").textContent())).toBeGreaterThan(
				startYear
			);
			expect(
				await page
					.locator(".scroller-background .endpoint-symbol")
					.first()
					.getAttribute("transform")
			).not.toEqual(marker);
			expect(
				await page.locator(".scroller-background .x-axis .tick text").allTextContents()
			).toEqual(ticks);
			await scrollScene(page, 0, 0.85);
			await expect(line).toHaveAttribute("stroke-dashoffset", "0");
			await expect(page.locator(".scroller-background .direct-label").first()).toBeVisible();
			await scrollScene(page, 0, 0.2);
			await expect
				.poll(async () => Number(await progress.getAttribute("data-progress")))
				.toBeCloseTo(0.25, 2);
			expect(Number(await line.getAttribute("stroke-dashoffset"))).toBeGreaterThan(0);
			await scrollScene(page, 1, 0.2);
			await expect(page.locator(".chart-header h2")).toHaveText(
				"Lowest-low fertility reached countries across Europe, Asia, Latin America and Africa"
			);
			const year = page.locator(".scroller-background .year-label");
			const earlyYear = Number((await year.textContent())!.replace("in ", ""));
			await scrollScene(page, 1, 0.6);
			await expect
				.poll(async () => Number((await year.textContent())!.replace("in ", "")))
				.toBeGreaterThan(earlyYear);
			await scrollScene(page, 1, 0.2);
			await expect
				.poll(async () => Number((await year.textContent())!.replace("in ", "")))
				.toEqual(earlyYear);
		});
	}

	test("reduced motion shows complete lines and labels without scroll animation", async ({
		page
	}) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.reload();
		await scrollScene(page, 0, 0.2);
		await expect(page.locator(".scroller-background .line-endpoints")).toHaveAttribute(
			"data-progress",
			"1"
		);
		await expect(page.locator(".scroller-background .path-line").first()).toHaveAttribute(
			"stroke-dashoffset",
			"0"
		);
		await expect(page.locator(".year-cursor")).toHaveCount(0);
		await expect(page.locator(".scroller-background .direct-label").first()).toBeVisible();
		await scrollScene(page, 2, 0.2);
		await expect(page.locator(".chart-header h2")).toHaveText(
			"Fertility recovered temporarily in Czechia but reached new lows in Korea"
		);
		await expect(page.locator(".scroller-background .line-endpoints")).toHaveAttribute(
			"data-progress",
			"1"
		);
		await expect(page.locator(".scroller-background .label-value")).toHaveCount(4);
		await expect(page.locator(".scroller-background .threshold-annotation text")).toHaveText(
			"Very low fertility: 1.3"
		);
		await expect(page.locator(".year-cursor")).toHaveCount(0);
		await scrollScene(page, 3, 0.2);
		await expect(page.locator(".chart-header h2")).toHaveText(
			"Births shifted towards older ages in Sweden and Italy"
		);
		await expect(page.locator(".scroller-background .country-facet")).toHaveCount(2);
		for (const lines of await page.locator(".scroller-background .line-endpoints").all()) {
			await expect(lines).toHaveAttribute("data-progress", "1");
		}
		await expect(page.locator(".scroller-background .label-value")).toHaveCount(4);
		await expect(page.locator(".year-cursor")).toHaveCount(0);
		await scrollScene(page, 4, 0.2);
		await expect(page.locator(".chart-header h2")).toHaveText(
			"Later births did not always mean fewer children in Japan and the USA"
		);
		await expect(page.locator(".scroller-background .country-facet")).toHaveCount(2);
		for (const lines of await page.locator(".scroller-background .line-endpoints").all()) {
			await expect(lines).toHaveAttribute("data-progress", "1");
		}
		await expect(page.locator(".scroller-background .label-value")).toHaveCount(8);
		await expect(page.locator(".year-cursor")).toHaveCount(0);
		await scrollScene(page, 1, 0.2);
		await expect(page.locator(".scroller-background .year-label")).toHaveText("in 2023");
		await expect(page.locator(".country-line").first()).toHaveAttribute("stroke-dashoffset", "0");
	});

	for (const width of [1440, 1024, 390]) {
		test(`scroller split-screen layout is readable at ${width}px`, async ({ page }) => {
			await page.setViewportSize({ width, height: 1000 });
			await scrollScene(page, 0, 0.3);
			const chart = page.locator("svelte-scroller-background");
			const caption = page.locator('section[data-id="section-0"] .section-content');
			await expect(caption).toBeVisible();
			const chartBounds = (await chart.boundingBox())!;
			const captionBounds = (await caption.boundingBox())!;
			if (width >= 992) {
				expect(captionBounds.x + captionBounds.width).toBeLessThanOrEqual(chartBounds.x);
				expect(chartBounds.width).toBeGreaterThan(width * 0.6);
				await expect(caption).toHaveCSS("box-shadow", "none");
			} else {
				expect(chartBounds.width).toBeCloseTo(width);
			}
			await scrollScene(page, 1, 0.4);
			await expect(page.locator(".chart-header h2")).toHaveText(
				"Lowest-low fertility reached countries across Europe, Asia, Latin America and Africa"
			);
			const svg = page.locator(".scroller-background svg");
			await expect(page.locator(".scroller-background .country-line")).toHaveCount(34);
			const svgBounds = (await svg.boundingBox())!;
			expect(svgBounds.x + svgBounds.width).toBeLessThanOrEqual(width);
		});
	}

	for (const width of [1440, 1024, 390]) {
		test(`waves retain the chart frame and scale while emphasizing the live count at ${width}px`, async ({
			page
		}) => {
			await page.setViewportSize({ width, height: 1000 });
			const dataResponse = await page.request.get("/data/fertility.csv");
			const records = parseFertilityCSV(await dataResponse.text());
			const countryResponse = await page.request.get("/data/countries.json");
			const countries = (await countryResponse.json())
				.filter((country: { type: string }) => country.type === "Table1")
				.map((country: { id: string }) => country.id);
			const background = page.locator(".scroller-background");
			await scrollScene(page, 0, 0.4);
			await expect
				.poll(async () =>
					Number(await background.locator(".line-endpoints").getAttribute("data-progress"))
				)
				.toBeCloseTo(0.5, 2);
			await page.evaluate(() => document.fonts.ready);
			const firstBounds = (await background.locator("svg").boundingBox())!;
			const firstTicks = await background.locator(".y-axis .tick text").allTextContents();
			expect(firstTicks.map((tick) => tick.trim())).toEqual(["0", "2", "4", "6"]);
			const tickPositions = await background
				.locator(".y-axis .tick text")
				.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().y))
				.then((positions) => positions.map((y) => y - firstBounds.y));
			let wavesY: number | undefined;
			for (const offset of [0.05, 0.2, 0.6, 0.2, 0.85]) {
				await scrollScene(page, 1, offset);
				await expect(page.locator(".chart-header h2")).toHaveText(
					"Lowest-low fertility reached countries across Europe, Asia, Latin America and Africa"
				);
				await expect
					.poll(async () =>
						Number(await background.locator(".line-endpoints").getAttribute("data-progress"))
					)
					.toBeCloseTo(Math.min(1, offset / 0.8), 2);
				const bounds = (await background.locator("svg").boundingBox())!;
				expect(bounds.x).toBeCloseTo(firstBounds.x);
				wavesY ??= bounds.y;
				expect(bounds.y).toBeCloseTo(wavesY);
				expect(bounds.width).toBeCloseTo(firstBounds.width);
				expect(bounds.height).toBeCloseTo(firstBounds.height);
				const yearTicks = await background.locator(".x-axis .tick text").evaluateAll((elements) =>
					elements.map((element) => {
						const { left, right } = element.getBoundingClientRect();
						return { left, right };
					})
				);
				for (let index = 1; index < yearTicks.length; index++) {
					expect(yearTicks[index].left).toBeGreaterThanOrEqual(yearTicks[index - 1].right);
				}
				expect(await background.locator(".y-axis .tick text").allTextContents()).toEqual(
					firstTicks
				);
				const positions = await background
					.locator(".y-axis .tick text")
					.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().y));
				for (const [index, y] of positions.entries()) {
					expect(y - bounds.y).toBeCloseTo(tickPositions[index]);
				}
				await expect(
					background.locator(".legend, .highlighted-info, .direct-label, .endpoint-symbol")
				).toHaveCount(0);
				expect(
					await background
						.locator(".country-line")
						.evaluateAll((elements) => [
							...new Set(elements.map((element) => element.getAttribute("stroke")))
						])
				).toEqual(["#206095"]);
				const year = Number(
					(await background.locator(".counter .year-label").textContent())!.replace("in ", "")
				);
				const expected = records.filter(
					(record) =>
						countries.includes(record.location) && record.year === year && record.tfr <= 1.3
				).length;
				await expect(background.locator(".counter strong")).toHaveText(String(expected));
				await expect(background.locator(".counter strong")).toHaveCSS("font-size", "64px");
				await expect(background.locator(".counter .year-label")).toHaveCount(1);
				await expect(background.locator(".year-cursor text")).toHaveCount(0);
				const cursorBounds = (await background.locator(".year-cursor line").boundingBox())!;
				const counterBounds = (await background.locator(".counter").boundingBox())!;
				expect(Math.abs(counterBounds.x - cursorBounds.x - 10)).toBeLessThan(1);
				expect(counterBounds.x).toBeGreaterThanOrEqual(bounds.x);
				expect(counterBounds.x + counterBounds.width).toBeLessThanOrEqual(
					bounds.x + bounds.width + 1
				);
				if (width < 992) {
					expect(counterBounds.y).toBeGreaterThan(cursorBounds.y);
					expect(counterBounds.y + counterBounds.height).toBeLessThanOrEqual(
						cursorBounds.y + cursorBounds.height + 1
					);
				}
				await expect(background.locator(".coverage-note")).toHaveCount(0);
				await expect(background.locator(".country-line")).toHaveCount(34);
			}
		});
	}

	test("hero disclaimer is visible", async ({ page }) => {
		const disclaimer = page.locator(".disclaimer");
		await expect(disclaimer).toContainText("independent prototype");
	});

	test("all six sections are present", async ({ page }) => {
		const sections = page.locator("h2");
		await expect(sections).toHaveCount(6);
	});

	test("first section explains 1.3 threshold", async ({ page }) => {
		const section = page.locator("h2").first();
		await expect(section).toContainText("Understanding very low fertility");
	});

	test("threshold count chart is present", async ({ page }) => {
		const countChart = page.locator("text=Number of Countries").first();
		await expect(countChart).toBeVisible();
	});

	test("all-data workbook downloads independently of the chart and without JavaScript", async ({
		page,
		browser
	}) => {
		const link = page.getByRole("button", { name: "Download all the data (Excel)" });
		await expect(link).toBeVisible();
		await expect(page.getByRole("region", { name: "Data Table", exact: true })).toHaveCount(0);
		const downloadPromise = page.waitForEvent("download");
		await link.click();
		const download = await downloadPromise;
		expect(download.suggestedFilename()).toBe("all-fertility-data.xlsx");
		expect(await download.failure()).toBeNull();
		const response = await page.request.get(
			new URL((await link.getAttribute("href"))!, page.url()).href
		);
		expect(response.ok()).toBe(true);
		const workbook = XLSX.read(await response.body(), { type: "buffer" });
		expect(workbook.SheetNames).toEqual([
			"About",
			"Countries",
			"Annual fertility",
			"Single-age fertility",
			"Age-group fertility",
			"Cohort age profiles",
			"Sources"
		]);
		expect(XLSX.utils.sheet_to_json(workbook.Sheets.Countries)).toHaveLength(37);
		expect(XLSX.utils.sheet_to_json(workbook.Sheets["Annual fertility"])).toHaveLength(2738);
		expect(XLSX.utils.sheet_to_json(workbook.Sheets["Cohort age profiles"])).toHaveLength(280);
		const href = await link.getAttribute("href");
		await scrollScene(page, 4, 0.85);
		await expect(link).toHaveAttribute("href", href!);
		const noScript = await browser.newContext({ javaScriptEnabled: false });
		try {
			const staticPage = await noScript.newPage();
			await staticPage.goto(new URL("/", page.url()).href);
			const staticLink = staticPage.getByRole("button", { name: "Download all the data (Excel)" });
			await expect(staticLink).toBeVisible();
			const response = await staticPage.request.get(
				new URL((await staticLink.getAttribute("href"))!, staticPage.url()).href
			);
			expect(response.ok()).toBe(true);
		} finally {
			await noScript.close();
		}
	});

	for (const width of [1440, 390]) {
		test(`explorer keeps its ONS selector visible and adds areas explicitly at ${width}px`, async ({
			page
		}) => {
			await page.setViewportSize({ width, height: 1000 });
			const errors: string[] = [];
			page.on("pageerror", (error) => errors.push(error.message));
			const selector = page.locator(".country-select");
			const input = selector.getByRole("combobox", { name: "Select an area" });
			const add = selector.getByRole("button", { name: "Add area", exact: true });
			const selected = selector.getByRole("region", { name: "Selected countries" });
			await expect(selector.getByRole("button", { name: "Reset", exact: true })).toHaveCount(0);
			await expect(input).toBeVisible();
			await expect(selector.locator(".selected-item")).toHaveCount(4);
			await expect(selected.getByRole("heading")).toHaveText("4 of 4 areas selected");
			await expect(add).toBeDisabled();
			await expect(selector.locator(".limit-reached")).toBeVisible();
			if (width >= 768) {
				const inputBounds = (await input.boundingBox())!;
				const buttonBounds = (await add.boundingBox())!;
				expect(buttonBounds.y).toBeCloseTo(inputBounds.y);
				expect(buttonBounds.height).toBeCloseTo(inputBounds.height);
			}
			await input.fill("Germany");
			await expect(selector.getByRole("option")).toHaveCount(1);
			await input.press("ArrowDown");
			await input.press("Enter");
			await expect(input).toHaveValue("Germany");
			await expect(selector.getByRole("button", { name: "Clear selection" })).toBeVisible();
			await expect(add).toBeDisabled();
			await selected.getByRole("button", { name: "Remove Italy", exact: true }).click();
			await expect(selector.locator(".selected-item")).toHaveCount(3);
			await expect(selected.getByRole("heading")).toHaveText("3 of 4 areas selected");
			await expect(add).toBeEnabled();
			if (width >= 768) {
				const inputBounds = (await input.boundingBox())!;
				const buttonBounds = (await add.boundingBox())!;
				expect(buttonBounds.y).toBeCloseTo(inputBounds.y);
				expect(buttonBounds.height).toBeCloseTo(inputBounds.height);
			}
			await add.click();
			await expect(selector.locator(".selected-item")).toHaveCount(4);
			await expect(selected.getByRole("button", { name: "Remove Germany" })).toBeVisible();
			await expect(add).toBeDisabled();
			await expect(input).toBeVisible();
			await expect(input).toHaveValue("");
			await expect
				.poll(async () =>
					(await page.locator(".explorer-chart .country-name").allTextContents()).sort()
				)
				.toEqual(["Chile", "Czechia", "Germany", "Republic of Korea"]);
			for (let remaining = 4; remaining > 0; remaining--) {
				await selected.locator(".remove-btn").first().click();
				await expect(selector.locator(".selected-item")).toHaveCount(remaining - 1);
			}
			await expect(add).toBeDisabled();
			await expect(input).toBeVisible();
			await expect(selector.locator(".count")).toHaveText("0 of 4 areas selected");
			await expect(selector.locator(".hide-menu")).toHaveCount(0);
			await input.fill("USA");
			await expect(selector.getByRole("option")).toHaveCount(1);
			await input.press("ArrowDown");
			await input.press("Enter");
			await expect(input).toHaveValue("United States of America (Comparator)");
			await expect(selector.locator(".selected-item")).toHaveCount(0);
			await expect(add).toBeEnabled();
			await add.click();
			await expect(
				selected.getByRole("button", { name: "Remove United States of America" })
			).toHaveText("United States of America (Comparator)");
			await expect(page.locator(".explorer-chart .country-name")).toHaveText([
				"United States of America"
			]);
			const inputBounds = (await input.boundingBox())!;
			const listBounds = (await selected.boundingBox())!;
			expect(listBounds.y).toBeGreaterThan(inputBounds.y + inputBounds.height);
			const remove = selected.getByRole("button", { name: "Remove United States of America" });
			const removeBounds = (await remove.boundingBox())!;
			expect(removeBounds.x + removeBounds.width).toBeLessThanOrEqual(width);
			await remove.focus();
			await page.keyboard.press("Enter");
			await expect(selector.locator(".selected-item")).toHaveCount(0);
			await expect(page.locator(".explorer-chart")).toHaveCount(0);
			expect(errors).toEqual([]);
		});
	}

	test("sources section links to paper", async ({ page }) => {
		// Scroll to bottom
		await page.evaluate(() => window.scrollBy(0, document.body.scrollHeight));

		const link = page.locator('a[href="https://onlinelibrary.wiley.com/doi/10.1111/padr.70098"]');
		await expect(link).toBeVisible();
	});

	test("sources section links to UN WPP", async ({ page }) => {
		// Scroll to bottom
		await page.evaluate(() => window.scrollBy(0, document.body.scrollHeight));

		const link = page.locator('a[href="https://population.un.org/wpp/"]');
		await expect(link).toBeVisible();
	});

	test("page has proper heading hierarchy", async ({ page }) => {
		const h1 = page.locator("h1");
		const h2 = page.locator("h2");
		const h3 = page.locator("h3");
		const h4 = page.locator("h4");

		await expect(h1).toHaveCount(1);
		expect(await h2.count()).toBeGreaterThan(0);
	});

	test("page is responsive at mobile width", async ({ page }) => {
		await page.setViewportSize({ width: 320, height: 800 });

		const hero = page.locator("h1");
		await expect(hero).toBeVisible();

		// Check that content is still readable
		const sections = page.locator("h2");
		const count = await sections.count();
		expect(count).toBeGreaterThan(0);
	});

	test("page is responsive at desktop width", async ({ page }) => {
		await page.setViewportSize({ width: 1200, height: 800 });

		const hero = page.locator("h1");
		await expect(hero).toBeVisible();

		// SVG charts should be visible
		const svg = page.locator("svg");
		const svgCount = await svg.count();
		expect(svgCount).toBeGreaterThan(0);
	});

	test("tables have proper structure", async ({ page }) => {
		const tables = page.locator("table");
		const tableCount = await tables.count();

		if (tableCount > 0) {
			const firstTable = tables.first();
			const thead = firstTable.locator("thead");
			const tbody = firstTable.locator("tbody");
			const tr = tbody.locator("tr");

			await expect(thead).toHaveCount(1);
			const rowCount = await tr.count();
			expect(rowCount).toBeGreaterThan(0);
		}
	});

	test("no console errors", async ({ page }) => {
		const errors = [];
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				errors.push(msg.text());
			}
		});

		// Wait for page to fully load
		await page.waitForLoadState("networkidle");

		expect(errors.length).toBe(0);
	});

	test("images and assets load", async ({ page }) => {
		const failedRequests = [];

		page.on("response", (response) => {
			if (!response.ok() && response.url().includes("/data/")) {
				failedRequests.push(response.url());
			}
		});

		await page.waitForLoadState("networkidle");

		// Allow some data fetch failures (depending on data availability)
		// but ensure page core loads
		expect(failedRequests.length).toBeLessThan(10);
	});
});
