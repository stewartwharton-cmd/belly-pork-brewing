import fs from 'node:fs';
const PORT = 9222;
const targetsRes = await fetch(`http://localhost:${PORT}/json/new?http://localhost:3000/merch.html`, { method: 'PUT' });
const target = await targetsRes.json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
function send(method, params={}) { const i=++id; return new Promise(r=>{pending.set(i,r); ws.send(JSON.stringify({id:i,method,params}));}); }
await new Promise(r=>{ws.onopen=r;});
ws.onmessage = ev => { const m=JSON.parse(ev.data); if(m.id&&pending.has(m.id)){pending.get(m.id)(m.result);pending.delete(m.id);} };
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
await send('Page.navigate', {url:'http://localhost:3000/merch.html'});
await new Promise(r=>setTimeout(r,2200));
async function evalJs(expr) {
  const r = await send('Runtime.evaluate', {expression:expr, returnByValue:true});
  return r.result.value;
}
await evalJs(`document.getElementById('configure').scrollIntoView({block:'start'})`);
await new Promise(r=>setTimeout(r,400));
const s = await send('Page.captureScreenshot', {format:'png'});
fs.writeFileSync('C:/Users/Stew/AppData/Local/Temp/merch-diag/step1-visible.png', Buffer.from(s.data,'base64'));

// scroll to see the nav buttons at the bottom of step1
await evalJs(`document.getElementById('mobile-step-nav').scrollIntoView({block:'center'})`);
await new Promise(r=>setTimeout(r,1500));
const s2 = await send('Page.captureScreenshot', {format:'png'});
fs.writeFileSync('C:/Users/Stew/AppData/Local/Temp/merch-diag/step-nav-visible.png', Buffer.from(s2.data,'base64'));

ws.close(); process.exit(0);
