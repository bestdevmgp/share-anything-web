import JSZip from 'jszip';

export async function renderHwpxToHtml(data: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(data);
  const parser = new DOMParser();

  const sectionPaths: string[] = [];
  zip.forEach((path) => {
    if (/^Contents\/section\d+\.xml$/i.test(path)) {
      sectionPaths.push(path);
    }
  });
  sectionPaths.sort((a, b) => {
    const na = Number(a.match(/section(\d+)/i)?.[1] ?? 0);
    const nb = Number(b.match(/section(\d+)/i)?.[1] ?? 0);
    return na - nb;
  });

  if (sectionPaths.length === 0) return '';

  const images = new Map<string, string>();
  const binEntries = Object.keys(zip.files).filter(p => /^BinData\//i.test(p));
  for (const binPath of binEntries) {
    const file = zip.file(binPath);
    if (!file) continue;
    const buf = await file.async('uint8array');
    if (buf.length === 0) continue;
    let mime = 'image/png';
    if (buf[0] === 0xFF && buf[1] === 0xD8) mime = 'image/jpeg';
    else if (buf[0] === 0x47 && buf[1] === 0x49) mime = 'image/gif';
    const b64 = uint8ToBase64(buf);
    const name = binPath.split('/').pop() || binPath;
    images.set(name, `data:${mime};base64,${b64}`);
  }

  const pieces: string[] = [];

  for (const path of sectionPaths) {
    const file = zip.file(path);
    if (!file) continue;
    const xmlText = await file.async('text');
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const root = doc.documentElement;
    pieces.push(renderNode(root, images));
  }

  if (pieces.every(p => !p.trim())) return '';

  return pieces.join('');
}

function renderNode(node: Element, images: Map<string, string>): string {
  const tag = localName(node);

  if (tag === 'p') {
    return renderParagraph(node, images);
  }

  if (tag === 'tbl') {
    return renderTable(node, images);
  }

  if (tag === 'picture' || tag === 'img') {
    return renderImage(node, images);
  }

  const children: string[] = [];
  for (let i = 0; i < node.children.length; i++) {
    children.push(renderNode(node.children[i], images));
  }
  return children.join('');
}

function renderParagraph(p: Element, images: Map<string, string>): string {
  const style: string[] = ['margin:0 0 2px 0', 'line-height:1.7'];

  const paraPr = findChild(p, 'paraPr');
  if (paraPr) {
    const align = paraPr.getAttribute('align');
    if (align) {
      const alignMap: Record<string, string> = {
        LEFT: 'left', CENTER: 'center', RIGHT: 'right', JUSTIFY: 'justify',
        left: 'left', center: 'center', right: 'right', justify: 'justify',
      };
      if (alignMap[align]) style.push(`text-align:${alignMap[align]}`);
    }
  }

  const spans: string[] = [];
  for (let i = 0; i < p.children.length; i++) {
    const child = p.children[i];
    const cTag = localName(child);

    if (cTag === 'run') {
      spans.push(renderRun(child, images));
    } else if (cTag === 'tbl') {
      spans.push(renderTable(child, images));
    } else if (cTag === 'picture' || cTag === 'img') {
      spans.push(renderImage(child, images));
    } else if (cTag === 'lineseg' || cTag === 'paraPr') {
      // skip
    } else {
      for (let j = 0; j < child.children.length; j++) {
        const sub = child.children[j];
        if (localName(sub) === 'run') spans.push(renderRun(sub, images));
        else if (localName(sub) === 'tbl') spans.push(renderTable(sub, images));
      }
    }
  }

  const content = spans.join('');
  if (!content.trim()) return `<p style="${style.join(';')}">&nbsp;</p>`;
  return `<p style="${style.join(';')}">${content}</p>`;
}

function renderRun(run: Element, images: Map<string, string>): string {
  const style: string[] = [];

  const charPr = findChild(run, 'charPr');
  if (charPr) {
    const sz = charPr.getAttribute('sz');
    if (sz) {
      const pt = Number(sz) / 100;
      if (pt > 0) style.push(`font-size:${pt}pt`);
    }
    const bold = charPr.getAttribute('bold');
    if (bold === 'true' || bold === '1') style.push('font-weight:bold');
    const italic = charPr.getAttribute('italic');
    if (italic === 'true' || italic === '1') style.push('font-style:italic');
    const underline = charPr.getAttribute('underline');
    if (underline && underline !== 'NONE' && underline !== 'none' && underline !== '0') {
      style.push('text-decoration:underline');
    }
    const color = charPr.getAttribute('color');
    if (color && color !== '0' && color !== '#000000') {
      style.push(`color:${color.startsWith('#') ? color : '#' + color}`);
    }
  }

  const texts: string[] = [];
  collectTexts(run, texts, images);

  if (texts.length === 0) return '';

  const content = texts.join('');
  if (style.length > 0) {
    return `<span style="${style.join(';')}">${content}</span>`;
  }
  return content;
}

function collectTexts(el: Element, texts: string[], images: Map<string, string>): void {
  for (let i = 0; i < el.childNodes.length; i++) {
    const child = el.childNodes[i];
    if (child.nodeType === 3) {
      const t = child.textContent || '';
      if (t) texts.push(escapeHtml(t));
    } else if (child.nodeType === 1) {
      const elem = child as Element;
      const tag = localName(elem);
      if (tag === 't') {
        texts.push(escapeHtml(elem.textContent || ''));
      } else if (tag === 'tab') {
        texts.push('&emsp;');
      } else if (tag === 'lineBreak') {
        texts.push('<br>');
      } else if (tag === 'picture' || tag === 'img') {
        texts.push(renderImage(elem, images));
      } else {
        collectTexts(elem, texts, images);
      }
    }
  }
}

function renderTable(tbl: Element, images: Map<string, string>): string {
  const rows: string[] = [];
  for (let i = 0; i < tbl.children.length; i++) {
    const child = tbl.children[i];
    if (localName(child) === 'tr') {
      const cells: string[] = [];
      for (let j = 0; j < child.children.length; j++) {
        const tc = child.children[j];
        if (localName(tc) === 'tc') {
          const colspan = tc.getAttribute('colSpan') || tc.getAttribute('colspan');
          const rowspan = tc.getAttribute('rowSpan') || tc.getAttribute('rowspan');
          let attrs = '';
          if (colspan && colspan !== '1') attrs += ` colspan="${colspan}"`;
          if (rowspan && rowspan !== '1') attrs += ` rowspan="${rowspan}"`;

          const cellContent: string[] = [];
          for (let k = 0; k < tc.children.length; k++) {
            cellContent.push(renderNode(tc.children[k], images));
          }
          cells.push(`<td${attrs} style="border:1px solid #ccc;padding:4px 8px">${cellContent.join('')}</td>`);
        }
      }
      if (cells.length > 0) rows.push(`<tr>${cells.join('')}</tr>`);
    }
  }
  if (rows.length === 0) return '';
  return `<table style="border-collapse:collapse;width:100%;margin:8px 0">${rows.join('')}</table>`;
}

function renderImage(el: Element, images: Map<string, string>): string {
  const binRef = findAttrRecursive(el, 'binaryItemIDRef') || findAttrRecursive(el, 'binItemIDRef');
  if (!binRef) return '';

  let result = '';
  images.forEach((dataUrl, name) => {
    if (!result && (name.startsWith(binRef) || name.includes(binRef))) {
      result = `<img src="${dataUrl}" style="max-width:100%;height:auto" alt="">`;
    }
  });
  if (result) return result;
  return '';
}

function findAttrRecursive(el: Element, attrName: string): string | null {
  const val = el.getAttribute(attrName);
  if (val) return val;
  for (let i = 0; i < el.children.length; i++) {
    const found = findAttrRecursive(el.children[i], attrName);
    if (found) return found;
  }
  return null;
}

function findChild(el: Element, name: string): Element | null {
  for (let i = 0; i < el.children.length; i++) {
    if (localName(el.children[i]) === name) return el.children[i];
  }
  return null;
}

function localName(el: Element): string {
  return (el.localName || el.nodeName || '').replace(/^.*:/, '');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function uint8ToBase64(buf: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buf.length; i++) {
    binary += String.fromCharCode(buf[i]);
  }
  return btoa(binary);
}
