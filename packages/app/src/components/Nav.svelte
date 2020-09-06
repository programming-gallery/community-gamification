<script>
  import SearchBar from './SearchBar.svelte';
  export let keyType;
  export let valueType;
  export let key;
</script>

<style>
</style>

<nav>
  <nav class="flex items-center justify-between flex-wrap md:py-6 px-2">
    <div class="flex items-center flex-shrink-0 mr-6 py-2">
      <a href="/"><span class="font-semibold text-xl tracking-tight">디글</span></a>
    </div>
    <div class="flex-grow lg:flex lg:items-center lg:w-auto">
      <div class="text-sm lg:flex-grow">
        <SearchBar keyType={keyType} valueType={valueType} key={key}/>
        <!--<a href="#responsive-header" class="block mlock lg:mt-0 text-teal-200 hovewhite mr-4">
          Docs
        </a>
        <a href="#responsive-header" class="block mt-4 lg:inline-block lg:mt-0 text-teal-200 hover:text-white mr-4">
          Examples
        </a>
        <a href="#responsive-header" class="block mt-4 lg:inline-block lg:mt-0 text-teal-200 hover:text-white">
          Blog
        </a>-->
      </div>
    </div>
  </nav>
</nav>
