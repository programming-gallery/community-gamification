<script>
  import SearchBar from '../components/SearchBar.svelte'
  let test = "";
</script>

<style>
</style>

<svelte:head>
	<title>디글</title>
</svelte:head>

<div class="flex flex-col items-center">
  <a href="/"><h1 class="text-6xl font-semibold my-16">디글</h1></a>
  <SearchBar />
</div>
