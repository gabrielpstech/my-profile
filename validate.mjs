import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const dist = new URL('./', import.meta.url);
for (const [file, language] of [['index.html', 'en'], ['pt-br.html', 'pt-BR']]) {
  const html = fs.readFileSync(new URL(file, dist), 'utf8');
  assert(html.includes('<html lang="' + language + '">'));
  assert.equal((html.match(/<h1>/g) || []).length, 1, file + ': one primary heading');
  const allIds = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  const ids = new Set(allIds);
  assert.equal(ids.size, allIds.length, file + ': unique IDs');
  for (const [, value] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (value.startsWith('#')) assert(ids.has(value.slice(1)), 'Missing anchor: ' + value);
    else if (!value.includes(':')) assert(fs.existsSync(new URL(value, dist)), 'Missing asset: ' + value);
  }
  for (const [, id] of html.matchAll(/aria-labelledby="([^"]+)"/g)) {
    for (const ref of id.split(' ')) assert(ids.has(ref), 'Missing accessible label: ' + ref);
  }
  for (const [, src] of html.matchAll(/<script[^>]+src="([^"]+)"/g)) {
    new vm.Script(fs.readFileSync(new URL(src, dist), 'utf8'), { filename: src });
  }
  console.log(file + ': language, headings, unique IDs, anchors, assets, labels and JavaScript syntax passed.');
}

function luminance(hex) {
  const rgb = hex.match(/../g).map(value => parseInt(value, 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
for (const [name, foreground, background] of [
  ['Body', '202020', 'fafaf9'], ['Secondary', '62625f', 'fafaf9'],
  ['Hero secondary', '70706b', 'fafaf9'], ['Primary button', 'ffffff', '202020'],
  ['Contact secondary', 'b9b9b1', '202020'], ['Tags', '555550', 'f0f0ed'],
]) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => a - b);
  const ratio = (values[1] + .05) / (values[0] + .05);
  assert(ratio >= 4.5, name + ': insufficient contrast');
  console.log(name + ': ' + ratio.toFixed(2) + ':1 contrast passed.');
}
