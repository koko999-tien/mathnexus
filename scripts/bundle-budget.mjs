import { readdirSync, readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { gzipSync } from 'node:zlib';

const KiB = 1024;
const assetsDir = new URL('../dist/assets/', import.meta.url);
const files = readdirSync(assetsDir).filter(name => /\.(js|css)$/.test(name));

const rows = files.map(name => {
  const content = readFileSync(new URL(name, assetsDir));
  return {
    name,
    raw: content.length,
    gzip: gzipSync(content, { level: 9 }).length,
  };
});

const js = rows.filter(row => row.name.endsWith('.js'));
const css = rows.filter(row => row.name.endsWith('.css'));
const entry = js.find(row => /^index-[^.]+\.js$/.test(row.name));
const largestJs = [...js].sort((a, b) => b.gzip - a.gzip)[0];
const largestCss = [...css].sort((a, b) => b.gzip - a.gzip)[0];
const totalJsGzip = js.reduce((sum, row) => sum + row.gzip, 0);

const budgets = {
  entryGzip: 150 * KiB,
  anyJsGzip: 300 * KiB,
  cssGzip: 45 * KiB,
  totalJsGzip: 800 * KiB,
};

const fmt = bytes => (bytes / KiB).toFixed(1) + ' KiB';
const failures = [];

if (!entry) failures.push('Không tìm thấy entry chunk index-*.js.');
if (entry && entry.gzip > budgets.entryGzip) failures.push(`Entry JS ${entry.name} = ${fmt(entry.gzip)} > ${fmt(budgets.entryGzip)}`);
if (largestJs && largestJs.gzip > budgets.anyJsGzip) failures.push(`JS chunk lớn nhất ${largestJs.name} = ${fmt(largestJs.gzip)} > ${fmt(budgets.anyJsGzip)}`);
if (largestCss && largestCss.gzip > budgets.cssGzip) failures.push(`CSS chunk lớn nhất ${largestCss.name} = ${fmt(largestCss.gzip)} > ${fmt(budgets.cssGzip)}`);
if (totalJsGzip > budgets.totalJsGzip) failures.push(`Tổng JS gzip = ${fmt(totalJsGzip)} > ${fmt(budgets.totalJsGzip)}`);

console.log('MathNexus bundle budget');
console.log('  entry:', entry ? `${basename(entry.name)} · ${fmt(entry.gzip)} gzip` : 'missing');
console.log('  largest JS:', largestJs ? `${basename(largestJs.name)} · ${fmt(largestJs.gzip)} gzip` : 'none');
console.log('  largest CSS:', largestCss ? `${basename(largestCss.name)} · ${fmt(largestCss.gzip)} gzip` : 'none');
console.log('  total JS:', fmt(totalJsGzip), 'gzip');

if (failures.length) {
  console.error('\nBundle budget failed:');
  failures.forEach(item => console.error(' -', item));
  process.exitCode = 1;
}
