import { test } from "node:test";
import assert from "node:assert/strict";
import { spreadEndpointLabels } from "./chart-labels.js";

test("endpoint labels stay in plot bounds and separate close endpoints in series order", () => {
	const result = spreadEndpointLabels([90, 92, 91, -2], 100);
	assert(result.every((y) => y >= 8 && y <= 92));
	assert(result[3] < result[0] && result[0] < result[2] && result[2] < result[1]);
	const sorted = [...result].sort((a, b) => a - b);
	assert(sorted.slice(1).every((y, index) => y - sorted[index] >= 20));
});

test("separated endpoint labels are left at their original heights", () => {
	assert.deepEqual(spreadEndpointLabels([80, 20, 50], 100), [80, 20, 50]);
});
