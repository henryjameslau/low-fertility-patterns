<script>
	import { Scroller, ScrollerSection, Container } from "@onsvisual/svelte-components";
	import { fade } from "svelte/transition";

	/**
	 * ScrollySection - Wrapper for Scroller component with snippets API
	 * @type {Object}
	 */
	let { children } = $props();

	let currentIndex = $state(0);

	function handleScroller(detail) {
		currentIndex = detail.index;
	}
</script>

<Scroller onChange={handleScroller} id="scrolly-wrapper">
	{#snippet background()}
		<Container width="full" height="full">
			<div class="scene-default"></div>
		</Container>
	{/snippet}

	{#snippet foreground()}
		<ScrollerSection id="scroll-content">
			<div in:fade={{ duration: 500 }}>
				{@render children?.()}
			</div>
		</ScrollerSection>
	{/snippet}
</Scroller>

<style>
	:global(.background) {
		position: fixed;
		width: 100%;
		height: 100%;
		top: 0;
		left: 0;
		z-index: 0;
	}

	.scene-default {
		width: 100%;
		height: 100%;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}

	:global(.foreground) {
		position: relative;
		z-index: 1;
	}

	@media (max-width: 768px) {
		.scroll-content {
			max-width: 100%;
		}

		.scroll-title {
			font-size: 1.75rem;
		}

		.scroll-text {
			font-size: 1rem;
		}

		.scroll-list li {
			margin-bottom: 0.75rem;
		}
	}

	@media (max-width: 480px) {
		.scroll-content {
			padding: 1rem;
		}

		.scroll-title {
			font-size: 1.5rem;
		}

		.scroll-text {
			font-size: 0.95rem;
		}
	}
</style>
