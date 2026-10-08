'use strict';

const isPortuguese = document.documentElement.lang.toLowerCase() === 'pt-br';
const messages = isPortuguese ? {
  copied: 'E-mail copiado para a área de transferência.',
  fallback: 'Selecione o endereço acima para copiá-lo ou clique nele para enviar um e-mail.',
  linkedin: 'Perfil profissional', email: 'Abrir aplicativo de e-mail',
  newTab: 'Abre em uma nova aba', sound: 'Som de interação',
  soundOn: 'Som ativado', soundOff: 'Som desativado',
  reduced: 'Som desativado: movimento reduzido', unavailable: 'Som indisponível neste navegador',
} : {
  copied: 'Email copied to clipboard.',
  fallback: 'Select the email address above to copy it, or click it to send an email.',
  linkedin: 'Professional profile', email: 'Open your email app',
  newTab: 'Opens in a new tab', sound: 'Interaction sound',
  soundOn: 'Sound on', soundOff: 'Sound off',
  reduced: 'Sound off: reduced motion', unavailable: 'Sound unavailable in this browser',
};

// Contact configuration: the links in #contact are the single source of truth.
// Update those existing links in both HTML translations to change contact details.
const emailLink = document.querySelector('#contact .email-link');
const linkedinLink = document.querySelector('#contact a[href*="linkedin.com/"]');
const copyButton = document.getElementById('copy-email');
const copyStatus = document.getElementById('copy-status');
copyButton?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(emailLink.textContent.trim());
    copyStatus.textContent = messages.copied;
  } catch {
    copyStatus.textContent = messages.fallback;
  }
});

// Keep the current section when changing languages. The root remains English.
const languageLink = document.querySelector('.language-link');
languageLink?.addEventListener('click', () => {
  languageLink.hash = window.location.hash;
});

const icon = (paths, className = '') => '<svg class="' + className + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>';
const icons = {
  chevron: icon('<path d="m7 10 5 5 5-5"/>', 'contact-chevron'),
  linkedin: icon('<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 10v7m4 0v-7m0 3a3 3 0 0 1 6 0v4"/><path d="M8 7h.01"/>'),
  email: icon('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>'),
  arrow: icon('<path d="M7 17 17 7M7 7h10v10"/>', 'menu-arrow'),
  sound: icon('<path d="m11 5-6 4H3v6h2l6 4V5Zm4 4a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12"/>'),
};

const soundStorageKey = 'gabriel-profile:interaction-sound';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
let soundPreference = true;
try {
  const stored = localStorage.getItem(soundStorageKey);
  if (stored !== null) soundPreference = stored === 'on';
} catch { /* Private browsing or blocked storage: keep a session-only preference. */ }
let audioContext;
let lastSoundAt = -Infinity;
const soundControls = [];
const soundEnabled = () => soundPreference && !reducedMotion.matches && Boolean(AudioContextClass);
const updateSoundControls = () => {
  const disabled = reducedMotion.matches || !AudioContextClass;
  const label = reducedMotion.matches ? messages.reduced : !AudioContextClass ? messages.unavailable : soundEnabled() ? messages.soundOn : messages.soundOff;
  for (const control of soundControls) {
    const menuItem = control.getAttribute('role') === 'menuitemcheckbox';
    control.setAttribute(menuItem ? 'aria-checked' : 'aria-pressed', String(soundEnabled()));
    control.setAttribute('aria-label', messages.sound + ': ' + label);
    control.title = label;
    if (menuItem) control.setAttribute('aria-disabled', String(disabled));
    else control.disabled = disabled;
    control.querySelector('[data-sound-label]').textContent = menuItem && !disabled ? messages.sound : label;
  }
};
function toggleSound() {
  if (reducedMotion.matches || !AudioContextClass) return;
  soundPreference = !soundPreference;
  try { localStorage.setItem(soundStorageKey, soundPreference ? 'on' : 'off'); } catch { /* Nonessential persistence. */ }
  updateSoundControls();
  if (!soundEnabled() && audioContext?.state === 'running') audioContext.suspend().catch(() => {});
}
reducedMotion.addEventListener('change', () => {
  updateSoundControls();
  if (!soundEnabled() && audioContext?.state === 'running') audioContext.suspend().catch(() => {});
});
window.addEventListener('storage', event => {
  if (event.key === soundStorageKey || event.key === null) {
    soundPreference = event.newValue !== 'off';
    updateSoundControls();
  }
});

