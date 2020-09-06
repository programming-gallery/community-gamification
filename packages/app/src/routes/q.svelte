<script context="module">
	export async function preload({ query }) {
    let list = await (await this.fetch(`/api/q?valueType=${query.valueType}&keyType=${query.keyType}&key=${query.key}&timestamp=${query.timestamp}`)).json()
    return { 
      list, 
      key: query.key, 
      valueType: query.valueType, 
      keyType: query.keyType, 
      nextTimestamp: list.length? list[list.length-1].originalcreatedat : null,
    };
	}

</script>

<script>
  import Nav from '../components/Nav.svelte'
	export let list = [];
  export let key;
  export let valueType;
  export let keyType;
  export let nextTimestamp;
  let active = "doc";
</script>

<style>
</style>

<svelte:head>
  <title>{key}에 대한 검색 결과</title>
</svelte:head>
<Nav key={key} valueType={valueType} keyType={keyType} />
<ul class="flex md:flex-row flex-col">
  <li class="flex-1">
    {#if valueType === 'doc'}
    <table class="table-auto border-collapse w-full text-sm whitespace-no-wrap">
      <colgroup>
        <col width="0%" />
        <col width="100%" />
        <col width="0%" />
        <col width="0%" />
        <col width="0%" />
        <col width="0%" />
      </colgroup>
      <thead class="text-center">
        <tr class="rounded-lg text-sm border-b"> 
          <th class="py-2">갤러리</th>
          <th class="">제목</th>
          <th class="hidden md:table-cell">작성자</th>
          <th class="hidden md:table-cell">조회</th>
          <th class="hidden md:table-cell">추천</th>
          <th class="">시간</th>
        </tr>
      </thead>
      <tbody>
        {#each list as doc}
          <tr class="even:bg-gray-200 w-full whitespace-no-wrap">
            <td class="py-2 text-xs text-left px-2"> <a class="no-underline hover:underline" href={`https://gall.dcinside.com/board/lists?id=${doc.galleryid}`}> {doc.galleryid} </a> </td>
            <td class="align-middle" style="max-width:1px"> 
              <a class="truncate align-middle inline-block no-underline max-w-7/8 hover:underline visited:text-purple-600" href={`https://gall.dcinside.com/board/view/?id=${doc.galleryid}&no=${doc.id}`}
                 title={doc.title}> 
                 {doc.title} 
              </a> 
              {#if doc.commentcount} <span class="text-gray-500">({doc.commentcount})</span> {/if} 
            </td>
            <td class="hidden md:table-cell text-xs text-center"> {doc.usernickname}{doc.userip? `(${doc.userip})`: ''} </td>
            <td class="hidden md:table-cell text-xs text-center"> {doc.viewcount} </td>
            <td class="hidden md:table-cell text-xs text-center"> {doc.likecount} </td>
            <td class="text-xs text-right px-2" title={doc.createdat}> {doc.fromnow} </td>
          </tr>
        {/each}
      </tbody>
    </table>
    {:else if valueType === 'com'}
    <table class="table-auto border-collapse w-full text-sm whitespace-no-wrap">
      <colgroup>
        <col width="0%" />
        <col width="100%" />
        <col width="0%" />
        <col width="0%" />
      </colgroup>
      <thead class="">
        <tr class="rounded-lg text-sm border-b"> 
          <th class="py-2">갤러리</th>
          <th class="">내용</th>
          <th class="hidden md:table-cell">작성자</th>
          <th class="">시간</th>
        </tr>
      </thead>
      <tbody>
        {#each list as com}
          <tr class="even:bg-gray-200 w-full whitespace-no-wrap">
            <td class="py-2 text-xs text-left px-2"> <a class="no-underline hover:underline" href={`https://gall.dcinside.com/board/lists?id=${com.galleryid}`}> {com.galleryid} </a> </td>
            <td class="align-middle" style="max-width:1px"> 
              <a class="truncate align-middle inline-block no-underline w-full hover:underline visited:text-purple-600" href={`https://gall.dcinside.com/board/view/?id=${com.galleryid}&no=${com.documentid}`}
                 title={com.contents}> 
                 {com.contents} 
              </a> 
            </td>
            <td class="hidden md:table-cell text-xs text-center"> {com.usernickname}{com.userip? `(${com.userip})`: ''} </td>
            <td class="text-xs text-right px-2" title={com.createdat}> {com.fromnow} </td>
          </tr>
        {/each}
      </tbody>
    </table>
    {/if}
    <div class="text-center bg-gray-300 p-2">
      <a href="q?keyType={keyType}&valueType={valueType}&key={key}&timestamp={nextTimestamp}" rel=prefetch> 다음 </a>
    </div>
  </li>
</ul>

<!--
<div class='content'>
	{@html documents.html}
</div>
-->
