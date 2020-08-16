<script lang="ts">
  import { onMount } from 'svelte';
  import galleryMap from './gallery-map.json';
	export let name: string;
  let canvas;
  let state = 'loading';
  let errorMsg = '';
  /*function handleMousemove(event) {
    m.x = event.clientX;
    m.y = evntY;
  }*/
  function encodeEdge(x1: number, y1:number, x2:number, y2:number): string {
    return `${x1},${y1},${x2},${y2}`;
  }
  function decodeEdge(enc: string): number[] {
    return enc.split(',').map(i => i-0);
  }
  function distance(pos1, pos2) {
    return Math.sqrt((pos1[0] - pos2[0])*(pos1[0] - pos2[0]) + (pos1[1] - pos2[1])*(pos1[1] - pos2[1])); 
  }
  function gridToEdges(coordinates: number[][]){
    let edgeCounts = {};
    for(let coord of coordinates){
      for(let pos of [[0,0, 1,0], [1,0, 1,1], [0,1, 1,1], [0,0, 0,1]]){
        let edge = encodeEdge(coord[0] + pos[0], coord[1] + pos[1], coord[0] + pos[2], coord[1] + pos[3]);
        edgeCounts[edge] = edgeCounts[edge]? edgeCounts[edge] + 1: 1;
      }
    }
    let edges = Object.entries(edgeCounts).filter(ent => ent[1] === 1).map(ent => decodeEdge(ent[0]));
    return edges;
/*
    let path = [[edges[0][0], edges[0][1]], [edges[0][2], edges[0][3]]];
    for(let i=1, l=edges.length-1; i<l; ++i){
      for(let edge of edges){
        if((edge[0] === path[i][0] && edge[1] === path[i][1] && (edge[2] !== path[i-1][0] || edge[3] !== path[i-1][1]))){
          path.push([edge[2], edge[3]]);
          break;
        }
        if((edge[2] === path[i][0] && edge[3] === path[i][1] && (edge[0] !== path[i-1][0] || edge[1] !== path[i-1][1]))) {
          path.push([edge[0], edge[1]]);
          break;
        }
      }
    }
    return path
*/
  }
  function draw(data: any) {
    const ctx = canvas.getContext('2d');
    console.log(data);
    for(let d of data){
      //d.path = gridToPath(d.coordinates);
      d.center = d.coordinates.reduce((acc, pos) => [pos[0] + acc[0], pos[1] + acc[1]]).map(i => i / d.coordinates.length);
      d.centerCoordinate = d.coordinates.sort((a, b) => distance(a, d.center) - distance(b, d.center))[0];
    }
    const width = 60;
    const r = Math.max(...data.map(d => Math.max(...d.coordinates.flat())));
    console.log(r);
    const pad = (canvas.width - width*r) * 0.5
    const palete = data.map(_ => '#'+Math.random().toString(15).substr(2,6));
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    function draw_(){
      for(let i in data){
        let d = data[i];
        ctx.fillStyle = palete[i];
        for(let coord of d.coordinates)
          ctx.fillRect(pad + coord[0] * width, pad + coord[1] * width, width, width);
      }
      ctx.fillStyle = 'white';
      ctx.font = "12px Arial";
      ctx.textBaseline = 'middle';
      ctx.textAlign = "center";
      for(let d of data){
        //if(d.userCount > 500)
          ctx.fillText(d.name, pad + d.centerCoordinate[0] * width + width*0.5, pad + d.centerCoordinate[1] * width + width*0.5);
      }
    }
    draw_();
  }
  async function fetchGalleryMap(){
    let res = await fetch('/data/gallery-map');
    let data = await res.json();
    return data;
  }
  /*async function fetchGalleryMap(){
    return galleryMap;
  }*/
  onMount(async () => {
    fetchGalleryMap()
      .then(data => {
        state = 'done';
        draw(data);
      })
      /*.catch(err => {
        state = 'error'
        errorMsg = err;
      });*/
  });
</script>

<canvas bind:this={canvas} width=4800 height=4800>
</canvas>
{#if state === 'loading'}
  <div>
    loading..
  </div>
{:else if state === 'done'}
{:else}
  <div>
    {errorMsg}
  </div>
{/if}
