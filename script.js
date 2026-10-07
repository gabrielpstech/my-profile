'use strict';

const isPortuguese = document.documentElement.lang.toLowerCase() === 'pt-br';
const messages = isPortuguese
  ? { copied: 'E-mail copiado para a área de transferência.', fallback: 'Selecione o endereço acima para copiá-lo ou clique nele para enviar um e-mail.' }
  : { copied: 'Email copied to clipboard.', fallback: 'Select the email address above to copy it, or click it to send an email.' };
const copyButton = document.getElementById('copy-email');
const copyStatus = document.getElementById('copy-status');

copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText('gabrielpstech@gmail.com');
    copyStatus.textContent = messages.copied;
  } catch {
    copyStatus.textContent = messages.fallback;
  }
});

// Keep the current section when changing languages. The root remains English.
const languageLink = document.querySelector('.language-link');
languageLink.addEventListener('click', () => {
  languageLink.hash = window.location.hash;
});
