import { useEffect } from 'react';

/**
 * Hook per impostare dinamicamente i meta tag SEO / OpenGraph / Twitter.
 * Chiama più volte in base alle dipendenze: l'ultima chiamata prevale.
 */
export interface PageMetaOptions {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string; // es: 'article' o 'website'
}

export const usePageMeta = (opts: PageMetaOptions) => {
  useEffect(() => {
    const {
      title,
      description,
      image,
      url,
      type = 'website'
    } = opts;

    const setMeta = (attr: 'name' | 'property', key: string, value?: string) => {
      if (!value) return;
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}='${key}']`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
      el.setAttribute('content', value);
    };

    if (title) document.title = title;
    if (description) setMeta('name','description', description);

    // Open Graph
    if (title) setMeta('property','og:title', title);
    if (description) setMeta('property','og:description', description);
    if (url) setMeta('property','og:url', url);
    if (image) setMeta('property','og:image', image);
    setMeta('property','og:type', type);

    // Twitter
    if (title) setMeta('name','twitter:title', title);
    if (description) setMeta('name','twitter:description', description);
    setMeta('name','twitter:card', image ? 'summary_large_image' : 'summary');
    if (image) setMeta('name','twitter:image', image);

  }, [opts.title, opts.description, opts.image, opts.url, opts.type]);
};

