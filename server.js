const http=require('http'),fs=require('fs'),path=require('path'),{WebSocketServer}=require('ws');
const FILE=path.join(__dirname,'leaderboard.json');let board={};try{board=JSON.parse(fs.readFileSync(FILE,'utf8'))}catch{}
let saveT=null;const save=()=>{clearTimeout(saveT);saveT=setTimeout(()=>{try{fs.writeFileSync(FILE,JSON.stringify(board))}catch{}},2000)};
const PORT=process.env.PORT||3000,MAX=40;
const page=()=>fs.readFileSync(path.join(__dirname,'public','index.html'));
const server=http.createServer((req,res)=>{
  if(req.url==='/api/leaderboard'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(Object.entries(board).map(([n,x])=>({n,ko:x.ko,wo:x.wo})).sort((a,b)=>b.ko-a.ko||a.wo-b.wo).slice(0,50)));return}
  if(req.url==='/healthz'){res.end('ok');return}
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});res.end(page());
});
const wss=new WebSocketServer({server,maxPayload:8192});
const players=new Map();let nextId=1,dirty=false;
const bc=o=>{const m=JSON.stringify(o);for(const p of players.values())if(p.ws.readyState===1)p.ws.send(m)};
wss.on('connection',ws=>{
  if(players.size>=MAX){ws.close();return}
  const id='p'+(nextId++),pl={ws,presence:{},n:0,alive:true};players.set(id,pl);
  ws.send(JSON.stringify({t:'hello',id,now:Date.now()}));bc({t:'o',n:players.size});
  ws.on('pong',()=>{pl.alive=true});
  ws.on('message',m=>{
    if(++pl.n>100)return;                      // simple flood limit (reset every second)
    let d;try{d=JSON.parse(m)}catch{return}
    if(d&&d.t==='stat'){                                     // save kills/deaths (highest value wins)
      const n=String(d.n||'').replace(/[\u0000-\u001f]/g,'').trim().slice(0,16);if(!n)return;
      const ko=Math.min(1e6,Math.max(0,Math.floor(+d.ko)||0)),wo=Math.min(1e6,Math.max(0,Math.floor(+d.wo)||0));
      const b=board[n]||(board[n]={ko:0,wo:0});b.ko=Math.max(b.ko,ko);b.wo=Math.max(b.wo,wo);save();return;
    }
    if(d&&d.t==='c'&&typeof d.m==='string'){                // chat
      const now=Date.now();if(now-(pl.lastC||0)<400)return;pl.lastC=now;
      const m=d.m.replace(/[\u0000-\u001f]/g,'').trim().slice(0,120);if(!m)return;
      const out=JSON.stringify({t:'c',n:String(pl.presence.nm||'Player').slice(0,20),m});
      for(const p of players.values())if(p.ws.readyState===1)p.ws.send(out);return;
    }
    if(d&&d.t==='p'&&d.p&&typeof d.p==='object'&&!Array.isArray(d.p)){Object.assign(pl.presence,d.p);dirty=true}
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
