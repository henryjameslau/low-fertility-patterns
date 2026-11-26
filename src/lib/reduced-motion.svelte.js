import { onMount } from "svelte";

export function reducedMotion() {
	let reduced = $state(false);
	onMount(() => {
		const query = window.matchMedia("(prefers-reduced-motion: reduce)");
		const update = () => {
			reduced = query.matches;
		};
		update();
		query.addEventListener("change", update);
		return () => query.removeEventListener("change", update);
	});
	return {
		get current() {
			return reduced;
		}
	};
}
