export type SeoOptions = {
  title: string;
  description?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
};

// Prefer the published URL for canonical when the app is being viewed on preview/staging.
// This avoids duplicate content between preview and published.
const PUBLISHED_ORIGIN = "https://tornefy.com.br";

export const getCanonicalOrigin = () => {
  try {
    const origin = window.location.origin;
    // Lovable preview hosts typically include "id-preview--".
    if (origin.includes("id-preview--") && origin.endsWith(".lovable.app")) return PUBLISHED_ORIGIN;
    return origin;
  } catch {
    return PUBLISHED_ORIGIN;
  }
};

const upsertMeta = (nameOrProp: "name" | "property", key: string, content: string) => {
  if (!content) return;
  const selector = `meta[${nameOrProp}="${key}"]`;
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(nameOrProp, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const upsertLink = (rel: string, href: string) => {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
};

const upsertJsonLd = (id: string, json: unknown) => {
  const selector = `script[type="application/ld+json"][data-seo-id="${id}"]`;
  let el = document.head.querySelector(selector) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.dataset.seoId = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(json);
};

export const setSeo = (opts: SeoOptions) => {
  document.title = opts.title;

  if (opts.description) {
    upsertMeta("name", "description", opts.description);
  }

  if (opts.canonical) {
    upsertLink("canonical", opts.canonical);
  }

  // OG/Twitter
  upsertMeta("property", "og:title", opts.ogTitle || opts.title);
  if (opts.ogDescription || opts.description) {
    upsertMeta("property", "og:description", opts.ogDescription || opts.description || "");
  }
  upsertMeta("name", "twitter:title", opts.ogTitle || opts.title);
  if (opts.ogDescription || opts.description) {
    upsertMeta("name", "twitter:description", opts.ogDescription || opts.description || "");
  }
};

export const setJsonLd = (id: string, json: unknown) => {
  upsertJsonLd(id, json);
};
