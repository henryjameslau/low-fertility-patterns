/**
 * Keep endpoint labels separated without changing their vertical order.
 * @param {number[]} positions
 * @param {number} height
 * @param {number} [gap]
 */
export function spreadEndpointLabels(positions, height, gap = 20) {
	if (!positions.length) return [];
	const sorted = positions.map((y, index) => ({ y, index })).sort((a, b) => a.y - b.y);
	const top = 8;
	const bottom = height - 8;
	const spacing = Math.min(gap, (bottom - top) / Math.max(1, sorted.length - 1));
	const placed = sorted.map((item) => Math.max(top, Math.min(bottom, item.y)));
	for (let i = 1; i < placed.length; i++) {
		placed[i] = Math.max(placed[i], placed[i - 1] + spacing);
	}
	placed[placed.length - 1] = Math.min(bottom, placed[placed.length - 1]);
	for (let i = placed.length - 2; i >= 0; i--) {
		placed[i] = Math.min(placed[i], placed[i + 1] - spacing);
	}
	const result = [];
	sorted.forEach((item, index) => {
		result[item.index] = placed[index];
	});
	return result;
}
