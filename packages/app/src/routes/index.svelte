<script>
  import SearchBar from '../components/SearchBar.svelte'
  let test = "";
</script>
<style>
	h1, figure, p {
		/*text-align: center;
		margin: 0 auto;*/
	}

	h1 {
		/*font-size: 2.8em;
		text-transform: uppercase;
		font-weight: 700;
		margin: 0 0 0.5em 0;*/
	}

	figure {
		margin: 0 0 1em 0;
	}

	img {
		width: 100%;
		max-width: 400px;
		margin: 0 0 1em 0;
	}

	p {
		margin: 1em auto;
	}

	@media (min-width: 480px) {
		h1 {
			font-size: 4em;
		}
	}
</style>

<svelte:head>
	<title>디글</title>
</svelte:head>

<div class="flex flex-col items-center">
  <a href="/"><h1 class="text-xl font-semibold my-16">디글</h1></a>
  <SearchBar />
</div>
