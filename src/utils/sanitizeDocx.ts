const SAFE_HREF = /^(https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i;
const DANGEROUS_SRC = /^\s*(javascript:|vbscript:|data:text\/html)/i;

export function sanitizeRenderedDocx(el: HTMLElement | null): void {
  if (!el) return;
  el.querySelectorAll('script, iframe, object, embed, base, meta, form').forEach((n) => n.remove());
  el.querySelectorAll('*').forEach((node) => {
    Array.from(node.attributes).forEach((attr) => {
      if (attr.name.toLowerCase().startsWith('on')) node.removeAttribute(attr.name);
    });
    for (const attrName of ['href', 'xlink:href']) {
      const v = node.getAttribute(attrName);
      if (v !== null && !SAFE_HREF.test(v.trim())) node.removeAttribute(attrName);
    }
    const src = node.getAttribute('src');
    if (src !== null && DANGEROUS_SRC.test(src)) node.removeAttribute('src');
  });
}
