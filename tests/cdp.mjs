import fs from 'node:fs/promises';
if (!process.argv[2] || !process.argv[3]) throw new Error('Usage: node tests/browser.mjs <Chrome debug port> <local site URL>');
const targets = await (await fetch('http://127.0.0.1:' + process.argv[2] + '/json/list')).json();
const target = targets.find(item => item.type === 'page');
export const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, {once:true}); socket.addEventListener('error', reject, {once:true}); });
let id = 0;
const pending = new Map();
export const errors = [];
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
  if (pending.has(message.id)) {
    const {resolve, reject} = pending.get(message.id); pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error))); else resolve(message.result);
  }
});
export function send(method, params={}) { return new Promise((resolve,reject) => { pending.set(++id,{resolve,reject}); socket.send(JSON.stringify({id,method,params})); }); }
export async function evaluate(expression) { const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true}); if(result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails)); return result.result.value; }
export const delay = ms => new Promise(resolve=>setTimeout(resolve,ms));
export async function navigate(file) { await send('Page.navigate',{url:process.argv[3]+'/'+file}); await delay(100); for(let i=0;i<100;i++){if(await evaluate('document.readyState === "complete" && !!document.querySelector(".sound-toggle")'))return;await delay(50);}throw new Error('Navigation timeout'); }
export async function click(selector) { await delay(220); const box=await evaluate('(()=>{const el=document.querySelector('+JSON.stringify(selector)+');let r=el.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight){el.scrollIntoView({block:"center",behavior:"instant"});r=el.getBoundingClientRect();}return {x:r.x+r.width/2,y:r.y+r.height/2}})()'); await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...box});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...box});await delay(40); }
export async function key(key, modifiers=0) { const codes={Enter:13,Escape:27,Tab:9,ArrowDown:40,ArrowUp:38,Home:36,End:35,' ':32}; await send('Input.dispatchKeyEvent',{type:'keyDown',key,text:key==='Enter'?'\r':key===' '?' ':undefined,code:key===' '?'Space':key,windowsVirtualKeyCode:codes[key]||0,modifiers});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code:key===' '?'Space':key,windowsVirtualKeyCode:codes[key]||0,modifiers});await delay(30); }
export async function screenshot(file) { await delay(250);const {data}=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await fs.writeFile(file,Buffer.from(data,'base64')); }
await send('Page.enable');await send('Runtime.enable');

await send('Network.enable');
// Optional isolation for scripts injected by the host environment during local QA.
if (process.env.QA_BLOCK_URLS) await send('Network.setBlockedURLs',{urls:process.env.QA_BLOCK_URLS.split(',')});
