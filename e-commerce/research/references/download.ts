import {mkdir} from 'node:fs/promises';
const sites={outfit:'https://outfit.hellohello.is/',avara:'https://www.avara.band/',kvs:'https://www.kvs.services/'};
for(const [name,base] of Object.entries(sites)){
 const dir=`research/references/${name}`;await mkdir(dir,{recursive:true});
 const html=await Bun.file(`research/references/${name}.html`).text();
 const queue=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>new URL(m[1],base).href).filter(u=>/\.(js|css)(\?|$)/.test(u)&&new URL(u).origin===new URL(base).origin);
 const seen=new Set<string>();const manifest=[];
 while(queue.length&&seen.size<100){const url=queue.shift()!;if(seen.has(url))continue;seen.add(url);
 try{const r=await fetch(url);if(!r.ok){manifest.push({url,status:r.status});continue;}const body=await r.text();const path=`${dir}/${new URL(url).pathname.split('/').pop()}`;await Bun.write(path,body);manifest.push({url,path,bytes:Buffer.byteLength(body),sha256:new Bun.CryptoHasher('sha256').update(body).digest('hex')});
 for(const m of body.matchAll(/["']([^"'\s]+\.(?:js|css))["']/g)){try{const u=new URL(m[1],url);if(u.origin===new URL(base).origin)queue.push(u.href);}catch{}}
 }catch(e){manifest.push({url,error:String(e)});}}
 await Bun.write(`${dir}/manifest.json`,JSON.stringify(manifest,null,2));console.log(name,manifest.length,manifest.reduce((s,x)=>s+('bytes'in x?x.bytes!:0),0));
}
