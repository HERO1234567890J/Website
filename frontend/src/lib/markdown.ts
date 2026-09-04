/**
 * Tiny markdown renderer for legal-copy content (§27).
 *
 * Legal copy needs: H1–H3, paragraphs, **bold**, *italic*, blank
 * lines as paragraph breaks. Anything fancier (lists, links,
 * code blocks) lands with the admin editor (Phase 15).
 *
 *   parseMarkdown()  →  AST of nodes (no JSX)
 *   renderMarkdown() →  React elements
 *
 * Both live in plain .ts / .tsx files; the React renderer is in
 * markdown.tsx.
 */

export type MdInline =
  | { kind: 'text'; value: string }
  | { kind: 'bold'; inlines: MdInline[] }
  | { kind: 'italic'; inlines: MdInline[] };

export type MdNode =
  | { kind: 'h'; level: 1 | 2 | 3; text: string }
  | { kind: 'p'; inlines: MdInline[] };

function parseInlines(src: string): MdInline[] {
  const out: MdInline[] = [];
  let i = 0;
  let buf = '';
  const flush = (): void => {
    if (buf) {
      out.push({ kind: 'text', value: buf });
      buf = '';
    }
  };
  while (i < src.length) {
    if (src[i] === '*' && src[i + 1] === '*') {
      const end = src.indexOf('**', i + 2);
      if (end > i + 2) {
        flush();
        out.push({ kind: 'bold', inlines: parseInlines(src.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    }
    if (src[i] === '*' || src[i] === '_') {
      const ch = src[i];
      const end = src.indexOf(ch, i + 1);
      if (end > i + 1) {
        flush();
        out.push({ kind: 'italic', inlines: parseInlines(src.slice(i + 1, end)) });
        i = end + 1;
        continue;
      }
    }
    buf += src[i];
    i++;
  }
  flush();
  return out;
}

export function parseMarkdown(src: string): MdNode[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const nodes: MdNode[] = [];
  let buf: string[] = [];
  const flushParagraph = (): void => {
    if (buf.length === 0) return;
    const text = buf.join(' ').trim();
    if (text) nodes.push({ kind: 'p', inlines: parseInlines(text) });
    buf = [];
  };
  for (const line of lines) {
    if (line.startsWith('### ')) {
      flushParagraph();
      nodes.push({ kind: 'h', level: 3, text: line.slice(4).trim() });
    } else if (line.startsWith('## ')) {
      flushParagraph();
      nodes.push({ kind: 'h', level: 2, text: line.slice(3).trim() });
    } else if (line.startsWith('# ')) {
      flushParagraph();
      nodes.push({ kind: 'h', level: 1, text: line.slice(2).trim() });
    } else if (line.trim() === '') {
      flushParagraph();
    } else {
      buf.push(line);
    }
  }
  flushParagraph();
  return nodes;
}