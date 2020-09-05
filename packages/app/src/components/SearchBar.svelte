<script>
  export let keyType = 'uni';
  export let valueType = 'doc';
  export let key = '';
  let keyTypes = [
    {keyType: 'uni', name: '닉(아이피)', placeholder: 'ex) ㅇㅇ(110.70)'},
    {keyType: 'uip', name: '아이피', placeholder: 'ex) 110.70'},
    {keyType: 'unn', name: '닉네임', placeholder: 'ex) ㅇㅇ'},
    {keyType: 'uid', name: '아이디', placeholder: ''},
  ];
  let selectedKeyType = keyTypes.find(k => k.keyType === keyType);
  let valueTypes = [
    {valueType: 'doc', name: '게시글'},
    {valueType: 'com', name: '댓글'},
  ];
  let selectedValueType = valueTypes.find(v => v.valueType === valueType);
</script>
<style>
</style>
<div class="inline-block text-center">
  <div class="relative inline-block text-xs">
    <select bind:value={selectedValueType} 
            class="bg-white focus:outline-none focus:shadow-outline border border-gray-300 hover:border-gray-500 rounded-lg py-2 px-2 pr-6 appearance-none leading-normal block"
            on:change={key = ''} >
      {#each valueTypes as valueType}
        <option value={valueType}>
        {valueType.name}
        </option>
      {/each}
    </select>
    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
      <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
    </div>
  </div>
  <div class="relative inline-block text-xs">
    <select bind:value={selectedKeyType} 
            class="bg-white focus:outline-none focus:shadow-outline border border-gray-300 hover:border-gray-500 rounded-lg py-2 px-2 pr-6 appearance-none leading-normal block">
      {#each keyTypes as keyType}
        <option value={keyType}>
        {keyType.name}
        </option>
      {/each}
    </select>
    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
      <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
    </div>
  </div>
  <form action="/q" method="GET" class="inline-block relative">
    <input type="hidden" name="keyType" value={selectedKeyType.keyType} />
    <input type="hidden" name="valueType" value={selectedValueType.valueType} />
    <input bind:value={key} autofocus
           class="bg-white focus:outline-none focus:shadow-outline border border-gray-300 hover:border-gray-500 rounded-lg py-2 px-4 appearance-none leading-normal"
                  type="search" name="key" placeholder={selectedKeyType.placeholder}>
    <button type="submit" class="absolute inset-y-0 right-0 mr-2 flex items-center px-2 text-gray-700">
      <svg class="text-gray-600 h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Capa_1" x="0px" y="0px" viewBox="0 0 56.966 56.966" style="enable-background:new 0 0 56.966 56.966;" xml:space="preserve" width="512px" height="512px">
        <path d="M55.146,51.887L41.588,37.786c3.486-4.144,5.396-9.358,5.396-14.786c0-12.682-10.318-23-23-23s-23,10.318-23,23  s10.318,23,23,23c4.761,0,9.298-1.436,13.177-4.162l13.661,14.208c0.571,0.593,1.339,0.92,2.162,0.92  c0.779,0,1.518-0.297,2.079-0.837C56.255,54.982,56.293,53.08,55.146,51.887z M23.984,6c9.374,0,17,7.626,17,17s-7.626,17-17,17  s-17-7.626-17-17S14.61,6,23.984,6z"></path>
      </svg>
    </button>
  </form>
</div>
