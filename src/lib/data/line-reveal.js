/**
 * Reveal a polyline up to a shared time position, accounting for its actual stroke length.
 * @param {{x: number, y: number}[]} points
 * @param {number} targetX
 */
export function lineReveal(points, targetX) {
	const first = points[0];
	if (!first) return null;
	let total = 0;
	let drawn = 0;
	let tip = first;
	for (let i = 1; i < points.length; i++) {
		const from = points[i - 1];
		const to = points[i];
		const length = Math.hypot(to.x - from.x, to.y - from.y);
		total += length;
		if (targetX >= to.x) {
			drawn += length;
			tip = to;
		} else if (targetX > from.x) {
			const fraction = (targetX - from.x) / (to.x - from.x);
			drawn += length * fraction;
			tip = { x: targetX, y: from.y + (to.y - from.y) * fraction };
		}
	}
	return {
		...tip,
		started: targetX >= first.x,
		dashOffset: total ? 1 - drawn / total : targetX >= first.x ? 0 : 1
	};
}