// Original 45 ms muted tap: low sine pulse + softly filtered noise.
// Created only inside an explicit contact-button click; no asset or network request.
async function playContactSound() {
  if (!soundEnabled() || performance.now() - lastSoundAt < 80) return;
  lastSoundAt = performance.now();
  try {
    audioContext ||= new AudioContextClass();
    if (audioContext.state !== 'running') await audioContext.resume();
    if (!soundEnabled() || document.hidden) return;
    const now = audioContext.currentTime;
    const output = audioContext.createGain();
    output.gain.setValueAtTime(0, now);
    output.gain.linearRampToValueAtTime(0.055, now + 0.003);
    output.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
    output.connect(audioContext.destination);
    const tone = audioContext.createOscillator();
    tone.type = 'sine';
    tone.frequency.setValueAtTime(180, now);
    tone.frequency.exponentialRampToValueAtTime(85, now + 0.04);
    tone.connect(output);
    const buffer = audioContext.createBuffer(1, Math.ceil(audioContext.sampleRate * 0.025), audioContext.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * 0.18;
    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    noise.connect(filter);
    filter.connect(output);
    tone.onended = () => { tone.disconnect(); noise.disconnect(); filter.disconnect(); output.disconnect(); };
    tone.start(now);
    noise.start(now);
    tone.stop(now + 0.045);
  } catch { /* Sound must never block navigation, even when audio is unavailable. */ }
}

// Progressive enhancement: without JS, the original links go to the contact section.
const disclosures = [];
if (emailLink && linkedinLink) {
  document.querySelectorAll('[data-contact-trigger]').forEach((fallback, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'contact-disclosure';
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = fallback.className;
    trigger.id = 'contact-trigger-' + index;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-controls', 'contact-menu-' + index);
    trigger.append(document.createTextNode(fallback.textContent));
    trigger.insertAdjacentHTML('beforeend', icons.chevron);
    const menu = document.createElement('div');
    menu.id = 'contact-menu-' + index;
    menu.className = 'contact-menu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-labelledby', trigger.id);
    menu.hidden = true;
    for (const [source, name, description, graphic] of [
      [linkedinLink, 'LinkedIn', messages.linkedin, icons.linkedin],
      [emailLink, isPortuguese ? 'E-mail' : 'Email', messages.email, icons.email],
    ]) {
      const link = document.createElement('a');
      link.href = source.href;
      link.setAttribute('role', 'menuitem');
      link.tabIndex = -1;
      if (source.target) { link.target = source.target; link.rel = 'noopener noreferrer'; }
      link.innerHTML = graphic + '<span class="menu-copy">' + name + '<small>' + description + '</small></span>' + icons.arrow;
      if (link.target === '_blank') {
        const hint = document.createElement('span');
        hint.className = 'sr-only';
        hint.textContent = ' (' + messages.newTab + ')';
        link.append(hint);
      }
      menu.append(link);
    }
    const separator = document.createElement('div');
    separator.className = 'menu-separator';
    separator.setAttribute('role', 'separator');
    const soundButton = document.createElement('button');
    soundButton.type = 'button';
    soundButton.setAttribute('role', 'menuitemcheckbox');
    soundButton.tabIndex = -1;
    soundButton.innerHTML = icons.sound + '<span data-sound-label></span><span class="sound-indicator" aria-hidden="true"></span>';
    soundControls.push(soundButton);
    menu.append(separator, soundButton);
    wrapper.append(trigger, menu);
    fallback.replaceWith(wrapper);
    const items = [...menu.querySelectorAll('[role^="menuitem"]')];
    const close = (restoreFocus = false) => {
      menu.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      if (restoreFocus) trigger.focus({ preventScroll: true });
    };
    const positionMenu = () => {
      if (menu.hidden) return;
      const bounds = trigger.getBoundingClientRect();
      const wrapperBounds = wrapper.getBoundingClientRect();
      const inset = 16;
      const gap = 10;
      menu.style.left = '';
      menu.style.right = '';
      const naturalLeft = wrapperBounds.left + menu.offsetLeft;
      const left = Math.max(inset, Math.min(naturalLeft, window.innerWidth - menu.offsetWidth - inset));
      menu.style.left = (left - wrapperBounds.left) + 'px';
      menu.style.right = 'auto';
      const below = window.innerHeight - bounds.bottom - gap - inset;
      const above = bounds.top - gap - inset;
      const upward = below < menu.scrollHeight && above > below;
      menu.style.top = upward ? 'auto' : 'calc(100% + 10px)';
      menu.style.bottom = upward ? 'calc(100% + 10px)' : 'auto';
      menu.style.maxHeight = Math.max(44, upward ? above : below) + 'px';
      menu.style.transformOrigin = upward ? 'bottom center' : 'top center';
    };
    const open = (last = false) => {
      disclosures.forEach(disclosure => disclosure.close());
      menu.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      positionMenu();
      items[last ? items.length - 1 : 0].focus({ preventScroll: true });
    };
    disclosures.push({ wrapper, close });
    window.addEventListener('resize', positionMenu, { passive: true });
    window.addEventListener('scroll', positionMenu, { passive: true });
    trigger.addEventListener('click', () => {
      void playContactSound();
      if (menu.hidden) open(); else close(true);
    });
    trigger.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        open(event.key === 'ArrowUp');
      } else if (event.key === 'Escape') close(true);
    });
    menu.addEventListener('keydown', event => {
      const current = items.indexOf(document.activeElement);
      let next;
      if (event.key === 'ArrowDown') next = (current + 1) % items.length;
      if (event.key === 'ArrowUp') next = (current - 1 + items.length) % items.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = items.length - 1;
      if (next !== undefined) { event.preventDefault(); items[next].focus(); }
      else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
      else if (event.key === 'Tab') { close(true); /* Native Tab continues from the trigger, with no focus trap. */ }
      else if (event.key === ' ' && document.activeElement.tagName === 'A') { event.preventDefault(); document.activeElement.click(); }
      else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const match = items.find(item => item.textContent.trim().toLocaleLowerCase().startsWith(event.key.toLocaleLowerCase()));
        if (match) { event.preventDefault(); match.focus(); }
      }
    });
    menu.addEventListener('click', event => {
      if (event.target.closest('a')) close(true);
    });
    soundButton.addEventListener('click', toggleSound);
    wrapper.addEventListener('focusout', event => {
      if (!wrapper.contains(event.relatedTarget)) close();
    });
  });
}
document.addEventListener('pointerdown', event => {
  disclosures.forEach(({ wrapper, close }) => { if (!wrapper.contains(event.target)) close(); });
});
const soundToggle = document.createElement('button');
soundToggle.className = 'sound-toggle';
soundToggle.type = 'button';
soundToggle.innerHTML = icons.sound + '<span data-sound-label></span>';
soundToggle.addEventListener('click', toggleSound);
soundControls.push(soundToggle);
document.querySelector('.footer > a')?.before(soundToggle);
updateSoundControls();
