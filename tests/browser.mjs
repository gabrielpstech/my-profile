import assert from 'node:assert/strict';
import {send,evaluate,navigate,click,key,delay,socket,errors} from './cdp.mjs';
const ok=async (expression,message)=>{for(let i=0;i<20;i++){if(await evaluate(expression))return;await delay(50);}assert.fail(message);};
const dimensions=async(width,height=900)=>send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
const audioSpy=await send('Page.addScriptToEvaluateOnNewDocument',{source:
  "window.__audio={contexts:0,starts:0,durations:[]}; const NativeAudio=window.AudioContext; window.AudioContext=new Proxy(NativeAudio,{construct(Target,args){window.__audio.contexts++;const ctx=new Target(...args);const create=ctx.createOscillator.bind(ctx);ctx.createOscillator=()=>{const osc=create();const start=osc.start.bind(osc),stop=osc.stop.bind(osc);let at;osc.start=t=>{at=t;window.__audio.starts++;start(t)};osc.stop=t=>{window.__audio.durations.push(t-at);stop(t)};return osc};return ctx;}});"
});
try {
  await dimensions(1440);
  await navigate('index.html');
  await evaluate('localStorage.clear()'); await navigate('index.html');
  await ok('__audio.contexts === 0','No audio before user action');
  await click('#contact-trigger-0'); await delay(150);
  await ok('!document.querySelector("#contact-menu-0").hidden','Menu opens on click');
  await ok('document.activeElement === document.querySelector("#contact-menu-0 a")','Focus moves into menu');
  await ok('__audio.contexts === 1 && __audio.starts === 1','Real audio starts after a click');
  await ok('Math.abs(__audio.durations[0] - .045) < .001','Audio duration is 45 ms');
  await key('ArrowDown'); await ok('document.activeElement.href.startsWith("mailto:")','ArrowDown focuses email');
  await key('End'); await ok('document.activeElement.role === "menuitemcheckbox"','End focuses sound');
  await key('ArrowDown'); await ok('document.activeElement.href.includes("linkedin.com")','Arrow navigation wraps');
  await key('Escape');
  await ok('document.querySelector("#contact-menu-0").hidden && document.activeElement.id === "contact-trigger-0"','Escape closes and restores focus');
  await key('ArrowUp'); await ok('document.activeElement.role === "menuitemcheckbox"','ArrowUp opens at last item');
  await key('Tab'); await ok('document.querySelector("#contact-menu-0").hidden && document.activeElement.classList.contains("language-link")','Tab exits without trapping focus');
  await click('#contact-trigger-0'); await key('Tab',8);
  await ok('document.querySelector("#contact-menu-0").hidden && document.activeElement.getAttribute("href") === "#expertise"','Shift+Tab exits backwards');
  await click('#contact-trigger-0'); await click('.hero h1');
  await ok('document.querySelector("#contact-menu-0").hidden','Outside click closes');
  for (const selector of ['a[href*="linkedin.com"]','a[href^="mailto:"]']) {
    await click('#contact-trigger-0');
    await evaluate('document.querySelector('+JSON.stringify('#contact-menu-0 '+selector)+').addEventListener("click",e=>e.preventDefault(),{once:true})');
    await click('#contact-menu-0 '+selector);
    await ok('document.querySelector("#contact-menu-0").hidden','Selection closes menu');
  }
  await click('#contact-trigger-0');
  await ok('document.querySelector("#contact-menu-0 a").href === "https://www.linkedin.com/in/gabriel-p-s/"','LinkedIn preserved');
  await ok('document.querySelector("#contact-menu-0 a[href^=mailto]").href === "mailto:gabrielpstech@gmail.com"','Email preserved');
  await click('#contact-menu-0 [role=menuitemcheckbox]');
  await ok('localStorage.getItem("gabriel-profile:interaction-sound") === "off"','Sound preference persisted');
  await key('Escape');
  const starts=await evaluate('__audio.starts');
  await click('#contact-trigger-0'); await delay(100);
  assert.equal(await evaluate('__audio.starts'),starts,'Muted click generates no audio');
  await navigate('pt-br.html');
  await ok('document.querySelector(".sound-toggle").getAttribute("aria-pressed") === "false" && __audio.contexts === 0','Mute persists across languages');
  await click('.sound-toggle');
  await ok('document.querySelector(".sound-toggle").getAttribute("aria-pressed") === "true"','Footer can re-enable audio');
  console.log('PASS: menu activation, links, focus, keyboard, outside click, 45 ms audio and persistence.');

  for (const file of ['index.html','pt-br.html']) {
    for (const width of [320,390,540,768,1024,1440]) {
      await dimensions(width); await navigate(file);
      await ok('document.documentElement.scrollWidth <= innerWidth','No horizontal overflow: '+file+' '+width);
      for (const index of [0,1]) {
        await click('#contact-trigger-'+index); await delay(250);
        await ok('(()=>{const r=document.querySelector("#contact-menu-'+index+'").getBoundingClientRect();return r.left>=0 && r.right<=innerWidth && r.top>=0 && r.bottom<=innerHeight})()','Popover fits viewport: '+file+' '+width+' '+index);
        await key('Escape');
      }
    }
  }
  console.log('PASS: both translations at 320, 390, 540, 768, 1024 and 1440 px; both menus stay in viewport.');

  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await navigate('pt-br.html'); await click('#contact-trigger-0');
  await ok('__audio.contexts === 0','Reduced motion suppresses audio');
  await ok('document.querySelector(".sound-toggle").disabled','Reduced motion disables sound control');
  await ok('getComputedStyle(document.querySelector(".contact-menu")).animationName === "none"','Reduced motion suppresses animation');
  await ok('getComputedStyle(document.querySelector(".nav-contact")).transitionDuration === "0s"','Reduced motion suppresses transitions');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  await ok('!document.querySelector(".sound-toggle").disabled','System preference updates live');
  await key('Escape');
  console.log('PASS: reduced motion, silent interaction, disabled controls and live preference changes.');

  for (const file of ['index.html','pt-br.html']) {
    await navigate(file);
    await evaluate('Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:async text=>{window.__copied=text}}})');
    await click('#copy-email');
    await ok('__copied === "gabrielpstech@gmail.com" && document.querySelector("#copy-status").textContent.length > 0','Copy success');
    await evaluate('navigator.clipboard.writeText=async()=>{throw new Error("denied")}');
    await click('#copy-email');
    await ok('document.querySelector("#copy-status").textContent.startsWith('+JSON.stringify(file==='index.html'?'Select':'Selecione')+')','Clipboard fallback localized');
    await evaluate('location.hash="#experience";document.querySelector(".language-link").addEventListener("click",e=>e.preventDefault(),{once:true});document.querySelector(".language-link").click()');
    await ok('document.querySelector(".language-link").hash === "#experience"','Language switch preserves section');
    await delay(700); await evaluate('document.querySelector(".earlier summary").focus()'); await key('Enter'); await ok('document.querySelector(".earlier").open','Earlier experience remains functional');
  }
  console.log('PASS: copy success and fallback, language switching, earlier experience.');

  const blocked=await send('Page.addScriptToEvaluateOnNewDocument',{source:'Object.defineProperty(window,"localStorage",{get(){throw new Error("blocked")}})'});
  await navigate('index.html'); await click('#contact-trigger-0'); await click('#contact-menu-0 [role=menuitemcheckbox]');
  await ok('!document.querySelector("#contact-menu-0").hidden','Blocked storage does not break menu or toggle');
  await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:blocked.identifier});
  const noAudio=await send('Page.addScriptToEvaluateOnNewDocument',{source:'window.AudioContext=undefined;window.webkitAudioContext=undefined;'});
  await navigate('index.html'); await click('#contact-trigger-0');
  await ok('!document.querySelector("#contact-menu-0").hidden && document.querySelector(".sound-toggle").disabled','No Web Audio still allows contact');
  await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:noAudio.identifier});
  console.log('PASS: blocked storage and unavailable Web Audio degrade gracefully.');

  await dimensions(1440); await navigate('index.html');
  await evaluate('document.querySelector("#contact-trigger-0").focus()'); await key('Enter');
  await ok('!document.querySelector("#contact-menu-0").hidden','Enter opens menu'); await key('Escape');
  await key(' '); await ok('!document.querySelector("#contact-menu-0").hidden','Space opens menu');

  await dimensions(390,844); await navigate('pt-br.html'); await click('#contact-trigger-0');

  assert.deepEqual(errors,[],'No uncaught browser errors');
  console.log('PASS: Enter/Space and no uncaught JavaScript errors.');
} finally { await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:audioSpy.identifier}); socket.close(); }
