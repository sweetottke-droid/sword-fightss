const http=require('http'),fs=require('fs'),path=require('path'),{WebSocketServer}=require('ws');
const PORT=process.env.PORT||3000,MAX=40;
const page=()=>fs.readFileSync(path.join(__dirname,'public','index.html'));
const server=http.createServer((req,res)=>{
  if(req.url==='/healthz'){res.end('ok');return}
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});res.end(page());
});
const wss=new WebSocketServer({server,maxPayload:8192});
const players=new Map();let nextId=1,dirty=false;
wss.on('connection',ws=>{
  if(players.size>=MAX){ws.close();return}
  const id='p'+(nextId++),pl={ws,presence:{},n:0,alive:true};players.set(id,pl);
  ws.send(JSON.stringify({t:'hello',id,now:Date.now()}));
  ws.on('pong',()=>{pl.alive=true});
  ws.on('message',m=>{
    if(++pl.n>100)return;                      // simple flood limit (reset every second)
    let d;try{d=JSON.parse(m)}catch{return}
    if(d&&d.t==='p'&&d.p&&typeof d.p==='object'&&!Array.isArray(d.p)){Object.assign(pl.presence,d.p);dirty=true}
  });
  ws.on('close',()=>{players.delete(id);dirty=true});
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
