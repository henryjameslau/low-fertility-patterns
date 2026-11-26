import { test } from "node:test";
import assert from "node:assert/strict";
import { lineReveal } from "./line-reveal.js";

test("stroke reveal follows the shared year position rather than fraction of path length", () => {
	const points = [
		{ x: 0, y: 0 },
		{ x: 10, y: 100 },
		{ x: 100, y: 100 }
	];
	const tip = lineReveal(points, 50);
	assert.equal(tip.x, 50);
	assert.equal(tip.y, 100);
	const total = Math.hypot(10, 100) + 90;
	assert(Math.abs(tip.dashOffset - 50 / total) < 1e-10);
});

test("stroke reveal clamps before/after data and rewinds without changing the path", () => {
	const points = [
		{ x: 20, y: 0 },
		{ x: 40, y: 20 }
	];
	assert.deepEqual(lineReveal(points, 10), { x: 20, y: 0, started: false, dashOffset: 1 });
	assert.deepEqual(lineReveal(points, 50), { x: 40, y: 20, started: true, dashOffset: 0 });
	assert.deepEqual(lineReveal(points, 30), { x: 30, y: 10, started: true, dashOffset: 0.5 });
	assert.deepEqual(points, [
		{ x: 20, y: 0 },
		{ x: 40, y: 20 }
	]);
});
