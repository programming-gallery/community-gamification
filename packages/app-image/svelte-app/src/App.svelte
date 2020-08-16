<script lang="ts">
	import Tailwindcss from './Tailwindcss.svelte';
  import GalleryMap from './GalleryMap.svelte';
	//export let name: string;
</script>
<style>
	.custom-style {
		@apply italic;
	}
</style>
<Tailwindcss />
<main class="mx-auto text-center">
  <GalleryMap />
</main>
