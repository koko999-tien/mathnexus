import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { BOOKS } from '../src/data/books.ts';
import { FORMS } from '../src/data/formulas.ts';
import { LESSONS } from '../src/data/lessons.ts';
import { lessonDescription } from '../src/data/lessonContent.ts';
import { SITE_URL, STATIC_PAGE_SEO } from '../src/data/seo.ts';

const root = 'dist';
const shell = await readFile(join(root, 'index.html'), 'utf8');
const routes = [];

for (const [path, seo] of Object.entries(STATIC_PAGE_SEO)) {
  routes.push({ path, ...seo, type: 'website' });
}

for (const lesson of LESSONS) {
  routes.push({
    path: `/lesson/${encodeURIComponent(lesson.id)}`,
    title: `${lesson.t} · MathNexus`,
    description: lessonDescription(lesson),
    type: 'article',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'LearningResource',
      name: lesson.t,
      description: lessonDescription(lesson),
      educationalLevel: lesson.lv,
      learningResourceType: 'Article',
      inLanguage: 'vi',
      url: `${SITE_URL}/lesson/${encodeURIComponent(lesson.id)}`,
      isPartOf: { '@type': 'WebSite', name: 'MathNexus', url: `${SITE_URL}/` },
    },
  });
}

for (const formula of FORMS) {
  routes.push({
    path: `/formula/${encodeURIComponent(formula.id)}`,
    title: `${formula.name} · MathNexus`,
    description: `${formula.what} ${formula.why}`.slice(0, 158),
    type: 'article',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: formula.name,
      description: `${formula.what} ${formula.why}`.slice(0, 158),
      inLanguage: 'vi',
      url: `${SITE_URL}/formula/${encodeURIComponent(formula.id)}`,
    },
  });
}

for (const book of BOOKS) {
  routes.push({
    path: `/book/${encodeURIComponent(book.id)}`,
    title: `${book.t} · MathNexus`,
    description: `${book.why} ${book.ideas}`.slice(0, 158),
    type: 'article',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Book',
      name: book.t,
      description: `${book.why} ${book.ideas}`.slice(0, 158),
      inLanguage: 'vi',
      url: `${SITE_URL}/book/${encodeURIComponent(book.id)}`,
    },
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function replaceMeta(html, pattern, replacement) {
  if (!pattern.test(html)) throw new Error(`Missing head tag: ${pattern}`);
  return html.replace(pattern, replacement);
}

function renderHead(html, route) {
  const canonical = `${SITE_URL}${route.path}`;
  const robots = route.robots || 'index,follow';
  const title = escapeHtml(route.title);
  const description = escapeHtml(route.description);
  let output = html;

  output = replaceMeta(output, /<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
  output = replaceMeta(output, /<meta name="description"[^>]*>/, `<meta name="description" content="${description}" />`);
  output = replaceMeta(output, /<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${canonical}" />`);
  output = replaceMeta(output, /<meta property="og:type"[^>]*>/, `<meta property="og:type" content="${route.type || 'website'}" />`);
  output = replaceMeta(output, /<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${title}" />`);
  output = replaceMeta(output, /<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${description}" />`);
  output = replaceMeta(output, /<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${SITE_URL}/icon-512.png" />`);
  output = replaceMeta(output, /<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${title}" />`);
  output = replaceMeta(output, /<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${description}" />`);
  output = replaceMeta(output, /<meta name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${SITE_URL}/icon-512.png" />`);
  output = replaceMeta(output, /<meta name="robots"[^>]*>/, `<meta name="robots" content="${robots}" />`);
  output = replaceMeta(output, /<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${canonical}" />`);
  if (route.jsonLd) {
    const json = JSON.stringify(route.jsonLd).replaceAll('<', '\\u003c');
    output = output.replace('</head>', `  <script id="mathnexus-page-jsonld" type="application/ld+json">${json}</script>\n</head>`);
  }
  return output;
}

for (const route of routes) {
  const output = renderHead(shell, route);
  const target = route.path === '/'
    ? join(root, 'index.html')
    : join(root, `${route.path.slice(1)}.html`);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, output, 'utf8');
}

const notFound = renderHead(shell, {
  path: '/',
  title: 'Không tìm thấy trang · MathNexus',
  description: 'Trang này không tồn tại hoặc đã được di chuyển.',
  robots: 'noindex,follow',
  type: 'website',
}).replace(/\s*<link rel="canonical"[^>]*>/, '');
await writeFile(join(root, '404.html'), notFound, 'utf8');

console.log(`prerender: ${routes.length} route + 404`);
