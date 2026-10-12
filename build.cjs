'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const output = path.join(root, 'cloudflare-site');
const files = [
  'index.html', 'style.css', 'game.js', 'physics.js',
  ...Array.from({ length: 11 }, (_, index) => {
    const number = index + 1;
    return '新建文件夹/' + number + ([9, 10].includes(number) ? '.png' : '.jpg');
  }),
];
for (const file of files) {
  if (!fs.statSync(path.join(root, file)).isFile()) throw new Error('Missing game asset: ' + file);
}
fs.mkdirSync(output, { recursive: true });
for (const file of files) {
  const target = path.join(output, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(root, file), target);
}
function listFiles(directory, prefix = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const relative = prefix + entry.name;
    return entry.isDirectory() ? listFiles(path.join(directory, entry.name), relative + '/') : [relative];
  });
}
const actual = listFiles(output).sort();
if (JSON.stringify(actual) !== JSON.stringify([...files].sort())) {
  throw new Error('Unexpected files in cloudflare-site; inspect the folder before uploading.');
}
const bytes = files.reduce((total, file) => total + fs.statSync(path.join(output, file)).size, 0);
process.stdout.write('Cloudflare upload prepared: ' + files.length + ' files, ' + (bytes / 1024 / 1024).toFixed(2) + ' MiB\n');
