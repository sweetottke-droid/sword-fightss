const crypto=require('crypto'),http=require('http'),fs=require('fs'),path=require('path'),{WebSocketServer}=require('ws');
const FILE=path.join(__dirname,'leaderboard.json');let board={};try{board=JSON.parse(fs.readFileSync(FILE,'utf8'))}catch{}
let saveT=null;const save=()=>{clearTimeout(saveT);saveT=setTimeout(()=>{try{fs.writeFileSync(FILE,JSON.stringify(board))}catch{}},2000)};
// SweettDev password: only a one-way fingerprint is stored here (the password itself is NOT in any file).
const DEV_SALT='76ed99a495a706ce6237786976bc7fea';
const tokFrom=pw=>crypto.scryptSync(String(pw).slice(0,100),DEV_SALT,32).toString('hex');
const sha=t=>crypto.createHash('sha256').update(String(t)).digest('hex');
const DEV_H='46b2c94e5f9f9043b5eba4c8649741e630390d0369fd4f84fe6c2b2ba5ac14a0';
const same=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y)};
const PORT=process.env.PORT||3000,MAX=40;
const page=()=>fs.readFileSync(path.join(__dirname,'public','index.html'));
const server=http.createServer((req,res)=>{
  if(req.url==='/api/leaderboard'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(Object.entries(board).map(([n,x])=>({n,ko:x.ko,wo:x.wo})).sort((a,b)=>b.ko-a.ko||a.wo-b.wo).slice(0,50)));return}
  const A={'/burn.mp3':['audio/mpeg','burn.mp3'],'/dev.gif':['image/gif','dev.gif']}[req.url.split('?')[0]];
  if(A){fs.readFile(path.join(__dirname,'public',A[1]),(e,b)=>{if(e){res.writeHead(404);res.end();return}res.writeHead(200,{'Content-Type':A[0],'Cache-Control':'public,max-age=86400'});res.end(b)});return}
  if(req.url==='/healthz'){res.end('ok');return}
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});res.end(page());
});
const wss=new WebSocketServer({server,maxPayload:8192});
const players=new Map();let nextId=1,dirty=false;const mods={low:0,fast:0};
const bc=o=>{const m=JSON.stringify(o);for(const p of players.values())if(p.ws.readyState===1)p.ws.send(m)};
wss.on('connection',ws=>{
  if(players.size>=MAX){ws.close();return}
  const id='p'+(nextId++),pl={ws,presence:{},n:0,alive:true,bad:0,dev:false};players.set(id,pl);
  ws.send(JSON.stringify({t:'hello',id,now:Date.now()}));bc({t:'o',n:players.size});ws.send(JSON.stringify({t:'mods',m:mods}));
  ws.on('pong',()=>{pl.alive=true});
  ws.on('message',m=>{
    if(++pl.n>100)return;                      // simple flood limit (reset every second)
    let d;try{d=JSON.parse(m)}catch{return}
    if(d&&d.t==='dev'){                                      // dev room (SweettDev password login)
      if(d.cmd==='auth'){let tok=null;
        if(String(d.n||'').trim().toLowerCase()==='sweettdev'){
          if(d.key){const t=tokFrom(d.key);if(same(sha(t),DEV_H))tok=t}
          else if(d.tok&&same(sha(d.tok),DEV_H))tok=String(d.tok);
        }
        pl.dev=!!tok;
        if(!pl.dev&&++pl.bad>5){ws.close();return}
        ws.send(JSON.stringify({t:'dev',ok:pl.dev,tok:tok||undefined}));return}
      if(!pl.dev)return;
      if(d.cmd==='sfx')bc({t:'sfx',on:d.on?1:0});
      else if(d.cmd==='kill'){const m=JSON.stringify({t:'kill',by:id});for(const p of players.values())if(p!==pl&&p.ws.readyState===1)p.ws.send(m)}
      else if(d.cmd==='mod'&&(d.k==='low'||d.k==='fast')){mods[d.k]=d.v?1:0;bc({t:'mods',m:mods})}
      else if(d.cmd==='say'&&typeof d.m==='string'&&d.m.trim())bc({t:'say',m:d.m.replace(/[\u0000-\u001f]/g,'').trim().slice(0,100)});
      return;
    }
    if(d&&d.t==='stat'){                                     // save kills/deaths (highest value wins)
      const n=String(d.n||'').replace(/[\u0000-\u001f]/g,'').trim().slice(0,16);if(!n||(n.toLowerCase()==='sweettdev'&&!pl.dev))return;
      const ko=Math.min(1e6,Math.max(0,Math.floor(+d.ko)||0)),wo=Math.min(1e6,Math.max(0,Math.floor(+d.wo)||0));
      const b=board[n]||(board[n]={ko:0,wo:0});b.ko=Math.max(b.ko,ko);b.wo=Math.max(b.wo,wo);save();return;
    }
    if(d&&d.t==='c'&&typeof d.m==='string'){                // chat
      const now=Date.now();if(now-(pl.lastC||0)<400)return;pl.lastC=now;
      const m=d.m.replace(/[\u0000-\u001f]/g,'').trim().slice(0,120);if(!m)return;
      const out=JSON.stringify({t:'c',n:String(pl.presence.nm||'Player').slice(0,20),m,dv:pl.dev?1:0});
      for(const p of players.values())if(p.ws.readyState===1)p.ws.send(out);return;
    }
    if(d&&d.t==='p'&&d.p&&typeof d.p==='object'&&!Array.isArray(d.p)){if(typeof d.p.nm==='string'&&d.p.nm.trim().toLowerCase()==='sweettdev'&&!pl.dev)d.p.nm='Impostor';d.p.dv=pl.dev?1:0;if(pl.dev&&!pl.joined){pl.joined=true;const j=JSON.stringify({t:'dj'});for(const p of players.values())if(p!==pl&&p.ws.readyState===1)p.ws.send(j)}Object.assign(pl.presence,d.p);dirty=true}
  });
  ws.on('close',()=>{players.delete(id);dirty=true;bc({t:'o',n:players.size})});
  ws.on('error',()=>{});
});
setInterval(()=>{for(const p of players.values())p.n=0},1000);
setInterval(()=>{for(const [id,p] of players){if(!p.alive){p.ws.terminate();players.delete(id);dirty=true;continue}p.alive=false;try{p.ws.ping()}catch{}}},25000);
setInterval(()=>{                              // broadcast the world 20x per second
  if(!dirty)return;dirty=false;
  const peers={};for(const [id,p] of players)peers[id]=p.presence;
  const msg=JSON.stringify({t:'s',peers});
  for(const p of players.values())if(p.ws.readyState===1)p.ws.send(msg);
},50);
server.listen(PORT,()=>console.log('Sword Fights server on port '+PORT));
