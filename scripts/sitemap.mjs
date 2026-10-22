import { writeFile } from 'node:fs/promises';
import { BOOKS } from '../src/data/books.ts';
import { FORMS } from '../src/data/formulas.ts';
import { LESSONS } from '../src/data/lessons.ts';
import { SITE_URL } from '../src/data/seo.ts';

const BASE = SITE_URL;

const staticPages = [
  ['/', 'weekly', '1.0'],
  ['/library', 'weekly', '0.9'],
  ['/map', 'monthly', '0.8'],
  ['/cosmos', 'monthly', '0.7'],
  ['/books', 'monthly', '0.8'],
  ['/practice', 'weekly', '0.9'],
  ['/think', 'monthly', '0.7'],
  ['/graph', 'monthly', '0.8'],
  ['/tools', 'monthly', '0.8'],
  ['/calculus', 'monthly', '0.8'],
  ['/simulations/gravity', 'monthly', '0.6'],
  ['/formulas', 'monthly', '0.8'],
  ['/ai', 'weekly', '0.9'],
  ['/privacy', 'yearly', '0.3'],
  ['/terms', 'yearly', '0.3'],
];

const encodeId = id => encodeURIComponent(id);
const entries = [
  ...staticPages.map(([path, changefreq, priority]) => ({ path, changefreq, priority })),
  ...LESSONS.map(lesson => ({ path: `/lesson/${encodeId(lesson.id)}`, changefreq: 'monthly', priority: '0.7' })),
  ...FORMS.map(formula => ({ path: `/formula/${encodeId(formula.id)}`, changefreq: 'monthly', priority: '0.6' })),
  ...BOOKS.map(book => ({ path: `/book/${encodeId(book.id)}`, changefreq: 'monthly', priority: '0.6' })),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(entry => `  <url><loc>${BASE}${entry.path}</loc><changefreq>${entry.changefreq}</changefreq><priority>${entry.priority}</priority></url>`).join('\n')}
</urlset>
`;

await writeFile('public/sitemap.xml', xml, 'utf8');
console.log(`sitemap: ${entries.length} URL`);
