import { useEffect } from 'react';
import { SITE_NAME, SITE_URL } from '../../data/seo';

interface PageMetaProps {
  title: string;
  description: string;
  path?: string;
  robots?: 'index,follow' | 'noindex,follow' | 'noindex,nofollow';
  type?: 'website' | 'article';
  jsonLd?: Record<string, unknown> | null;
}

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function normalizePath(path: string) {
  const clean = path.split(/[?#]/, 1)[0] || '/';
  const withLeadingSlash = clean.startsWith('/') ? clean : `/${clean}`;
  return withLeadingSlash.length > 1 && withLeadingSlash.endsWith('/')
    ? withLeadingSlash.slice(0, -1)
    : withLeadingSlash;
}

export function PageMeta({
  title,
  description,
  path,
  robots = 'index,follow',
  type = 'website',
  jsonLd = null,
}: PageMetaProps) {
  const canonicalPath = normalizePath(path || window.location.pathname);
  const canonicalUrl = `${SITE_URL}${canonicalPath}`;
  const jsonLdKey = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    document.title = title;
    setMeta('name', 'description', description);
    setMeta('name', 'robots', robots);
    setMeta('property', 'og:type', type);
    setMeta('property', 'og:site_name', SITE_NAME);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', canonicalUrl);
    setMeta('property', 'og:image', `${SITE_URL}/icon-512.png`);
    setMeta('name', 'twitter:card', 'summary');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', `${SITE_URL}/icon-512.png`);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    const previous = document.getElementById('mathnexus-page-jsonld');
    previous?.remove();
    if (jsonLdKey) {
      const script = document.createElement('script');
      script.id = 'mathnexus-page-jsonld';
      script.type = 'application/ld+json';
      script.textContent = jsonLdKey.replace(/</g, '\\u003c');
      document.head.appendChild(script);
    }
  }, [canonicalUrl, description, jsonLdKey, robots, title, type]);

  return null;
}
